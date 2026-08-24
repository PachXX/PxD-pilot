/**
 * CL2 scenario 8 — an injected failure rolls back every write.
 *
 * The failure is injected without touching production code: the command allocates a document
 * number BEFORE inserting the commercial document, so re-using an already-taken
 * `commercialDocumentRecordId` fails at the insert with the counter already incremented inside the
 * open transaction. That makes it a genuine late-stage failure, which is exactly what a rollback
 * test needs — a failure at the first step would prove nothing.
 *
 * Production order (pashx-vendor-purchase-order.service.ts):
 *   1. advisory locks
 *   2. idempotency replay lookup
 *   3. load + version check
 *   4. allocate number          <- counter incremented here
 *   5. insert document          <- injected failure lands here
 *   6. receipt + audit
 *
 * STATUS CODE: CX1 repaired CL1 finding P2-1, so the duplicate-id path now maps SQLSTATE 23505 on
 * a duplicate to a typed 409 instead of a bare 500. This scenario's injected duplicate violates the
 * primary key on `id` (`sharedDocumentId` is reused verbatim across both requests), NOT the `name`
 * unique index — each request allocates its own fresh number at step 4, before the insert at step
 * 5, so the second request's number never collides with the first's. The correct typed outcome is
 * therefore PASHX_RECORD_CONFLICT, matching CX1's original id/name split and consistent with the
 * shared contract (`PASHX_RECORD_CONFLICT.retryable === false`; `PASHX_NUMBER_CONFLICT.retryable
 * === true`, see packages/pashx-mab-contract/src/errors.ts — the two codes are not interchangeable
 * on `retryable` alone). An earlier revision of this comment "corrected" this to
 * PASHX_NUMBER_CONFLICT and that correction was itself wrong; reverted 2026-08-13 after the CL5
 * rerun reproduced the real (id-conflict) response and cross-checked it against the contract. CX5
 * additionally handles the case where the ORM WRAPS the violation as
 * TwentyORMException/DUPLICATE_ENTRY_DETECTED, which is what actually produced the pre-CX1 500.
 * This suite asserts the typed contract directly — it is the observable behaviour CX1's handoff
 * asks CL2 to cover.
 */
import { randomUUID } from 'node:crypto';

import {
  buildVendorPurchaseOrderRequest,
  postVendorPurchaseOrder,
} from 'test/integration/pashx-mab/utils/create-vendor-purchase-order.util';
import {
  assertPashxAppInstalled,
  CURRENT_PERIOD,
  CURRENT_PERIOD_ISSUE_DATE,
  cleanupPashxTestData,
  countReceipts,
  readAuditEvents,
  readCounter,
  readProcurementCaseVersion,
  seedProcurementCase,
  seedSupplierCompany,
} from 'test/integration/pashx-mab/utils/pashx-mab-test-context.util';

describe('CL2-8 PashX Vendor PO — a mid-transaction failure rolls back every write', () => {
  const supplierId = randomUUID();
  const firstCaseId = randomUUID();
  const secondCaseId = randomUUID();
  const period = CURRENT_PERIOD;
  const sharedDocumentId = randomUUID();

  const idempotencyKeys: string[] = [];

  let counterAfterFirst: number;
  let failedResponse: Awaited<ReturnType<typeof postVendorPurchaseOrder>>;
  let failedIdempotencyKey: string;

  beforeAll(async () => {
    await assertPashxAppInstalled();
    await seedSupplierCompany(supplierId);
    await seedProcurementCase({ id: firstCaseId, aggregateVersion: 0 });
    await seedProcurementCase({ id: secondCaseId, aggregateVersion: 0 });

    // 1. A successful command that takes ownership of sharedDocumentId.
    const firstBody = buildVendorPurchaseOrderRequest({
      commercialDocumentRecordId: sharedDocumentId,
      procurementCaseRecordId: firstCaseId,
      supplierRecordId: supplierId,
      expectedVersion: 0,
      issueDate: CURRENT_PERIOD_ISSUE_DATE,
    });

    idempotencyKeys.push(firstBody.idempotencyKey);
    const firstResponse = await postVendorPurchaseOrder({ body: firstBody });

    expect(firstResponse.status).toBe(201);
    counterAfterFirst = (await readCounter('vendorPurchaseOrder', period)) ?? 0;

    // 2. A second command against a DIFFERENT case, with a DIFFERENT idempotency key, but reusing
    //    the same document id. Everything up to the insert succeeds; the insert then violates the
    //    primary key.
    const failingBody = buildVendorPurchaseOrderRequest({
      commercialDocumentRecordId: sharedDocumentId,
      procurementCaseRecordId: secondCaseId,
      supplierRecordId: supplierId,
      expectedVersion: 0,
      issueDate: CURRENT_PERIOD_ISSUE_DATE,
    });

    failedIdempotencyKey = failingBody.idempotencyKey;
    idempotencyKeys.push(failedIdempotencyKey);

    failedResponse = await postVendorPurchaseOrder({ body: failingBody });
  });

  afterAll(async () => {
    await cleanupPashxTestData({
      procurementCaseIds: [firstCaseId, secondCaseId],
      commercialDocumentIds: [sharedDocumentId],
      supplierIds: [supplierId],
      idempotencyKeys,
    });
  });

  it('fails with the typed record-conflict contract, not a bare 500', () => {
    // Pre-CX1 this returned PASHX_INTERNAL_ERROR/500, which told a caller to contact support for
    // a condition they could fix themselves. The typed 409 plus the offending field path is the
    // repair CL1 asked for.
    expect(failedResponse.status).toBe(409);
    expect(failedResponse.body).toMatchObject({
      ok: false,
      code: 'PASHX_RECORD_CONFLICT',
      retryable: false,
      fieldPaths: ['commercialDocumentRecordId'],
    });
    expect(failedResponse.body.correlationId).toEqual(expect.any(String));
  });

  it('does not leak PostgreSQL constraint detail to the caller', () => {
    // A 23505 handler that echoed the driver message would expose internal table, column, and
    // index names through a public endpoint.
    const serialized = JSON.stringify(failedResponse.body);

    expect(serialized).not.toContain('23505');
    expect(serialized).not.toMatch(/duplicate key|constraint|pkey/i);
  });

  it('rolls back the number counter, so no document number is burned', async () => {
    // The strongest signal in this suite. The counter was incremented inside the transaction
    // before the failure; if it survives, the transaction boundary is wrong and every failed
    // command silently consumes a number from an auditable financial sequence.
    expect(await readCounter('vendorPurchaseOrder', period)).toBe(
      counterAfterFirst,
    );
  });

  it('leaves the second aggregate at its original version', async () => {
    expect(await readProcurementCaseVersion(secondCaseId)).toBe(0);
  });

  it('writes no receipt for the failed command', async () => {
    // A receipt written despite failure would make the failure permanently un-retryable: the
    // replay path would return a result for work that never happened.
    expect(await countReceipts(failedIdempotencyKey)).toBe(0);
  });

  it('writes no audit event for the failed command', async () => {
    expect(await readAuditEvents(secondCaseId)).toHaveLength(0);
  });

  it('leaves the first command entirely intact', async () => {
    // Rollback must be scoped to the failing transaction. The earlier successful command shares
    // the same counter row and the same document id, so a too-wide rollback would show up here.
    expect(await readProcurementCaseVersion(firstCaseId)).toBe(1);
    expect(await readAuditEvents(firstCaseId)).toHaveLength(1);
    expect(await countReceipts(idempotencyKeys[0])).toBe(1);
  });

  it('accepts a corrected retry afterwards, proving nothing was left locked or poisoned', async () => {
    const retryBody = buildVendorPurchaseOrderRequest({
      procurementCaseRecordId: secondCaseId,
      supplierRecordId: supplierId,
      expectedVersion: 0,
      issueDate: CURRENT_PERIOD_ISSUE_DATE,
    });

    idempotencyKeys.push(retryBody.idempotencyKey);

    const retryResponse = await postVendorPurchaseOrder({ body: retryBody });

    expect(retryResponse.status).toBe(201);
    expect(await readProcurementCaseVersion(secondCaseId)).toBe(1);

    await cleanupPashxTestData({
      commercialDocumentIds: [retryBody.commercialDocumentRecordId],
    });
  });
});
