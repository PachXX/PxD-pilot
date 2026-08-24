/**
 * CL2 scenario 5 — a stale version is rejected, and the current version is returned.
 *
 * Two things must both hold: the stale write is refused, and the caller is told what the version
 * actually is so it can re-read and retry. A 409 with no `currentVersion` would satisfy "rejected"
 * while leaving the client unable to recover, so both halves are asserted.
 *
 * The refusal must also leave nothing behind — the number counter in particular, since the
 * production code allocates a number only AFTER the version check passes. A counter that advanced
 * on a rejected command would burn document numbers on every optimistic-concurrency conflict.
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
  readCommercialDocument,
  readCounter,
  readProcurementCaseVersion,
  seedProcurementCase,
  seedSupplierCompany,
} from 'test/integration/pashx-mab/utils/pashx-mab-test-context.util';

describe('CL2-5 PashX Vendor PO — stale version is rejected with the current version', () => {
  const procurementCaseId = randomUUID();
  const supplierId = randomUUID();
  const period = CURRENT_PERIOD;
  const idempotencyKeys: string[] = [];
  const documentIds: string[] = [];

  beforeAll(async () => {
    await assertPashxAppInstalled();
    await seedSupplierCompany(supplierId);
  });

  beforeEach(async () => {
    // Case starts at version 3 so the assertions distinguish "returned the real current version"
    // from "returned zero" or "returned expectedVersion + 1".
    await seedProcurementCase({ id: procurementCaseId, aggregateVersion: 3 });
  });

  afterAll(async () => {
    await cleanupPashxTestData({
      procurementCaseIds: [procurementCaseId],
      commercialDocumentIds: documentIds,
      supplierIds: [supplierId],
      idempotencyKeys,
    });
  });

  const attempt = async (expectedVersion: number) => {
    const body = buildVendorPurchaseOrderRequest({
      procurementCaseRecordId: procurementCaseId,
      supplierRecordId: supplierId,
      expectedVersion,
      issueDate: CURRENT_PERIOD_ISSUE_DATE,
    });

    idempotencyKeys.push(body.idempotencyKey);
    documentIds.push(body.commercialDocumentRecordId);

    const counterBefore =
      (await readCounter('vendorPurchaseOrder', period)) ?? 0;
    const response = await postVendorPurchaseOrder({ body });

    return { body, response, counterBefore };
  };

  it('rejects a version behind the aggregate and reports the current one', async () => {
    const { response } = await attempt(2);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_STALE_VERSION',
      retryable: true,
      currentVersion: 3,
    });
  });

  it('rejects a version ahead of the aggregate just as firmly', async () => {
    // Optimistic concurrency is an equality check, not a floor. A client that guesses a future
    // version must not be allowed to write.
    const { response } = await attempt(4);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      code: 'PASHX_STALE_VERSION',
      currentVersion: 3,
    });
  });

  it('leaves the aggregate version untouched after a rejection', async () => {
    await attempt(2);

    expect(await readProcurementCaseVersion(procurementCaseId)).toBe(3);
  });

  it('does not burn a document number on a rejected command', async () => {
    const { counterBefore } = await attempt(2);

    expect(await readCounter('vendorPurchaseOrder', period)).toBe(
      counterBefore,
    );
  });

  it('writes no document, receipt, or audit row for a rejected command', async () => {
    const { body } = await attempt(2);

    expect(
      await readCommercialDocument(body.commercialDocumentRecordId),
    ).toBeUndefined();
    expect(await countReceipts(body.idempotencyKey)).toBe(0);
    expect(await readAuditEvents(procurementCaseId)).toHaveLength(0);
  });

  it('accepts the command once the caller uses the real current version', async () => {
    // Proves the rejection was about staleness specifically, not some unrelated failure that
    // happens to surface as 409.
    const { body, response } = await attempt(3);

    expect(response.status).toBe(201);
    expect(response.body.aggregateVersion).toBe(4);
    expect(await readProcurementCaseVersion(procurementCaseId)).toBe(4);
    expect(
      await readCommercialDocument(body.commercialDocumentRecordId),
    ).toBeDefined();
  });
});
