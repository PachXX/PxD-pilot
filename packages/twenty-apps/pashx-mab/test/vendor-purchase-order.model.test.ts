import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMabProgressRail,
  buildPurchaseOrderApprovalIdempotencyKey,
  buildPurchaseOrderApprovalRequestRecordId,
  buildSupplierRisk,
  buildSupportingEvidence,
  deriveMabOperatingSteps,
  formatVendorPurchaseOrderAmount,
  formatVendorPurchaseOrderDate,
  getVendorPurchaseOrderApprovalHref,
  getVendorPurchaseOrderCaseHref,
  getVendorPurchaseOrderCompanyHref,
  getVendorPurchaseOrderDocumentHref,
  resolveApprovalCapabilities,
  selectApprovalPanelState,
  selectVerifiedPaymentMovements,
  validateVendorPurchaseOrderLines,
} from '../src/vendor-purchase-order/vendor-purchase-order.model';
import type {
  VendorPurchaseOrderApprovalRecord,
  VendorPurchaseOrderCashMovementRecord,
  VendorPurchaseOrderDocumentRecord,
  VendorPurchaseOrderLineRecord,
} from '../src/vendor-purchase-order/vendor-purchase-order.types';

const PO_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const CASE_ID = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';

const document = (
  overrides: Partial<VendorPurchaseOrderDocumentRecord> = {},
): VendorPurchaseOrderDocumentRecord => ({
  id: PO_ID,
  name: 'MAB-PO-2026-0001',
  documentType: 'vendorPurchaseOrder',
  lifecycleStatus: 'DRAFT',
  aggregateVersion: 3,
  procurementCaseRecordId: CASE_ID,
  supplierRecordId: 'supplier-1',
  issueDate: '2026-08-01',
  currencyCode: 'SAR',
  totalAmountMicros: 30_000_000,
  leadTimeDays: 10,
  paymentTerms: '100% advance',
  validUntil: null,
  ...overrides,
});

const line = (
  overrides: Partial<VendorPurchaseOrderLineRecord> = {},
): VendorPurchaseOrderLineRecord => ({
  id: 'line-1',
  name: 'Line 1',
  commercialDocumentRecordId: PO_ID,
  linePosition: 1,
  description: 'Pump',
  specification: 'Model X',
  quantity: 2,
  unit: 'pcs',
  unitPriceMicros: 10_000_000,
  lineTotalMicros: 20_000_000,
  currencyCode: 'SAR',
  sourceFileReference: 'src/line-1.pdf',
  ...overrides,
});

const approval = (
  overrides: Partial<VendorPurchaseOrderApprovalRecord> = {},
): VendorPurchaseOrderApprovalRecord => ({
  id: 'approval-1',
  status: 'PENDING',
  requestedActionCode: 'purchaseOrder.approval',
  requesterRecordId: 'member-1',
  approverRecordId: 'member-2',
  requestedAt: '2026-08-20T10:00:00.000Z',
  decidedAt: null,
  decisionNote: null,
  payloadDigest: 'a'.repeat(64),
  sourceRecordIds: [PO_ID, CASE_ID],
  ...overrides,
});

const cashMovement = (
  overrides: Partial<VendorPurchaseOrderCashMovementRecord> = {},
): VendorPurchaseOrderCashMovementRecord => ({
  id: 'cash-1',
  direction: 'OUTFLOW',
  verificationStatus: 'VERIFIED',
  amountMicros: 30_000_000,
  currencyCode: 'SAR',
  movementDate: '2026-08-25',
  sourceDocumentRecordId: PO_ID,
  evidenceReference: 'bank/remittance-1',
  ...overrides,
});

test('derives the seven operating steps from the frozen document rules', () => {
  const steps = deriveMabOperatingSteps();
  assert.deepEqual(
    steps.map((step) => [step.step, step.stage]),
    [
      [1, 'intake'],
      [2, 'sourcing'],
      [3, 'quoted'],
      [4, 'customer-order'],
      [5, 'vendor-order'],
      [6, 'delivery'],
      [7, 'invoicing'],
    ],
  );
});

test('builds a seven-step progress rail around the current case stage', () => {
  const atVendorOrder = buildMabProgressRail('vendor-order');
  assert.equal(atVendorOrder.length, 7);
  assert.deepEqual(
    atVendorOrder.map((entry) => entry.state),
    ['complete', 'complete', 'complete', 'complete', 'current', 'upcoming', 'upcoming'],
  );

  const closed = buildMabProgressRail('closed');
  assert.ok(closed.every((entry) => entry.state === 'complete'));

  const cancelled = buildMabProgressRail('cancelled');
  assert.ok(cancelled.every((entry) => entry.state === 'upcoming'));

  const unknown = buildMabProgressRail(null);
  assert.ok(unknown.every((entry) => entry.state === 'upcoming'));
});

test('line validation returns no-lines for an empty set', () => {
  assert.deepEqual(validateVendorPurchaseOrderLines({ lines: [], document: document() }), {
    status: 'no-lines',
  });
});

test('line validation accepts matching integer-micros lines', () => {
  assert.deepEqual(
    validateVendorPurchaseOrderLines({
      lines: [
        line({ id: 'line-1', lineTotalMicros: 20_000_000 }),
        line({
          id: 'line-2',
          linePosition: 2,
          quantity: 1,
          lineTotalMicros: 10_000_000,
        }),
      ],
      document: document(),
    }),
    { status: 'ready' },
  );
});

test('line validation rejects zero and negative quantity', () => {
  assert.deepEqual(
    validateVendorPurchaseOrderLines({
      lines: [line({ id: 'line-1', quantity: 0 }), line({ id: 'line-2', linePosition: 2, quantity: -1 })],
      document: document(),
    }),
    { status: 'invalid-quantity', positions: [1, 2] },
  );
});

test('line validation rejects mixed currencies fail-closed', () => {
  assert.deepEqual(
    validateVendorPurchaseOrderLines({
      lines: [
        line({ id: 'line-1', currencyCode: 'SAR' }),
        line({ id: 'line-2', linePosition: 2, currencyCode: 'USD' }),
      ],
      document: document(),
    }),
    { status: 'mixed-currency', currencies: ['SAR', 'USD'] },
  );
});

test('line validation rejects a line sum that mismatches the document total', () => {
  assert.deepEqual(
    validateVendorPurchaseOrderLines({
      lines: [line({ id: 'line-1', lineTotalMicros: 20_000_000 })],
      document: document({ totalAmountMicros: 50_000_000 }),
    }),
    {
      status: 'mismatched-total',
      expectedTotalMicros: 50_000_000,
      summedTotalMicros: 20_000_000,
    },
  );
});

test('line validation rejects unsafe line totals', () => {
  assert.deepEqual(
    validateVendorPurchaseOrderLines({
      lines: [line({ id: 'line-1', lineTotalMicros: 1.5 })],
      document: document(),
    }),
    { status: 'unsafe-amount', positions: [1] },
  );
});

test('line validation rejects a canceling per-line product inconsistency', () => {
  // Line A overstates by 1 micro; line B understates by 1 micro. The sum still
  // matches the document total, so only the per-line product gate can reject it.
  assert.deepEqual(
    validateVendorPurchaseOrderLines({
      lines: [
        line({ id: 'line-a', lineTotalMicros: 20_000_001 }),
        line({
          id: 'line-b',
          linePosition: 2,
          quantity: 1,
          lineTotalMicros: 9_999_999,
        }),
      ],
      document: document({ totalAmountMicros: 30_000_000 }),
    }),
    { status: 'line-product-mismatch', positions: [1, 2] },
  );
});

test('verified payments require VERIFIED, OUTFLOW, positive, source and evidence', () => {
  const movements = [
    cashMovement({ id: 'good' }),
    cashMovement({ id: 'pending', verificationStatus: 'PENDING' }),
    cashMovement({ id: 'inflow', direction: 'INFLOW' }),
    cashMovement({ id: 'zero', amountMicros: 0 }),
    cashMovement({ id: 'other-doc', sourceDocumentRecordId: 'other' }),
    cashMovement({ id: 'no-evidence', evidenceReference: null }),
  ];

  assert.deepEqual(
    selectVerifiedPaymentMovements(movements, PO_ID).map((movement) => movement.id),
    ['good'],
  );
});

test('supporting evidence stays Not recorded until authoritative records exist', () => {
  const evidence = buildSupportingEvidence({
    approvals: [],
    cashMovements: [],
    caseDocuments: [],
    poRecordId: PO_ID,
  });

  assert.deepEqual(
    evidence.map((entry) => [entry.kind, entry.status]),
    [
      ['internalApproval', 'not-recorded'],
      ['supplierConfirmation', 'not-recorded'],
      ['receipt', 'not-recorded'],
      ['vendorInvoice', 'not-recorded'],
      ['verifiedPayment', 'not-recorded'],
    ],
  );
});

test('supporting evidence records internal approval, receipt, invoice and payment', () => {
  const evidence = buildSupportingEvidence({
    approvals: [approval({ status: 'APPROVED' })],
    cashMovements: [cashMovement()],
    caseDocuments: [
      document({ id: 'dn-1', documentType: 'deliveryNote', lifecycleStatus: 'FINALIZED' }),
      document({ id: 'vi-1', documentType: 'vendorInvoice', lifecycleStatus: 'FINALIZED' }),
      document({ id: 'draft-invoice', documentType: 'vendorInvoice', lifecycleStatus: 'DRAFT' }),
    ],
    poRecordId: PO_ID,
  });

  const byKind = new Map(evidence.map((entry) => [entry.kind, entry]));
  assert.equal(byKind.get('internalApproval')?.status, 'recorded');
  assert.equal(byKind.get('supplierConfirmation')?.status, 'not-recorded');
  assert.equal(byKind.get('receipt')?.status, 'recorded');
  assert.equal(byKind.get('vendorInvoice')?.status, 'recorded');
  assert.equal(byKind.get('verifiedPayment')?.status, 'recorded');
});

test('supplier risk is always Not recorded this release', () => {
  assert.deepEqual(buildSupplierRisk(), { status: 'not-recorded' });
});

test('approval panel selects the latest relevant approval or no-request', () => {
  assert.deepEqual(selectApprovalPanelState([], PO_ID), { status: 'no-request' });
  assert.deepEqual(
    selectApprovalPanelState(
      [approval({ id: 'other', sourceRecordIds: ['other-po'] })],
      PO_ID,
    ),
    { status: 'no-request' },
  );
  assert.deepEqual(selectApprovalPanelState([approval({ status: 'APPROVED' })], PO_ID), {
    status: 'APPROVED',
    approvalRecordId: 'approval-1',
  });
});

test('builds native drill-through hrefs', () => {
  assert.equal(getVendorPurchaseOrderCaseHref('c'), '/object/procurementCase/c');
  assert.equal(getVendorPurchaseOrderDocumentHref('d'), '/object/commercialDocument/d');
  assert.equal(getVendorPurchaseOrderCompanyHref('s'), '/object/company/s');
  assert.equal(getVendorPurchaseOrderApprovalHref('a'), '/object/approvalRequest/a');
});

test('formats amounts and dates deterministically and safely', () => {
  assert.equal(formatVendorPurchaseOrderAmount(1_500_000_000, 'SAR', 'en'), '1,500.00 SAR');
  assert.equal(formatVendorPurchaseOrderAmount(null, 'SAR', 'en'), '—');
  assert.equal(formatVendorPurchaseOrderDate('2026-08-20', 'en').length > 0, true);
  assert.equal(formatVendorPurchaseOrderDate('bad-date', 'en'), '—');
  assert.equal(formatVendorPurchaseOrderDate(null, 'en'), '—');
});

test('approval request identity is deterministic so a timeout retry is byte-identical', () => {
  const idempotencyKey = buildPurchaseOrderApprovalIdempotencyKey(PO_ID);
  assert.equal(
    buildPurchaseOrderApprovalIdempotencyKey(PO_ID),
    idempotencyKey,
  );
  assert.notEqual(
    buildPurchaseOrderApprovalIdempotencyKey(PO_ID),
    buildPurchaseOrderApprovalIdempotencyKey('bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb'),
  );
  assert.equal(idempotencyKey, `purchaseOrder.approval:${PO_ID}`);

  const digest = 'a'.repeat(64);
  const recordId = buildPurchaseOrderApprovalRequestRecordId(digest);
  assert.equal(buildPurchaseOrderApprovalRequestRecordId(digest), recordId);
  assert.notEqual(
    buildPurchaseOrderApprovalRequestRecordId(digest),
    buildPurchaseOrderApprovalRequestRecordId('b'.repeat(64)),
  );
  assert.match(
    recordId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});

test('approval capabilities map the frozen D5 role matrix', () => {
  const admin = resolveApprovalCapabilities([
    'pashx.approval.request',
    'pashx.approval.decide',
  ]);
  assert.deepEqual(admin, { canRequest: true, canDecide: true });

  const operator = resolveApprovalCapabilities([
    'pashx.approval.request',
    'pashx.approval.decide',
  ]);
  assert.deepEqual(operator, { canRequest: true, canDecide: true });

  const viewer = resolveApprovalCapabilities([]);
  assert.deepEqual(viewer, { canRequest: false, canDecide: false });

  const evidenceAgent = resolveApprovalCapabilities([]);
  assert.deepEqual(evidenceAgent, { canRequest: false, canDecide: false });

  const requestOnly = resolveApprovalCapabilities(['pashx.approval.request']);
  assert.deepEqual(requestOnly, { canRequest: true, canDecide: false });
});
