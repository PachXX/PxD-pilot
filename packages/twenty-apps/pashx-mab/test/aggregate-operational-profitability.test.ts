import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aggregateOperationalProfitability,
  calculateBasisPointAmount,
  calculateGrossMarginBasisPoints,
  CUSTOMER_INVOICE_VAT_BASIS_POINTS,
  SPONSOR_ALLOCATION_BASIS_POINTS,
  ZAKAT_PROVISION_BASIS_POINTS,
} from '../src/profitability/aggregate-operational-profitability';
import {
  type ProfitabilityCaseDimension,
  type ProfitabilityDocumentRecord,
  type ProfitabilityExpenseRecord,
  type ProfitabilityFilters,
  type ProfitabilitySourceRecord,
} from '../src/profitability/operational-profitability.types';

const FILTERS: ProfitabilityFilters = {
  periodStart: '2026-01-01',
  periodEndExclusive: '2027-01-01',
};

const CASE_A: ProfitabilityCaseDimension = {
  caseRecordId: 'case-a',
  caseName: 'DBMSC fit-out',
  customerRecordId: 'customer-a',
  projectName: 'Project Alpha',
  ownerRecordId: 'owner-a',
  vendorRecordIds: ['vendor-a'],
};

const CASE_B: ProfitabilityCaseDimension = {
  caseRecordId: 'case-b',
  caseName: 'Warehouse',
  customerRecordId: null,
  projectName: null,
  ownerRecordId: null,
};

const CASE_C: ProfitabilityCaseDimension = {
  caseRecordId: 'case-c',
  caseName: 'Office',
  customerRecordId: 'customer-c',
  projectName: 'Project Gamma',
  ownerRecordId: 'owner-c',
};

const documentRecord = (
  overrides: Partial<ProfitabilityDocumentRecord> = {},
): ProfitabilityDocumentRecord => ({
  sourceType: 'DOCUMENT',
  recordId: 'document',
  recordName: 'Document',
  documentType: 'CUSTOMER_INVOICE',
  lifecycleStatus: 'FINALIZED',
  complianceStatus: 'CLEARED',
  occurredOn: '2026-06-15',
  amountMicros: 1_000_000,
  currencyCode: 'SAR',
  caseDimension: CASE_A,
  ...overrides,
});

const expenseRecord = (
  overrides: Partial<ProfitabilityExpenseRecord> = {},
): ProfitabilityExpenseRecord => ({
  sourceType: 'EXPENSE',
  recordId: 'expense',
  recordName: 'Expense',
  approvalStatus: 'APPROVED',
  occurredOn: '2026-06-15',
  amountMicros: 100_000,
  currencyCode: 'SAR',
  caseDimension: CASE_A,
  ...overrides,
});

test('aggregates revenue, vendor cost, expenses, credits and currencies', () => {
  const records: ProfitabilitySourceRecord[] = [
    documentRecord({ recordId: 'invoice', amountMicros: 2_000_000 }),
    documentRecord({
      recordId: 'customer-credit',
      documentType: 'CUSTOMER_CREDIT_NOTE',
      complianceStatus: 'NOT_REQUIRED',
      amountMicros: 200_000,
    }),
    documentRecord({
      recordId: 'vendor-order',
      documentType: 'VENDOR_PURCHASE_ORDER',
      complianceStatus: 'PENDING',
      amountMicros: 1_000_000,
    }),
    documentRecord({
      recordId: 'vendor-credit',
      documentType: 'VENDOR_CREDIT_NOTE',
      complianceStatus: 'REJECTED',
      amountMicros: 100_000,
    }),
    expenseRecord({ recordId: 'approved-expense', amountMicros: 100_000 }),
    documentRecord({
      recordId: 'aed-invoice',
      amountMicros: 750_000,
      currencyCode: 'AED',
      caseDimension: CASE_B,
      occurredOn: '2026-07-01',
    }),
    documentRecord({
      recordId: 'aed-invoice-tie',
      amountMicros: 750_000,
      currencyCode: 'AED',
      caseDimension: CASE_C,
      occurredOn: '2026-08-01',
    }),
  ];

  const result = aggregateOperationalProfitability({
    records,
    filters: FILTERS,
    asOf: '2026-08-14T12:00:00.000Z',
  });

  assert.equal(result.asOf, '2026-08-14T12:00:00.000Z');
  assert.equal(result.inclusionRules.length, 8);
  assert.equal(result.quality.includedRecordCount, 7);
  assert.equal(result.quality.excludedRecordCount, 0);
  assert.deepEqual(
    result.currencies.map(({ currencyCode }) => currencyCode),
    ['AED', 'SAR'],
  );
  assert.deepEqual(result.currencies[0], {
    currencyCode: 'AED',
    finalizedRevenueMicros: 1_500_000n,
    invoiceVatMicros: 225_000n,
    grossInvoiceBillingMicros: 1_725_000n,
    directCostMicros: 0n,
    grossProfitMicros: 1_500_000n,
    sponsorAllocationMicros: 60_000n,
    zakatProvisionMicros: 11_250n,
    netProfitAfterAllocationsMicros: 1_428_750n,
    grossMarginBasisPoints: 10_000n,
    contributionRecordIds: ['aed-invoice', 'aed-invoice-tie'],
  });
  assert.deepEqual(result.currencies[1], {
    currencyCode: 'SAR',
    finalizedRevenueMicros: 1_800_000n,
    invoiceVatMicros: 270_000n,
    grossInvoiceBillingMicros: 2_070_000n,
    directCostMicros: 1_000_000n,
    grossProfitMicros: 800_000n,
    sponsorAllocationMicros: 72_000n,
    zakatProvisionMicros: 13_500n,
    netProfitAfterAllocationsMicros: 714_500n,
    grossMarginBasisPoints: 4_444n,
    contributionRecordIds: [
      'invoice',
      'customer-credit',
      'vendor-order',
      'vendor-credit',
      'approved-expense',
    ],
  });
  assert.deepEqual(
    result.contributions.map(({ recordId, kind, signedAmountMicros }) => ({
      recordId,
      kind,
      signedAmountMicros,
    })),
    [
      { recordId: 'invoice', kind: 'REVENUE', signedAmountMicros: 2_000_000n },
      {
        recordId: 'customer-credit',
        kind: 'REVENUE',
        signedAmountMicros: -200_000n,
      },
      {
        recordId: 'vendor-order',
        kind: 'DIRECT_COST_DOCUMENT',
        signedAmountMicros: 1_000_000n,
      },
      {
        recordId: 'vendor-credit',
        kind: 'DIRECT_COST_DOCUMENT',
        signedAmountMicros: -100_000n,
      },
      {
        recordId: 'approved-expense',
        kind: 'DIRECT_COST_EXPENSE',
        signedAmountMicros: 100_000n,
      },
      {
        recordId: 'aed-invoice',
        kind: 'REVENUE',
        signedAmountMicros: 750_000n,
      },
      {
        recordId: 'aed-invoice-tie',
        kind: 'REVENUE',
        signedAmountMicros: 750_000n,
      },
    ],
  );
  assert.equal(result.breakdowns.CASE.length, 3);
  assert.equal(result.breakdowns.CUSTOMER.length, 3);
  assert.equal(
    result.breakdowns.PROJECT.some(
      ({ label }) => label === 'Unassigned project',
    ),
    true,
  );
  assert.equal(
    result.breakdowns.OWNER.some(({ label }) => label === 'Unassigned owner'),
    true,
  );
  assert.deepEqual(
    result.breakdowns.PERIOD.map(({ key }) => key),
    ['2026-06', '2026-07', '2026-08'],
  );
});

test('counts every explicit exclusion without fabricating a total', () => {
  const records: ProfitabilitySourceRecord[] = [
    documentRecord({ recordId: 'outside', occurredOn: '2025-12-31' }),
    documentRecord({ recordId: 'outside-after', occurredOn: '2027-01-01' }),
    documentRecord({ recordId: 'filtered', caseDimension: CASE_B }),
    documentRecord({ recordId: 'missing-case', caseDimension: null }),
    documentRecord({ recordId: 'missing-date', occurredOn: null }),
    documentRecord({ recordId: 'missing-amount', amountMicros: null }),
    documentRecord({ recordId: 'unsafe-amount', amountMicros: -1 }),
    documentRecord({
      recordId: 'unsafe-amount-overflow',
      amountMicros: Number.MAX_SAFE_INTEGER + 1,
    }),
    documentRecord({ recordId: 'invalid-currency', currencyCode: 'sar' }),
    documentRecord({ recordId: 'missing-currency', currencyCode: null }),
    documentRecord({ recordId: 'draft', lifecycleStatus: 'DRAFT' }),
    documentRecord({ recordId: 'cancelled', lifecycleStatus: 'CANCELLED' }),
    documentRecord({ recordId: 'credited', lifecycleStatus: 'CREDITED' }),
    documentRecord({ recordId: 'zatca-pending', complianceStatus: 'PENDING' }),
    documentRecord({ recordId: 'zatca-rejected', complianceStatus: 'REJECTED' }),
    documentRecord({ recordId: 'unsupported', documentType: 'RFQ' }),
    expenseRecord({ recordId: 'expense-pending', approvalStatus: 'PENDING' }),
    expenseRecord({ recordId: 'expense-rejected', approvalStatus: 'REJECTED' }),
  ];

  const result = aggregateOperationalProfitability({
    records,
    filters: { ...FILTERS, caseRecordIds: ['case-a'] },
    asOf: '2026-08-14T12:00:00.000Z',
  });

  assert.equal(result.currencies.length, 0);
  assert.equal(result.contributions.length, 0);
  assert.equal(result.quality.sourceRecordCount, 18);
  assert.equal(result.quality.excludedRecordCount, 18);
  assert.deepEqual(result.quality.exclusions, {
    OUTSIDE_PERIOD: 2,
    FILTERED_OUT: 1,
    MISSING_CASE: 1,
    MISSING_DATE: 1,
    MISSING_AMOUNT: 1,
    UNSAFE_AMOUNT: 2,
    INVALID_CURRENCY: 2,
    DRAFT: 1,
    CANCELLED: 1,
    CREDITED: 1,
    ZATCA_PENDING: 1,
    ZATCA_REJECTED: 1,
    UNSUPPORTED_DOCUMENT_TYPE: 1,
    EXPENSE_PENDING: 1,
    EXPENSE_REJECTED: 1,
  });
});

test('applies every case dimension filter', () => {
  const otherCustomer = { ...CASE_A, customerRecordId: 'customer-b' };
  const otherProject = { ...CASE_A, projectName: 'Project Beta' };
  const otherOwner = { ...CASE_A, ownerRecordId: 'owner-b' };
  const otherVendor = { ...CASE_A, vendorRecordIds: ['vendor-b'] };
  const missingDimensions = {
    ...CASE_A,
    customerRecordId: null,
    projectName: null,
    ownerRecordId: null,
  };
  const result = aggregateOperationalProfitability({
    records: [
      documentRecord(),
      documentRecord({ recordId: 'other', caseDimension: CASE_B }),
      documentRecord({ recordId: 'other-customer', caseDimension: otherCustomer }),
      documentRecord({ recordId: 'other-project', caseDimension: otherProject }),
      documentRecord({ recordId: 'other-owner', caseDimension: otherOwner }),
      documentRecord({ recordId: 'other-vendor', caseDimension: otherVendor }),
      documentRecord({
        recordId: 'missing-dimensions',
        caseDimension: missingDimensions,
      }),
    ],
    filters: {
      ...FILTERS,
      caseRecordIds: ['case-a'],
      customerRecordIds: ['customer-a'],
      projectNames: ['Project Alpha'],
      ownerRecordIds: ['owner-a'],
      vendorRecordIds: ['vendor-a'],
    },
    asOf: '2026-08-14T12:00:00.000Z',
  });

  assert.deepEqual(result.currencies[0]?.contributionRecordIds, ['document']);
  assert.equal(result.quality.exclusions.FILTERED_OUT, 6);
});

test('rounds gross margin half away from zero and handles zero revenue', () => {
  assert.equal(
    calculateGrossMarginBasisPoints({
      finalizedRevenueMicros: 32n,
      grossProfitMicros: 1n,
    }),
    313n,
  );
  assert.equal(
    calculateGrossMarginBasisPoints({
      finalizedRevenueMicros: 33n,
      grossProfitMicros: 1n,
    }),
    303n,
  );
  assert.equal(
    calculateGrossMarginBasisPoints({
      finalizedRevenueMicros: 31n,
      grossProfitMicros: 1n,
    }),
    323n,
  );
  assert.equal(
    calculateGrossMarginBasisPoints({
      finalizedRevenueMicros: 64n,
      grossProfitMicros: 2n,
    }),
    313n,
  );
  assert.equal(
    calculateGrossMarginBasisPoints({
      finalizedRevenueMicros: -32n,
      grossProfitMicros: 1n,
    }),
    -313n,
  );
  assert.equal(
    calculateGrossMarginBasisPoints({
      finalizedRevenueMicros: 32n,
      grossProfitMicros: -1n,
    }),
    -313n,
  );
  assert.equal(
    calculateGrossMarginBasisPoints({
      finalizedRevenueMicros: -32n,
      grossProfitMicros: -1n,
    }),
    313n,
  );
  assert.equal(
    calculateGrossMarginBasisPoints({
      finalizedRevenueMicros: 0n,
      grossProfitMicros: -100n,
    }),
    null,
  );
});

test('calculates invoice VAT, sponsor allocation and Zakat from finalized revenue', () => {
  const finalizedRevenueMicros = 100_000_000n;

  assert.equal(
    calculateBasisPointAmount({
      amountMicros: finalizedRevenueMicros,
      rateBasisPoints: CUSTOMER_INVOICE_VAT_BASIS_POINTS,
    }),
    15_000_000n,
  );
  assert.equal(
    calculateBasisPointAmount({
      amountMicros: finalizedRevenueMicros,
      rateBasisPoints: SPONSOR_ALLOCATION_BASIS_POINTS,
    }),
    4_000_000n,
  );
  assert.equal(
    calculateBasisPointAmount({
      amountMicros: finalizedRevenueMicros,
      rateBasisPoints: ZAKAT_PROVISION_BASIS_POINTS,
    }),
    750_000n,
  );
});

test('rounds VAT per invoice before summing the reporting period', () => {
  const result = aggregateOperationalProfitability({
    records: [
      documentRecord({ recordId: 'invoice-a', amountMicros: 4 }),
      documentRecord({ recordId: 'invoice-b', amountMicros: 4 }),
    ],
    filters: FILTERS,
    asOf: '2026-08-14T12:00:00.000Z',
  });

  assert.equal(result.currencies[0]?.finalizedRevenueMicros, 8n);
  assert.equal(result.currencies[0]?.invoiceVatMicros, 2n);
  assert.equal(result.currencies[0]?.grossInvoiceBillingMicros, 10n);
});

test('returns an explicit empty result when no source records match', () => {
  const result = aggregateOperationalProfitability({
    records: [],
    filters: FILTERS,
    asOf: '2026-08-14T12:00:00.000Z',
  });

  assert.deepEqual(result.currencies, []);
  assert.deepEqual(result.contributions, []);
  assert.deepEqual(result.breakdowns, {
    CASE: [],
    CUSTOMER: [],
    PROJECT: [],
    OWNER: [],
    PERIOD: [],
  });
  assert.equal(result.quality.sourceRecordCount, 0);
  assert.equal(result.quality.includedRecordCount, 0);
  assert.equal(result.quality.excludedRecordCount, 0);
});
