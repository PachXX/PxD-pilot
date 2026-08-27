/**
 * CL2 supplementary — the provisional issue-year bound (CX1 disposition of CL1 finding P2-3).
 *
 * Not one of the graph's nine scenarios; added because CX1's handoff explicitly asks CL2 to
 * "assert the new observable conflict behavior, the provisional issue-year rejection, and
 * current-version response through real Cloud SQL transactions". The other two are covered in
 * scenarios 8 and 5; this file covers the issue-year rejection.
 *
 * The rule is deliberately temporary: until Gate 0 freezes fiscal period and rollover, the issue
 * year must be within the current UTC year ±1. Two properties matter and are asserted separately:
 *
 *   - it rejects out-of-window input with a typed, field-scoped invalid-input error, and
 *   - it rejects BEFORE allocating a number, so a bad date cannot burn a document number.
 *
 * The second is the one worth having a test for. A bound enforced after allocation would still
 * return the right error while quietly consuming a sequence value on every rejected request.
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

const CURRENT_YEAR = Number(CURRENT_PERIOD);

describe('CL2-10 PashX Vendor PO — provisional issue-year bound (interim, pre-Gate 0)', () => {
  const supplierId = randomUUID();
  const caseIds: string[] = [];
  const documentIds: string[] = [];
  const idempotencyKeys: string[] = [];

  beforeAll(async () => {
    await assertPashxAppInstalled();
    await seedSupplierCompany(supplierId);
  });

  afterAll(async () => {
    await cleanupPashxTestData({
      procurementCaseIds: caseIds,
      commercialDocumentIds: documentIds,
      supplierIds: [supplierId],
      idempotencyKeys,
    });
  });

  const attemptWithIssueDate = async (issueDate: string) => {
    const procurementCaseId = randomUUID();

    caseIds.push(procurementCaseId);
    await seedProcurementCase({ id: procurementCaseId, aggregateVersion: 0 });

    const body = buildVendorPurchaseOrderRequest({
      procurementCaseRecordId: procurementCaseId,
      supplierRecordId: supplierId,
      expectedVersion: 0,
      issueDate,
    });

    documentIds.push(body.commercialDocumentRecordId);
    idempotencyKeys.push(body.idempotencyKey);

    const response = await postVendorPurchaseOrder({ body });

    return { body, response, procurementCaseId };
  };

  describe('inside the window', () => {
    it.each([
      ['last year', `${CURRENT_YEAR - 1}-11-30`],
      ['this year', CURRENT_PERIOD_ISSUE_DATE],
      ['next year', `${CURRENT_YEAR + 1}-02-01`],
    ])('accepts %s', async (_label, issueDate) => {
      const { response } = await attemptWithIssueDate(issueDate);

      expect(response.status).toBe(201);
      expect(response.body.result.documentNumber).toContain(
        `MAB-VPO-${issueDate.slice(0, 4)}-`,
      );
    });
  });

  describe('outside the window', () => {
    it.each([
      ['two years back', `${CURRENT_YEAR - 2}-12-31`],
      ['two years forward', `${CURRENT_YEAR + 2}-01-01`],
      ['far future', `${CURRENT_YEAR + 73}-01-01`],
    ])(
      'rejects %s with a field-scoped invalid-input error',
      async (_label, issueDate) => {
        const { response } = await attemptWithIssueDate(issueDate);

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          ok: false,
          code: 'PASHX_INVALID_INPUT',
          retryable: false,
          fieldPaths: ['payload.issueDate'],
        });
      },
    );

    it('rejects before allocating a number, so no sequence value is burned', async () => {
      // The assertion that actually matters. The bound sits ahead of the counter increment in
      // buildResult; if it were moved after, every rejected request would silently consume a
      // number from the out-of-window period's sequence.
      const rejectedPeriod = String(CURRENT_YEAR + 2);
      const counterBefore = await readCounter(
        'vendorPurchaseOrder',
        rejectedPeriod,
      );

      const { body, procurementCaseId } = await attemptWithIssueDate(
        `${rejectedPeriod}-04-04`,
      );

      // Still absent, or unchanged if some earlier case created it.
      expect(await readCounter('vendorPurchaseOrder', rejectedPeriod)).toBe(
        counterBefore,
      );
      expect(
        await readCommercialDocument(body.commercialDocumentRecordId),
      ).toBeUndefined();
      expect(await countReceipts(body.idempotencyKey)).toBe(0);
      expect(await readAuditEvents(procurementCaseId)).toHaveLength(0);
      expect(await readProcurementCaseVersion(procurementCaseId)).toBe(0);
    });
  });

  describe('the bound is a numbering rule, not a date-format rule', () => {
    it('still rejects a malformed date as invalid input', async () => {
      // Contract-level ISO validation runs first and produces the same code; this confirms the new
      // bound did not displace it.
      const { response } = await attemptWithIssueDate(`${CURRENT_YEAR}-13-45`);

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('PASHX_INVALID_INPUT');
      expect(response.body.fieldPaths).toContain('payload.issueDate');
    });
  });
});
