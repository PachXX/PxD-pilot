/**
 * CL2 scenario 2 — a valid creation writes document, version, receipt, counter, and audit.
 *
 * This is the atomicity contract stated positively: one command, five durable effects, all in the
 * same transaction. Each is asserted against the database rather than against the response body,
 * because the response proves what the server *said* and the rows prove what it *did*.
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
  readAuditEvents,
  readCommercialDocument,
  readCounter,
  readProcurementCaseVersion,
  readReceipt,
  seedProcurementCase,
  seedSupplierCompany,
} from 'test/integration/pashx-mab/utils/pashx-mab-test-context.util';

describe('CL2-2 PashX Vendor PO — valid creation writes every record', () => {
  const procurementCaseId = randomUUID();
  const supplierId = randomUUID();
  const issueDate = CURRENT_PERIOD_ISSUE_DATE;
  const period = CURRENT_PERIOD;

  let body: ReturnType<typeof buildVendorPurchaseOrderRequest>;
  let counterBefore: number;
  let response: Awaited<ReturnType<typeof postVendorPurchaseOrder>>;

  beforeAll(async () => {
    await assertPashxAppInstalled();
    await seedProcurementCase({ id: procurementCaseId, aggregateVersion: 0 });
    await seedSupplierCompany(supplierId);

    // Captured as a delta rather than assumed to be zero — other suites share this workspace and
    // the counter is intentionally never reset between runs.
    counterBefore = (await readCounter('vendorPurchaseOrder', period)) ?? 0;

    body = buildVendorPurchaseOrderRequest({
      procurementCaseRecordId: procurementCaseId,
      supplierRecordId: supplierId,
      expectedVersion: 0,
      issueDate,
      vendorReference: 'CL2-REF-001',
    });

    response = await postVendorPurchaseOrder({ body });
  });

  afterAll(async () => {
    await cleanupPashxTestData({
      procurementCaseIds: [procurementCaseId],
      commercialDocumentIds: [body.commercialDocumentRecordId],
      supplierIds: [supplierId],
      idempotencyKeys: [body.idempotencyKey],
    });
  });

  it('returns a typed success envelope, not replayed', () => {
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      replayed: false,
      aggregateId: procurementCaseId,
      aggregateVersion: 1,
    });
    expect(response.body.correlationId).toEqual(expect.any(String));
  });

  it('writes the commercial document with the allocated number', async () => {
    const document = await readCommercialDocument(
      body.commercialDocumentRecordId,
    );

    expect(document).toBeDefined();
    expect(document).toMatchObject({
      id: body.commercialDocumentRecordId,
      // STORED values, which are the manifest spellings — not the contract spellings. Twenty's
      // metadata validator rejects camelCase select option values, so the manifest uses
      // VENDOR_PURCHASE_ORDER / DRAFT and the persistence layer translates on write (finding 27).
      // The API response still returns the contract forms `vendorPurchaseOrder` / `draft`; this
      // assertion reads the row, so it must expect the mapped values. Asserting the contract forms
      // here would silently pass only if the mapping were removed.
      documentType: 'VENDOR_PURCHASE_ORDER',
      lifecycleStatus: 'DRAFT',
    });
    // Format is provisional until Gate 0 freezes it; the period segment and zero padding are the
    // parts the numbering scope depends on, so those are what get asserted.
    expect(document?.name).toMatch(
      new RegExp(`^MAB-VPO-${CURRENT_PERIOD}-\\d{4,}$`),
    );
    expect(document?.name).toBe(response.body.result.documentNumber);
  });

  it('increments the aggregate version on the procurement case', async () => {
    expect(await readProcurementCaseVersion(procurementCaseId)).toBe(1);
  });

  it('advances the number counter for this document type and period by exactly one', async () => {
    expect(await readCounter('vendorPurchaseOrder', period)).toBe(
      counterBefore + 1,
    );
  });

  it('writes exactly one idempotency receipt carrying the authoritative result', async () => {
    const receipt = await readReceipt(body.idempotencyKey);

    expect(receipt).toBeDefined();
    expect(receipt?.aggregate_id).toBe(procurementCaseId);
    expect(receipt?.aggregate_version).toBe(1);
    expect(receipt?.request_hash).toEqual(expect.any(String));
    // The stored result is what a replay will return, so it must match what this call returned.
    expect(receipt?.result_json).toMatchObject(response.body.result);
  });

  it('writes an audit event bound to the same correlation id and actor', async () => {
    const events = await readAuditEvents(procurementCaseId);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      command_name: 'document.create',
      aggregate_id: procurementCaseId,
      aggregate_version: 1,
      correlation_id: response.body.correlationId,
    });
    // Actor comes from the auth context, never the request body — this is the assertion that
    // would fail if the server ever started trusting a client-supplied actor.
    expect(events[0].actor_id).toEqual(expect.any(String));
    expect(JSON.stringify(events[0].payload)).not.toContain('"actorId"');
  });
});
