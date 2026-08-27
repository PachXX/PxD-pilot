import assert from 'node:assert/strict';
import test from 'node:test';

import { aggregateOperationalProfitability } from '../src/profitability/aggregate-operational-profitability';
import { aggregateVerifiedCashFlow } from '../src/profitability/aggregate-verified-cash-flow';
import {
  getAvailableCurrencies,
  getTrendPoints,
  isDashboardResultEmpty,
} from '../src/profitability/operational-profitability-dashboard.model';
import {
  type CashMovementRecord,
  type ProfitabilitySourceRecord,
} from '../src/profitability/operational-profitability.types';

const caseDimension = {
  caseRecordId: 'case-1',
  caseName: 'MAB verified case',
  customerRecordId: 'customer-1',
  projectName: 'Verified project',
  ownerRecordId: 'owner-1',
} as const;

const cashMovement = (
  overrides: Partial<CashMovementRecord>,
): CashMovementRecord => ({
  recordId: 'cash-1',
  recordName: 'BANK-REF-1',
  direction: 'INFLOW',
  verificationStatus: 'VERIFIED',
  occurredOn: '2026-08-10',
  amountMicros: 100_000_000,
  currencyCode: 'SAR',
  sourceDocumentRecordId: 'document-1',
  bankReference: 'BANK-REF-1',
  evidenceReference: 'evidence/payment-1.pdf',
  caseDimension,
  ...overrides,
});

test('cash totals include only verified evidence-linked movements', () => {
  const result = aggregateVerifiedCashFlow({
    records: [
      cashMovement({ recordId: 'receipt', amountMicros: 150_000_000 }),
      cashMovement({
        recordId: 'payment',
        direction: 'OUTFLOW',
        amountMicros: 90_000_000,
      }),
      cashMovement({ recordId: 'pending', verificationStatus: 'PENDING' }),
      cashMovement({ recordId: 'rejected', verificationStatus: 'REJECTED' }),
      cashMovement({ recordId: 'no-document', sourceDocumentRecordId: null }),
      cashMovement({ recordId: 'no-evidence', evidenceReference: '   ' }),
    ],
    filters: {
      periodStart: '2026-08-01',
      periodEndExclusive: '2026-09-01',
    },
  });

  assert.deepEqual(result.currencies, [
    {
      currencyCode: 'SAR',
      inflowMicros: BigInt(150_000_000),
      outflowMicros: BigInt(90_000_000),
      netCashMicros: BigInt(60_000_000),
      contributionRecordIds: ['receipt', 'payment'],
    },
  ]);
  assert.equal(result.quality.includedRecordCount, 2);
  assert.equal(result.quality.excludedRecordCount, 4);
  assert.equal(result.quality.exclusions.PENDING_VERIFICATION, 1);
  assert.equal(result.quality.exclusions.REJECTED, 1);
  assert.equal(result.quality.exclusions.MISSING_SOURCE_DOCUMENT, 1);
  assert.equal(result.quality.exclusions.MISSING_EVIDENCE_REFERENCE, 1);
});

test('cash movement filters and monthly trend remain deterministic and chronological', () => {
  const result = aggregateVerifiedCashFlow({
    records: [
      cashMovement({
        recordId: 'august',
        occurredOn: '2026-08-10',
        amountMicros: 200_000_000,
      }),
      cashMovement({
        recordId: 'july',
        occurredOn: '2026-07-10',
        amountMicros: 10_000_000,
      }),
      cashMovement({
        recordId: 'other-case',
        caseDimension: { ...caseDimension, caseRecordId: 'case-2' },
      }),
    ],
    filters: {
      periodStart: '2026-07-01',
      periodEndExclusive: '2026-09-01',
      caseRecordIds: ['case-1'],
    },
  });

  assert.deepEqual(
    result.trend.map(({ period }) => period),
    ['2026-07', '2026-08'],
  );
  assert.equal(result.quality.exclusions.FILTERED_OUT, 1);
});

test('finalized document trend is chronological rather than profit-ranked', () => {
  const document = (
    recordId: string,
    occurredOn: string,
    amountMicros: number,
  ): ProfitabilitySourceRecord => ({
    sourceType: 'DOCUMENT',
    recordId,
    recordName: recordId,
    documentType: 'CUSTOMER_INVOICE',
    lifecycleStatus: 'FINALIZED',
    complianceStatus: 'CLEARED',
    occurredOn,
    amountMicros,
    currencyCode: 'SAR',
    caseDimension,
  });
  const result = aggregateOperationalProfitability({
    records: [
      document('august', '2026-08-10', 200_000_000),
      document('july', '2026-07-10', 10_000_000),
    ],
    filters: {
      periodStart: '2026-07-01',
      periodEndExclusive: '2026-09-01',
    },
    asOf: '2026-08-25T12:00:00.000Z',
  });

  assert.deepEqual(
    getTrendPoints(result, 'SAR').map(({ period }) => period),
    ['2026-07', '2026-08'],
  );
});

test('cash-only currencies remain selectable and keep the dashboard non-empty', () => {
  const cashFlow = aggregateVerifiedCashFlow({
    records: [cashMovement({ currencyCode: 'EUR' })],
    filters: {
      periodStart: '2026-08-01',
      periodEndExclusive: '2026-09-01',
    },
  });
  const emptyProfitability = aggregateOperationalProfitability({
    records: [],
    filters: {
      periodStart: '2026-08-01',
      periodEndExclusive: '2026-09-01',
    },
    asOf: '2026-08-25T12:00:00.000Z',
  });
  const withCash = { ...emptyProfitability, cashFlow };

  assert.deepEqual(getAvailableCurrencies(withCash, emptyProfitability), [
    'EUR',
  ]);
  assert.equal(isDashboardResultEmpty(withCash), false);
});
