/**
 * CL2 scenario 3 — an identical replay creates no duplicate writes.
 *
 * The graph's wording is "creates no duplicate writes", not "returns 200 twice". A cache that
 * returned the right body while quietly writing a second document, burning a second number, or
 * appending a second audit row would satisfy the response assertion and still be wrong. So every
 * durable effect is counted before and after the replay.
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

describe('CL2-3 PashX Vendor PO — identical replay is a no-op', () => {
  const procurementCaseId = randomUUID();
  const supplierId = randomUUID();
  const period = CURRENT_PERIOD;

  let body: ReturnType<typeof buildVendorPurchaseOrderRequest>;
  let firstResponse: Awaited<ReturnType<typeof postVendorPurchaseOrder>>;
  let secondResponse: Awaited<ReturnType<typeof postVendorPurchaseOrder>>;
  let counterAfterFirst: number;

  beforeAll(async () => {
    await assertPashxAppInstalled();
    await seedProcurementCase({ id: procurementCaseId, aggregateVersion: 0 });
    await seedSupplierCompany(supplierId);

    body = buildVendorPurchaseOrderRequest({
      procurementCaseRecordId: procurementCaseId,
      supplierRecordId: supplierId,
      expectedVersion: 0,
      issueDate: CURRENT_PERIOD_ISSUE_DATE,
    });

    firstResponse = await postVendorPurchaseOrder({ body });
    counterAfterFirst = (await readCounter('vendorPurchaseOrder', period)) ?? 0;

    // Byte-identical resend, including the same idempotency key and the same expectedVersion.
    // Note the aggregate is now at version 1, so if the replay short-circuit did NOT fire this
    // request would fail with staleVersion — which is itself a useful signal.
    secondResponse = await postVendorPurchaseOrder({ body });
  });

  afterAll(async () => {
    await cleanupPashxTestData({
      procurementCaseIds: [procurementCaseId],
      commercialDocumentIds: [body.commercialDocumentRecordId],
      supplierIds: [supplierId],
      idempotencyKeys: [body.idempotencyKey],
    });
  });

  it('succeeds both times', () => {
    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
  });

  it('flags the second call as a replay and the first as not', () => {
    expect(firstResponse.body.replayed).toBe(false);
    expect(secondResponse.body.replayed).toBe(true);
  });

  it('returns the stored authoritative result, identical to the first', () => {
    expect(secondResponse.body.result).toEqual(firstResponse.body.result);
    expect(secondResponse.body.aggregateVersion).toBe(
      firstResponse.body.aggregateVersion,
    );
  });

  it('issues a fresh correlation id for the replay', () => {
    // Each HTTP call is its own traceable event even when the business outcome is replayed;
    // reusing the original correlation id would make the two calls indistinguishable in logs.
    expect(secondResponse.body.correlationId).not.toBe(
      firstResponse.body.correlationId,
    );
  });

  it('does not allocate a second document number', async () => {
    expect(await readCounter('vendorPurchaseOrder', period)).toBe(
      counterAfterFirst,
    );
  });

  it('does not increment the aggregate version again', async () => {
    expect(await readProcurementCaseVersion(procurementCaseId)).toBe(1);
  });

  it('does not write a second receipt', async () => {
    expect(await countReceipts(body.idempotencyKey)).toBe(1);
  });

  it('does not write a second audit event', async () => {
    expect(await readAuditEvents(procurementCaseId)).toHaveLength(1);
  });
});
