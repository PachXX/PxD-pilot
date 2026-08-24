/**
 * CL2 scenario 4 — reusing an idempotency key with a changed payload is rejected.
 *
 * This is the fail-safe half of idempotency. Scenario 3 proves an identical resend returns the
 * stored result; this one proves a *different* request wearing the same key is refused rather than
 * silently answered with the first request's result. Getting this wrong reports success for work
 * that never happened, on a financial command.
 *
 * CX1 repaired CL1 finding P2-2: the fingerprint input is now exhaustive over the request type by
 * construction (`satisfies Record<keyof PashxCreateVendorPurchaseOrderPayload, unknown>`), with
 * `idempotencyKey` itself deliberately excluded since it is the lookup key rather than part of the
 * hashed content. Every field is varied individually below, because an allowlist that missed one
 * field would still pass a test that only varied a different one.
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

describe('CL2-4 PashX Vendor PO — changed payload under a reused key is rejected', () => {
  const procurementCaseId = randomUUID();
  const otherProcurementCaseId = randomUUID();
  const supplierId = randomUUID();
  const otherSupplierId = randomUUID();

  const documentIds: string[] = [];
  const idempotencyKeys: string[] = [];

  let originalBody: ReturnType<typeof buildVendorPurchaseOrderRequest>;
  let counterAfterOriginal: number;

  beforeAll(async () => {
    await assertPashxAppInstalled();
    await seedProcurementCase({ id: procurementCaseId, aggregateVersion: 0 });
    await seedProcurementCase({
      id: otherProcurementCaseId,
      aggregateVersion: 0,
    });
    await seedSupplierCompany(supplierId);
    await seedSupplierCompany(otherSupplierId);

    originalBody = buildVendorPurchaseOrderRequest({
      procurementCaseRecordId: procurementCaseId,
      supplierRecordId: supplierId,
      expectedVersion: 0,
      issueDate: CURRENT_PERIOD_ISSUE_DATE,
      vendorReference: 'CL2-4-ORIGINAL',
    });

    documentIds.push(originalBody.commercialDocumentRecordId);
    idempotencyKeys.push(originalBody.idempotencyKey);

    const created = await postVendorPurchaseOrder({ body: originalBody });

    expect(created.status).toBe(201);
    counterAfterOriginal =
      (await readCounter('vendorPurchaseOrder', CURRENT_PERIOD)) ?? 0;
  });

  afterAll(async () => {
    await cleanupPashxTestData({
      procurementCaseIds: [procurementCaseId, otherProcurementCaseId],
      commercialDocumentIds: documentIds,
      supplierIds: [supplierId, otherSupplierId],
      idempotencyKeys,
    });
  });

  /**
   * Resends the original request with exactly one field changed, keeping the same idempotency key.
   */
  const resendWithChange = async (
    change: Partial<Record<string, unknown>>,
    payloadChange: Partial<Record<string, unknown>> = {},
  ) => {
    const body = {
      ...originalBody,
      ...change,
      payload: { ...originalBody.payload, ...payloadChange },
    };

    if (typeof change.commercialDocumentRecordId === 'string') {
      documentIds.push(change.commercialDocumentRecordId);
    }

    return postVendorPurchaseOrder({ body });
  };

  const expectRejected = (response: {
    status: number;
    body: Record<string, unknown>;
  }) => {
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_IDEMPOTENCY_KEY_REUSED',
      // Not retryable: resending the same key will never succeed. The caller must either use the
      // original payload or a new key, and a retryable flag here would invite a pointless loop.
      retryable: false,
    });
  };

  describe('each payload field is part of the fingerprint', () => {
    it('rejects a changed supplier', async () => {
      expectRejected(
        await resendWithChange({}, { supplierRecordId: otherSupplierId }),
      );
    });

    it('rejects a changed procurement case', async () => {
      expectRejected(
        await resendWithChange(
          {},
          { procurementCaseRecordId: otherProcurementCaseId },
        ),
      );
    });

    it('rejects a changed issue date', async () => {
      // Still inside the provisional issue-year window, so this is rejected for key reuse rather
      // than for the CX1 date bound — otherwise the test would pass for the wrong reason.
      expectRejected(
        await resendWithChange({}, { issueDate: `${CURRENT_PERIOD}-07-20` }),
      );
    });

    it('rejects a changed currency', async () => {
      expectRejected(await resendWithChange({}, { currency: 'USD' }));
    });

    it('rejects a changed vendor reference', async () => {
      // The optional field, and the one an allowlist is most likely to forget.
      expectRejected(
        await resendWithChange({}, { vendorReference: 'CL2-4-DIFFERENT' }),
      );
    });

    it('rejects a removed optional vendor reference', async () => {
      // Absence must hash differently from presence; the production fingerprint normalises
      // `undefined` to null precisely so this case cannot collide.
      const { vendorReference: _dropped, ...payloadWithout } =
        originalBody.payload;
      const body = { ...originalBody, payload: payloadWithout };

      expectRejected(await postVendorPurchaseOrder({ body }));
    });
  });

  describe('each top-level field is part of the fingerprint', () => {
    it('rejects a changed commercial document id', async () => {
      expectRejected(
        await resendWithChange({ commercialDocumentRecordId: randomUUID() }),
      );
    });

    it('rejects a changed expected version', async () => {
      expectRejected(await resendWithChange({ expectedVersion: 1 }));
    });
  });

  describe('a rejected reuse changes nothing', () => {
    it('does not allocate a number, bump the version, or write a receipt or audit row', async () => {
      const newDocumentId = randomUUID();

      documentIds.push(newDocumentId);

      await resendWithChange(
        { commercialDocumentRecordId: newDocumentId },
        { currency: 'EUR' },
      );

      expect(await readCounter('vendorPurchaseOrder', CURRENT_PERIOD)).toBe(
        counterAfterOriginal,
      );
      expect(await readProcurementCaseVersion(procurementCaseId)).toBe(1);
      expect(await readCommercialDocument(newDocumentId)).toBeUndefined();
      // Exactly the original receipt and audit row — the rejection added neither.
      expect(await countReceipts(originalBody.idempotencyKey)).toBe(1);
      expect(await readAuditEvents(procurementCaseId)).toHaveLength(1);
    });

    it('still returns the original result for a byte-identical resend afterwards', async () => {
      // Proves a rejected reuse does not poison the stored receipt.
      const replay = await postVendorPurchaseOrder({ body: originalBody });

      expect(replay.status).toBe(201);
      expect(replay.body.replayed).toBe(true);
      expect(replay.body.result.commercialDocumentRecordId).toBe(
        originalBody.commercialDocumentRecordId,
      );
    });
  });
});
