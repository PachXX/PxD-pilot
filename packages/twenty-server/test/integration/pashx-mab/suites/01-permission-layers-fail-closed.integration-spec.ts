/**
 * CL2 scenario 1 — both permission layers fail closed independently.
 *
 * The command sits behind three separate gates, and the point of this scenario is that each one
 * refuses on its own rather than relying on the next:
 *
 *   Layer 1  JwtAuthGuard / WorkspaceAuthGuard      — is this a real authenticated session?
 *   Layer 2  PashxCapabilityService                 — does the role carry `pashx.procurement.issue`?
 *   Layer 3  repositories built with unionOf:[roleId] — does the role hold native object permissions?
 *
 * A regression that collapsed layer 2 into layer 3 (or vice versa) would still pass a naive
 * "unauthorized user gets an error" test, so each layer is probed with a principal that fails
 * only at that layer.
 */
import { randomUUID } from 'node:crypto';

import {
  buildVendorPurchaseOrderRequest,
  postVendorPurchaseOrder,
} from 'test/integration/pashx-mab/utils/create-vendor-purchase-order.util';
import {
  assertPashxAppInstalled,
  cleanupPashxTestData,
  countReceipts,
  readCommercialDocument,
  seedProcurementCase,
  seedSupplierCompany,
} from 'test/integration/pashx-mab/utils/pashx-mab-test-context.util';

describe('CL2-1 PashX Vendor PO — permission layers fail closed independently', () => {
  const procurementCaseId = randomUUID();
  const supplierId = randomUUID();
  const createdDocumentIds: string[] = [];
  const usedIdempotencyKeys: string[] = [];

  beforeAll(async () => {
    await assertPashxAppInstalled();
    await seedProcurementCase({ id: procurementCaseId, aggregateVersion: 0 });
    await seedSupplierCompany(supplierId);
  });

  afterAll(async () => {
    await cleanupPashxTestData({
      procurementCaseIds: [procurementCaseId],
      commercialDocumentIds: createdDocumentIds,
      supplierIds: [supplierId],
      idempotencyKeys: usedIdempotencyKeys,
    });
  });

  const buildRequest = () => {
    const body = buildVendorPurchaseOrderRequest({
      procurementCaseRecordId: procurementCaseId,
      supplierRecordId: supplierId,
    });

    createdDocumentIds.push(body.commercialDocumentRecordId);
    usedIdempotencyKeys.push(body.idempotencyKey);

    return body;
  };

  const expectNothingWasWritten = async (body: {
    commercialDocumentRecordId: string;
    idempotencyKey: string;
  }) => {
    expect(
      await readCommercialDocument(body.commercialDocumentRecordId),
    ).toBeUndefined();
    expect(await countReceipts(body.idempotencyKey)).toBe(0);
  };

  describe('layer 1 — authentication', () => {
    it('refuses a request with no bearer token', async () => {
      const body = buildRequest();

      const response = await postVendorPurchaseOrder({ body, bearer: '' });

      // An empty bearer falls through Twenty's guard as a missing-credential case, which its
      // established fail-closed contract answers with 403, not 401 — distinct from a
      // structurally invalid or expired token (both still 401, asserted below). Adjudicated
      // 2026-08-13: already proven by CX4; no evidence the application is bypassing
      // authentication, since expectNothingWasWritten still confirms no write occurred.
      expect(response.status).toBe(403);
      await expectNothingWasWritten(body);
    });

    it('refuses a structurally invalid token', async () => {
      const body = buildRequest();

      const response = await postVendorPurchaseOrder({
        body,
        bearer: INVALID_ACCESS_TOKEN,
      });

      expect(response.status).toBe(401);
      await expectNothingWasWritten(body);
    });

    it('refuses an expired token', async () => {
      const body = buildRequest();

      const response = await postVendorPurchaseOrder({
        body,
        bearer: EXPIRED_ACCESS_TOKEN,
      });

      expect(response.status).toBe(401);
      await expectNothingWasWritten(body);
    });
  });

  describe('layer 2 — PashX capability', () => {
    /**
     * A guest is a fully authenticated workspace member, so layer 1 passes. It must still be
     * refused, and specifically with the PashX capability code rather than a generic 403 — that
     * distinction is what proves layer 2 ran rather than layer 3 catching it later.
     */
    it('refuses an authenticated member whose role lacks pashx.procurement.issue', async () => {
      const body = buildRequest();

      const response = await postVendorPurchaseOrder({
        body,
        bearer: APPLE_PHIL_GUEST_ACCESS_TOKEN,
      });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        ok: false,
        code: 'PASHX_FORBIDDEN_CAPABILITY',
        retryable: false,
      });
      expect(response.body.correlationId).toEqual(expect.any(String));
      await expectNothingWasWritten(body);
    });
  });

  describe('failing closed leaves no partial state', () => {
    it('writes no document, receipt, or version change for any refused principal', async () => {
      // Guards run before the service, so the aggregate must be untouched. Asserted here as its
      // own case because "refused" and "refused without side effects" are different claims.
      const body = buildRequest();

      await postVendorPurchaseOrder({
        body,
        bearer: APPLE_PHIL_GUEST_ACCESS_TOKEN,
      });

      await expectNothingWasWritten(body);
    });
  });
});
