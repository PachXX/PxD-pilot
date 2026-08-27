/**
 * WF2 scenario 3 — document finalize/cancel through the real REST boundary: lifecycle
 * transitions, WF1 data-completeness rules, immutability, versioning, replay and permissions.
 */
import { randomUUID } from 'node:crypto';

import {
  assertPashxAppInstalled,
  assertPashxWorkflowColumnsInstalled,
  cleanupPashxTestData,
  countReceipts,
  readAuditEvents,
  readCommercialDocumentState,
  seedCommercialDocument,
  seedProcurementCase,
} from 'test/integration/pashx-mab/utils/pashx-mab-test-context.util';
import {
  buildFinalizeDocumentRequest,
  postCancelDocument,
  postFinalizeDocument,
} from 'test/integration/pashx-mab/utils/post-workflow-command.util';

describe('WF2-3 document lifecycle commands', () => {
  const procurementCaseId = randomUUID();
  const supplierId = randomUUID();
  const finalizableQuoteId = randomUUID();
  const supplierBoundQuoteId = randomUUID();
  const totalBoundQuoteId = randomUUID();
  const cancelableRfqId = randomUUID();
  const idempotencyKeys: string[] = [];

  const track = (body: { idempotencyKey: string }) => {
    idempotencyKeys.push(body.idempotencyKey);

    return body;
  };

  beforeAll(async () => {
    await assertPashxAppInstalled();
    await assertPashxWorkflowColumnsInstalled();

    await seedProcurementCase({
      id: procurementCaseId,
      aggregateVersion: 0,
      stage: 'SOURCING',
    });
    for (const [id, overrides] of [
      [
        finalizableQuoteId,
        { supplierRecordId: supplierId, totalAmountMicros: '120000000000' },
      ],
      [cancelableRfqId, {}],
    ] as const) {
      await seedCommercialDocument({
        id,
        name: `MAB-DOC-${id.slice(0, 8)}`,
        documentType: id === cancelableRfqId ? 'CUSTOMER_RFQ' : 'VENDOR_QUOTE',
        lifecycleStatus: 'DRAFT',
        aggregateVersion: 1,
        procurementCaseRecordId: procurementCaseId,
        supplierRecordId: overrides.supplierRecordId,
        totalAmountMicros: overrides.totalAmountMicros,
      });
    }
    // A total-bound quotation seeded WITHOUT a supplier is inserted separately so the missing-
    // supplier rule can be probed; and a supplier-bound one without a total probes the other
    // rule. The finalizable record carries both.
    await seedCommercialDocument({
      id: supplierBoundQuoteId,
      name: `MAB-DOC-${supplierBoundQuoteId.slice(0, 8)}`,
      documentType: 'VENDOR_QUOTE',
      lifecycleStatus: 'DRAFT',
      aggregateVersion: 1,
      procurementCaseRecordId: procurementCaseId,
      supplierRecordId: undefined,
      totalAmountMicros: '120000000000',
    });
    await seedCommercialDocument({
      id: totalBoundQuoteId,
      name: `MAB-DOC-${totalBoundQuoteId.slice(0, 8)}`,
      documentType: 'VENDOR_QUOTE',
      lifecycleStatus: 'DRAFT',
      aggregateVersion: 1,
      procurementCaseRecordId: procurementCaseId,
      supplierRecordId: supplierId,
      totalAmountMicros: undefined,
    });
  });

  afterAll(async () => {
    await cleanupPashxTestData({
      procurementCaseIds: [procurementCaseId],
      commercialDocumentIds: [
        finalizableQuoteId,
        supplierBoundQuoteId,
        totalBoundQuoteId,
        cancelableRfqId,
      ],
      idempotencyKeys,
    });
  });

  it('finalizes a complete draft and writes receipt plus document audit', async () => {
    const body = track(
      buildFinalizeDocumentRequest(finalizableQuoteId, { expectedVersion: 1 }),
    );
    const response = await postFinalizeDocument({
      commercialDocumentRecordId: finalizableQuoteId,
      body,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      replayed: false,
      aggregateId: finalizableQuoteId,
      aggregateVersion: 2,
      result: {
        commercialDocumentRecordId: finalizableQuoteId,
        procurementCaseRecordId: procurementCaseId,
        documentType: 'vendorQuote',
        lifecycleStatus: 'finalized',
        aggregateVersion: 2,
      },
    });
    expect(await readCommercialDocumentState(finalizableQuoteId)).toMatchObject(
      {
        lifecycleStatus: 'FINALIZED',
        aggregateVersion: 2,
      },
    );
    const events = await readAuditEvents(finalizableQuoteId);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      command_name: 'document.finalize',
      aggregate_version: 2,
    });
  });

  it('replays the same finalize request without another write', async () => {
    const body = track(
      buildFinalizeDocumentRequest(finalizableQuoteId, {
        expectedVersion: 1,
        idempotencyKey: idempotencyKeys[0],
      }),
    );
    const response = await postFinalizeDocument({
      commercialDocumentRecordId: finalizableQuoteId,
      body,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ ok: true, replayed: true });
    expect(await readAuditEvents(finalizableQuoteId)).toHaveLength(1);
    expect(await countReceipts(body.idempotencyKey)).toBe(1);
  });

  it('rejects finalizing an already finalized document as immutable', async () => {
    const body = track(
      buildFinalizeDocumentRequest(finalizableQuoteId, { expectedVersion: 2 }),
    );
    const response = await postFinalizeDocument({
      commercialDocumentRecordId: finalizableQuoteId,
      body,
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_FINALIZED_DOCUMENT_IMMUTABLE',
    });
    expect(await countReceipts(body.idempotencyKey)).toBe(0);
  });

  it('rejects finalizing a supplier-bound document without a supplier', async () => {
    const body = track(
      buildFinalizeDocumentRequest(supplierBoundQuoteId, {
        expectedVersion: 1,
      }),
    );
    const response = await postFinalizeDocument({
      commercialDocumentRecordId: supplierBoundQuoteId,
      body,
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_DOCUMENT_EVIDENCE_MISSING',
    });
  });

  it('rejects finalizing a total-bound document without a total', async () => {
    const body = track(
      buildFinalizeDocumentRequest(totalBoundQuoteId, { expectedVersion: 1 }),
    );
    const response = await postFinalizeDocument({
      commercialDocumentRecordId: totalBoundQuoteId,
      body,
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_DOCUMENT_EVIDENCE_MISSING',
    });
  });

  it('rejects a stale document version with the current version attached', async () => {
    const body = track(
      buildFinalizeDocumentRequest(finalizableQuoteId, { expectedVersion: 1 }),
    );
    const response = await postFinalizeDocument({
      commercialDocumentRecordId: finalizableQuoteId,
      body,
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_STALE_VERSION',
      currentVersion: 2,
      retryable: true,
    });
  });

  it('cancels a draft and records document.cancel audit', async () => {
    const body = track(
      buildFinalizeDocumentRequest(cancelableRfqId, { expectedVersion: 1 }),
    );
    const response = await postCancelDocument({
      commercialDocumentRecordId: cancelableRfqId,
      body,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      result: {
        commercialDocumentRecordId: cancelableRfqId,
        lifecycleStatus: 'cancelled',
        aggregateVersion: 2,
      },
    });
    const events = await readAuditEvents(cancelableRfqId);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ command_name: 'document.cancel' });
  });

  it('rejects any lifecycle move on a cancelled document', async () => {
    const body = track(
      buildFinalizeDocumentRequest(cancelableRfqId, { expectedVersion: 2 }),
    );
    const response = await postFinalizeDocument({
      commercialDocumentRecordId: cancelableRfqId,
      body,
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_RECORD_CONFLICT',
    });
  });

  it('refuses an authenticated member without the document-edit capability', async () => {
    const body = track(
      buildFinalizeDocumentRequest(supplierBoundQuoteId, {
        expectedVersion: 1,
      }),
    );
    const response = await postFinalizeDocument({
      commercialDocumentRecordId: supplierBoundQuoteId,
      body,
      bearer: APPLE_PHIL_GUEST_ACCESS_TOKEN,
    });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_FORBIDDEN_CAPABILITY',
    });
    expect(await countReceipts(body.idempotencyKey)).toBe(0);
  });

  it('rejects a missing document with a typed not-found error', async () => {
    const missingId = randomUUID();
    const body = track(
      buildFinalizeDocumentRequest(missingId, { expectedVersion: 1 }),
    );
    const response = await postFinalizeDocument({
      commercialDocumentRecordId: missingId,
      body,
    });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_RECORD_NOT_FOUND',
    });
  });
});
