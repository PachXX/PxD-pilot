import assert from 'node:assert/strict';
import test from 'node:test';

import { aggregateOperationalProfitability } from '../src/profitability/aggregate-operational-profitability';
import {
  buildProfitabilityMetrics,
  countVisibleCurrencyRecords,
  formatMarginBasisPoints,
  formatMoneyMicros,
  getAvailableCurrencies,
  getCurrencyConversionLabel,
  getDefaultDashboardPeriod,
  getEqualDurationPriorFilters,
  getEvidenceRows,
  getMetricComparison,
  getMetricComparisonData,
  getPeriodDayCount,
  getRankedCaseRows,
  getRankedContributions,
  getRelativeBarWidth,
  getTrendPoints,
  getTrendPolylinePoints,
  hasPartialEvidence,
  isDashboardResultEmpty,
  toProfitabilityFilters,
  type ProfitabilityMetric,
} from '../src/profitability/operational-profitability-dashboard.model';
import {
  type OperationalProfitabilityResult,
  type ProfitabilitySourceRecord,
} from '../src/profitability/operational-profitability.types';

const caseDimension = {
  caseRecordId: 'case-1',
  caseName: 'MAB data centre',
  customerRecordId: 'customer-1',
  projectName: 'Data centre',
  ownerRecordId: 'owner-1',
  vendorRecordIds: ['vendor-1'],
} as const;

const document = (
  overrides: Partial<Extract<ProfitabilitySourceRecord, { sourceType: 'DOCUMENT' }>>,
): ProfitabilitySourceRecord => ({
  sourceType: 'DOCUMENT',
  recordId: 'document-1',
  recordName: 'Document 1',
  documentType: 'CUSTOMER_INVOICE',
  lifecycleStatus: 'FINALIZED',
  complianceStatus: 'CLEARED',
  occurredOn: '2026-08-10',
  amountMicros: 200_000_000,
  currencyCode: 'SAR',
  caseDimension,
  ...overrides,
});

const expense = (
  overrides: Partial<Extract<ProfitabilitySourceRecord, { sourceType: 'EXPENSE' }>>,
): ProfitabilitySourceRecord => ({
  sourceType: 'EXPENSE',
  recordId: 'expense-1',
  recordName: 'Expense 1',
  approvalStatus: 'APPROVED',
  occurredOn: '2026-08-11',
  amountMicros: 20_000_000,
  currencyCode: 'SAR',
  caseDimension,
  ...overrides,
});

const aggregate = (
  records: readonly ProfitabilitySourceRecord[],
  periodStart = '2026-08-01',
  periodEndExclusive = '2026-09-01',
): OperationalProfitabilityResult =>
  aggregateOperationalProfitability({
    records,
    filters: { periodStart, periodEndExclusive },
    asOf: '2026-08-14T12:00:00.000Z',
  });

test('builds current and equal-duration prior filters without changing dimensions', () => {
  assert.deepEqual(getDefaultDashboardPeriod(new Date('2026-08-14T12:00:00.000Z')), {
    startDate: '2026-01-01',
    endDate: '2026-08-14',
  });

  const current = toProfitabilityFilters({
    startDate: '2026-08-10',
    endDate: '2026-08-11',
    vendorRecordId: 'vendor-1',
    customerRecordId: 'customer-1',
    projectName: 'Data centre',
    ownerRecordId: 'owner-1',
  });

  assert.deepEqual(current, {
    periodStart: '2026-08-10',
    periodEndExclusive: '2026-08-12',
    vendorRecordIds: ['vendor-1'],
    customerRecordIds: ['customer-1'],
    projectNames: ['Data centre'],
    ownerRecordIds: ['owner-1'],
  });
  assert.deepEqual(getEqualDurationPriorFilters(current), {
    ...current,
    periodStart: '2026-08-08',
    periodEndExclusive: '2026-08-10',
  });
  assert.equal(getPeriodDayCount(current), 2);
  assert.throws(
    () => toProfitabilityFilters({ startDate: 'bad-date', endDate: '2026-08-11' }),
    /Invalid dashboard date/,
  );
  assert.throws(
    () => toProfitabilityFilters({ startDate: '2026-02-31', endDate: '2026-08-11' }),
    /Invalid dashboard date/,
  );
  assert.throws(
    () => toProfitabilityFilters({ startDate: '2026-08-12', endDate: '2026-08-11' }),
    /must not be after/,
  );
});

test('formats micros, margins, relative bars and shared-scale trend points deterministically', () => {
  assert.equal(formatMoneyMicros(BigInt(1_842_500_000_000), 'SAR'), 'SAR 1,842,500.00');
  assert.equal(formatMoneyMicros(BigInt(-1_234_567), 'USD'), 'USD −1.23');
  assert.equal(formatMarginBasisPoints(BigInt(2770)), '27.70%');
  assert.equal(formatMarginBasisPoints(BigInt(-210)), '−2.10%');
  assert.equal(formatMarginBasisPoints(null), 'Not applicable');
  assert.equal(getRelativeBarWidth(BigInt(50), [BigInt(100)]), 50);
  assert.equal(getRelativeBarWidth(BigInt(1), [BigInt(100)]), 4);
  assert.equal(getRelativeBarWidth(BigInt(0), [BigInt(100)]), 0);
  assert.equal(getRelativeBarWidth(BigInt(10), [BigInt(0)]), 0);
  assert.equal(
    getTrendPolylinePoints([BigInt(0), BigInt(100)], 100, 100),
    '0.0,100.0 100.0,0.0',
  );
  assert.equal(getTrendPolylinePoints([BigInt(5)], 100, 100), '50.0,50.0');
  assert.equal(getTrendPolylinePoints([]), '');
});

test('builds trustworthy KPI, trend, ranking and exclusion views from UI1 results', () => {
  const current = aggregate([
    document({ recordId: 'invoice', recordName: 'Invoice', amountMicros: 200_000_000 }),
    document({
      recordId: 'credit',
      recordName: 'Customer credit',
      documentType: 'CUSTOMER_CREDIT_NOTE',
      amountMicros: 10_000_000,
    }),
    document({
      recordId: 'vendor-po',
      recordName: 'Vendor PO',
      documentType: 'VENDOR_PURCHASE_ORDER',
      complianceStatus: 'NOT_REQUIRED',
      amountMicros: 100_000_000,
    }),
    expense({}),
    document({
      recordId: 'draft',
      lifecycleStatus: 'DRAFT',
      amountMicros: 999_000_000,
    }),
    document({
      recordId: 'eur-invoice',
      recordName: 'EUR invoice',
      amountMicros: 50_000_000,
      currencyCode: 'EUR',
    }),
  ]);
  const previous = aggregate([
    document({ recordId: 'previous-invoice', amountMicros: 100_000_000 }),
    document({
      recordId: 'previous-po',
      documentType: 'VENDOR_PURCHASE_ORDER',
      complianceStatus: 'NOT_REQUIRED',
      amountMicros: 50_000_000,
    }),
  ]);

  assert.deepEqual(getAvailableCurrencies(current, previous), ['EUR', 'SAR']);

  const metrics = buildProfitabilityMetrics({ current, previous, currencyCode: 'SAR' });
  assert.deepEqual(
    metrics.map(({ key, value, contributionCount }) => ({ key, value, contributionCount })),
    [
      { key: 'REVENUE', value: BigInt(190_000_000), contributionCount: 2 },
      { key: 'DIRECT_COST', value: BigInt(120_000_000), contributionCount: 2 },
      { key: 'GROSS_PROFIT', value: BigInt(70_000_000), contributionCount: 4 },
      { key: 'GROSS_MARGIN', value: BigInt(3684), contributionCount: 4 },
    ],
  );
  assert.deepEqual(getMetricComparison(metrics[0]!), {
    copy: '+90.00% vs prior period',
    direction: 'POSITIVE',
  });
  assert.deepEqual(getMetricComparison(metrics[1]!), {
    copy: '+140.00% vs prior period',
    direction: 'NEGATIVE',
  });
  assert.deepEqual(getMetricComparison(metrics[3]!), {
    copy: '−13.16 pp vs prior period',
    direction: 'NEGATIVE',
  });
  assert.deepEqual(getMetricComparisonData(metrics[3]!), {
    kind: 'POINT_CHANGE',
    direction: 'NEGATIVE',
    signedChangeBasisPoints: BigInt(-1316),
  });

  assert.deepEqual(getTrendPoints(current, 'SAR'), [
    {
      period: '2026-08',
      revenueMicros: BigInt(190_000_000),
      directCostMicros: BigInt(120_000_000),
      grossProfitMicros: BigInt(70_000_000),
      contributionCount: 4,
    },
  ]);
  assert.equal(getRankedCaseRows(current, 'SAR')[0]?.label, 'MAB data centre');
  assert.equal(getRankedContributions(current, 'SAR')[0]?.recordId, 'invoice');
  assert.equal(getEvidenceRows(current).find(({ reason }) => reason === 'DRAFT')?.count, 1);
  assert.equal(hasPartialEvidence(current), true);
  assert.equal(isDashboardResultEmpty(current), false);
  assert.equal(countVisibleCurrencyRecords(current, 'SAR'), 4);
  assert.equal(getCurrencyConversionLabel(), 'None — currencies remain separated');
  assert.equal(isDashboardResultEmpty(aggregate([])), true);
});

test('describes neutral, missing-baseline and favorable cost comparisons explicitly', () => {
  const metric = (
    overrides: Partial<ProfitabilityMetric>,
  ): ProfitabilityMetric => ({
    key: 'GROSS_PROFIT',
    label: 'Gross profit',
    value: BigInt(100),
    previousValue: BigInt(100),
    valueType: 'MONEY',
    higherIsFavorable: true,
    contributionCount: 1,
    ...overrides,
  });

  assert.deepEqual(getMetricComparison(metric({})), {
    copy: 'No change vs prior period',
    direction: 'NEUTRAL',
  });
  assert.deepEqual(getMetricComparison(metric({ previousValue: BigInt(0) })), {
    copy: 'No positive prior-period baseline',
    direction: 'POSITIVE',
  });
  assert.deepEqual(
    getMetricComparison(
      metric({
        key: 'DIRECT_COST',
        value: BigInt(80),
        previousValue: BigInt(100),
        higherIsFavorable: false,
      }),
    ),
    { copy: '−20.00% vs prior period', direction: 'POSITIVE' },
  );
  assert.deepEqual(
    getMetricComparison(metric({ value: null, previousValue: null, valueType: 'MARGIN' })),
    { copy: 'No comparable prior margin', direction: 'NEUTRAL' },
  );
});
