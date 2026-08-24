import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCustomerQuotationSummary,
  buildEvidenceCompleteness,
  buildVendorComparisonRecommendation,
  buildVendorComparisonSummary,
  formatVendorComparisonAmount,
  formatVendorComparisonDate,
  formatVendorComparisonDateTime,
  formatVendorComparisonVariance,
  selectFinalizedVendorQuotes,
} from '../src/vendor-comparison/vendor-comparison.model';
import type {
  VendorComparisonCaseRecord,
  VendorComparisonDocumentRecord,
} from '../src/vendor-comparison/vendor-comparison.types';

const AS_OF = '2026-09-01T00:00:00.000Z';

const caseRecord = (
  overrides: Partial<VendorComparisonCaseRecord> = {},
): VendorComparisonCaseRecord => ({
  id: 'case-1',
  name: 'Case 1',
  stage: 'sourcing',
  customerRecordId: 'customer-1',
  nextActionCode: 'REVIEW_DRAFT_DOCUMENT',
  actionDueAt: '2026-09-10T00:00:00.000Z',
  supplierResponseDeadlineAt: '2026-08-28T00:00:00.000Z',
  ...overrides,
});

const quote = (
  overrides: Partial<VendorComparisonDocumentRecord> = {},
): VendorComparisonDocumentRecord => ({
  id: 'q-1',
  name: 'Q-001',
  procurementCaseRecordId: 'case-1',
  documentType: 'vendorQuote',
  lifecycleStatus: 'FINALIZED',
  supplierRecordId: 'supplier-1',
  issueDate: '2026-08-01',
  currencyCode: 'SAR',
  totalAmountMicros: 100_000_000,
  leadTimeDays: 10,
  paymentTerms: 'Net 30',
  validUntil: '2026-12-31',
  ...overrides,
});

test('returns no-finalized-quotes when the candidate set is empty', () => {
  assert.deepEqual(buildVendorComparisonRecommendation([], AS_OF), {
    status: 'no-finalized-quotes',
  });
});

test('returns mixed-currency and lists the currencies deterministically', () => {
  const recommendation = buildVendorComparisonRecommendation(
    [
      quote({ id: 'q-1', currencyCode: 'SAR' }),
      quote({ id: 'q-2', currencyCode: 'USD' }),
      quote({ id: 'q-3', currencyCode: 'AED' }),
    ],
    AS_OF,
  );

  assert.deepEqual(recommendation, {
    status: 'mixed-currency',
    currencies: ['AED', 'SAR', 'USD'],
  });
});

test('returns missing-total and lists the affected references', () => {
  const recommendation = buildVendorComparisonRecommendation(
    [
      quote({ id: 'q-1', name: 'Q-001' }),
      quote({ id: 'q-2', name: 'Q-002', totalAmountMicros: null }),
    ],
    AS_OF,
  );

  assert.deepEqual(recommendation, {
    status: 'missing-total',
    refs: ['Q-002'],
  });
});

test('returns conflicting-supplier-quotes when one supplier holds two quotes', () => {
  const recommendation = buildVendorComparisonRecommendation(
    [
      quote({ id: 'q-1', name: 'Q-001', supplierRecordId: 'supplier-1' }),
      quote({ id: 'q-2', name: 'Q-002', supplierRecordId: 'supplier-1' }),
      quote({ id: 'q-3', name: 'Q-003', supplierRecordId: 'supplier-2' }),
    ],
    AS_OF,
  );

  assert.deepEqual(recommendation, {
    status: 'conflicting-supplier-quotes',
    refs: ['Q-001', 'Q-002'],
  });
});

test('excludes expired quotes and ranks only the remaining comparable set', () => {
  const recommendation = buildVendorComparisonRecommendation(
    [
      quote({
        id: 'q-1',
        name: 'Q-001',
        supplierRecordId: 'supplier-1',
        validUntil: '2026-08-01',
      }),
      quote({ id: 'q-2', name: 'Q-002', supplierRecordId: 'supplier-2' }),
      quote({ id: 'q-3', name: 'Q-003', supplierRecordId: 'supplier-3' }),
    ],
    AS_OF,
  );

  assert.equal(recommendation.status, 'ranked');
  if (recommendation.status !== 'ranked') return;
  assert.deepEqual(
    recommendation.excluded.map((exclusion) => exclusion.reference),
    ['Q-001'],
  );
  assert.deepEqual(
    recommendation.ranking.map((entry) => entry.reference),
    ['Q-002', 'Q-003'],
  );
});

test('returns all-expired when every candidate is expired', () => {
  const recommendation = buildVendorComparisonRecommendation(
    [
      quote({
        id: 'q-1',
        name: 'Q-001',
        supplierRecordId: 'supplier-1',
        validUntil: '2026-08-01',
      }),
      quote({
        id: 'q-2',
        name: 'Q-002',
        supplierRecordId: 'supplier-2',
        validUntil: '2026-07-01',
      }),
    ],
    AS_OF,
  );

  assert.deepEqual(recommendation, {
    status: 'all-expired',
    expiredCount: 2,
    expiredRefs: ['Q-001', 'Q-002'],
  });
});

test('returns insufficient-comparable for a single comparable candidate', () => {
  const recommendation = buildVendorComparisonRecommendation(
    [quote({ id: 'q-1' })],
    AS_OF,
  );

  assert.deepEqual(recommendation, {
    status: 'insufficient-comparable',
    comparableCount: 1,
  });
});

test('orders null lead time last without fabricating a number', () => {
  const recommendation = buildVendorComparisonRecommendation(
    [
      quote({
        id: 'q-1',
        name: 'Q-001',
        supplierRecordId: 'supplier-1',
        leadTimeDays: null,
      }),
      quote({
        id: 'q-2',
        name: 'Q-002',
        supplierRecordId: 'supplier-2',
        leadTimeDays: 5,
      }),
      quote({
        id: 'q-3',
        name: 'Q-003',
        supplierRecordId: 'supplier-3',
        leadTimeDays: 2,
      }),
    ],
    AS_OF,
  );

  assert.equal(recommendation.status, 'ranked');
  if (recommendation.status !== 'ranked') return;
  assert.deepEqual(
    recommendation.ranking.map((entry) => [
      entry.reference,
      entry.leadTimeDays,
    ]),
    [
      ['Q-003', 2],
      ['Q-002', 5],
      ['Q-001', null],
    ],
  );
});

test('produces a total deterministic order with total, lead, reference and id', () => {
  const recommendation = buildVendorComparisonRecommendation(
    [
      quote({
        id: 'q-d',
        name: 'A-REF',
        supplierRecordId: 'supplier-4',
        leadTimeDays: 5,
      }),
      quote({
        id: 'q-a',
        name: 'Z-REF',
        supplierRecordId: 'supplier-1',
        leadTimeDays: 10,
      }),
      quote({
        id: 'q-b',
        name: 'A-REF',
        supplierRecordId: 'supplier-2',
        leadTimeDays: 5,
      }),
      quote({
        id: 'q-c',
        name: 'M-REF',
        supplierRecordId: 'supplier-3',
        totalAmountMicros: 50_000_000,
        leadTimeDays: 20,
      }),
    ],
    AS_OF,
  );

  assert.equal(recommendation.status, 'ranked');
  if (recommendation.status !== 'ranked') return;
  assert.deepEqual(
    recommendation.ranking.map((entry) => [entry.rank, entry.reference]),
    [
      [1, 'M-REF'],
      [2, 'A-REF'],
      [3, 'A-REF'],
      [4, 'Z-REF'],
    ],
  );
  assert.deepEqual(
    recommendation.ranking.map((entry) => entry.documentId),
    ['q-c', 'q-b', 'q-d', 'q-a'],
  );
});

test('selects only finalized vendor quotations', () => {
  const documents = [
    quote({ id: 'q-1' }),
    quote({ id: 'q-2', lifecycleStatus: 'DRAFT' }),
    quote({ id: 'q-3', documentType: 'supplierRfq' }),
    quote({ id: 'q-4', documentType: 'vendorQuote', lifecycleStatus: 'CANCELLED' }),
  ];

  assert.deepEqual(
    selectFinalizedVendorQuotes(documents).map((document) => document.id),
    ['q-1'],
  );
});

test('derives invited and response signals from finalized evidence only', () => {
  const summary = buildVendorComparisonSummary(
    [
      quote({
        id: 'rfq-1',
        documentType: 'supplierRfq',
        supplierRecordId: 'supplier-1',
        totalAmountMicros: null,
      }),
      quote({
        id: 'rfq-2',
        documentType: 'supplierRfq',
        supplierRecordId: 'supplier-2',
        lifecycleStatus: 'DRAFT',
        totalAmountMicros: null,
      }),
      quote({ id: 'q-1', supplierRecordId: 'supplier-1' }),
      quote({ id: 'q-2', supplierRecordId: 'supplier-3' }),
    ],
    caseRecord(),
  );

  assert.equal(summary.invitedCount, 1);
  assert.deepEqual(summary.invitedSupplierIds, ['supplier-1']);
  assert.equal(summary.responseCount, 2);
  assert.deepEqual(summary.responseSupplierIds, ['supplier-1', 'supplier-3']);
});

test('computes price variance over same-currency quotes and not applicable otherwise', () => {
  const sameCurrency = buildVendorComparisonSummary(
    [
      quote({ id: 'q-1', supplierRecordId: 's-1', totalAmountMicros: 100_000_000 }),
      quote({ id: 'q-2', supplierRecordId: 's-2', totalAmountMicros: 150_000_000 }),
    ],
    caseRecord(),
  );
  assert.equal(sameCurrency.priceVariance, 0.5);
  assert.equal(sameCurrency.priceVarianceCurrencyCode, 'SAR');

  const mixedCurrency = buildVendorComparisonSummary(
    [
      quote({ id: 'q-1', supplierRecordId: 's-1' }),
      quote({ id: 'q-2', supplierRecordId: 's-2', currencyCode: 'USD' }),
    ],
    caseRecord(),
  );
  assert.equal(mixedCurrency.priceVariance, null);

  const singleQuote = buildVendorComparisonSummary(
    [quote({ id: 'q-1', supplierRecordId: 's-1' })],
    caseRecord(),
  );
  assert.equal(singleQuote.priceVariance, null);
});

test('counts evidence completeness from finalized documents', () => {
  const completeness = buildEvidenceCompleteness([
    quote({ id: 'q-1' }),
    quote({ id: 'rfq-1', documentType: 'supplierRfq' }),
    quote({ id: 'cq-1', documentType: 'customerQuote' }),
    quote({ id: 'draft-1', lifecycleStatus: 'DRAFT' }),
  ]);

  assert.deepEqual(completeness, {
    totalDocumentCount: 4,
    finalizedDocumentCount: 3,
    finalizedSupplierRfqCount: 1,
    finalizedVendorQuoteCount: 1,
    finalizedCustomerQuoteCount: 1,
  });
});

test('summarizes customer quotations with their finalized state', () => {
  const summary = buildCustomerQuotationSummary(
    [
      quote({
        id: 'cq-1',
        name: 'CQ-001',
        documentType: 'customerQuote',
      }),
      quote({
        id: 'cq-2',
        name: 'CQ-002',
        documentType: 'customerQuote',
        lifecycleStatus: 'DRAFT',
      }),
      quote({ id: 'q-1', name: 'Q-001' }),
    ],
    caseRecord(),
  );

  assert.equal(summary.totalCount, 2);
  assert.equal(summary.finalizedCount, 1);
  assert.deepEqual(
    summary.quotations.map((quotation) => quotation.reference),
    ['CQ-001', 'CQ-002'],
  );
});

test('formats amounts, dates and variance deterministically and safely', () => {
  assert.equal(formatVendorComparisonAmount(1_500_000_000, 'SAR', 'en'), '1,500.00 SAR');
  assert.equal(formatVendorComparisonAmount(null, 'SAR', 'en'), '—');
  assert.equal(formatVendorComparisonDate('2026-08-20', 'en').length > 0, true);
  assert.equal(formatVendorComparisonDate('bad-date', 'en'), '—');
  assert.equal(
    formatVendorComparisonDateTime('2026-08-24T10:00:00.000Z', 'en').length > 0,
    true,
  );
  assert.equal(formatVendorComparisonDateTime(null, 'en'), '—');
  assert.equal(formatVendorComparisonVariance(0.5, 'en'), '50.0%');
  assert.equal(formatVendorComparisonVariance(null, 'en'), '—');
});
