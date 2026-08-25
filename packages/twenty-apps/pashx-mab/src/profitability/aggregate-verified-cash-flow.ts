import { isIsoCurrencyCode, isSafeAmountMicros } from 'pashx-mab-contract';

import {
  CASH_FLOW_EXCLUSION_REASONS,
  type CashFlowExclusionReason,
  type CashMovementRecord,
  type ProfitabilityFilters,
  type VerifiedCashContribution,
  type VerifiedCashCurrencySummary,
  type VerifiedCashFlowResult,
  type VerifiedCashTrendPoint,
} from './operational-profitability.types';

export const VERIFIED_CASH_FLOW_INCLUSION_RULES = [
  'Cash inflow and outflow include only human-verified movements backed by both a source document and an evidence reference.',
  'Finalized invoices, purchase orders, quotations, and expenses are not assumed to be paid.',
  'Pending or rejected movements are excluded and counted; agents cannot verify cash movements.',
  'Currencies are never combined or converted.',
] as const;

const ZERO = BigInt(0);

const createExclusionCounts = (): Record<CashFlowExclusionReason, number> =>
  Object.fromEntries(
    CASH_FLOW_EXCLUSION_REASONS.map((reason) => [reason, 0]),
  ) as Record<CashFlowExclusionReason, number>;

const filterExclusion = (
  record: CashMovementRecord,
  filters: ProfitabilityFilters,
): CashFlowExclusionReason | null => {
  if (record.occurredOn === null) return 'MISSING_DATE';
  if (
    record.occurredOn < filters.periodStart ||
    record.occurredOn >= filters.periodEndExclusive
  ) {
    return 'OUTSIDE_PERIOD';
  }
  if (record.caseDimension === null) return 'MISSING_CASE';

  const dimensions: readonly [readonly string[] | undefined, string | null][] =
    [
      [filters.caseRecordIds, record.caseDimension.caseRecordId],
      [filters.customerRecordIds, record.caseDimension.customerRecordId],
      [filters.projectNames, record.caseDimension.projectName],
      [filters.ownerRecordIds, record.caseDimension.ownerRecordId],
    ];

  return dimensions.some(
    ([selected, value]) =>
      selected !== undefined && (value === null || !selected.includes(value)),
  )
    ? 'FILTERED_OUT'
    : null;
};

const recordExclusion = (
  record: CashMovementRecord,
  filters: ProfitabilityFilters,
): CashFlowExclusionReason | null => {
  const filtered = filterExclusion(record, filters);
  if (filtered !== null) return filtered;
  if (record.verificationStatus === 'PENDING') return 'PENDING_VERIFICATION';
  if (record.verificationStatus === 'REJECTED') return 'REJECTED';
  if (record.amountMicros === null) return 'MISSING_AMOUNT';
  if (!isSafeAmountMicros(record.amountMicros) || record.amountMicros <= 0) {
    return 'UNSAFE_AMOUNT';
  }
  if (record.currencyCode === null || !isIsoCurrencyCode(record.currencyCode)) {
    return 'INVALID_CURRENCY';
  }
  if (record.sourceDocumentRecordId === null) return 'MISSING_SOURCE_DOCUMENT';
  if (
    record.evidenceReference === null ||
    record.evidenceReference.trim() === ''
  ) {
    return 'MISSING_EVIDENCE_REFERENCE';
  }
  return null;
};

const summarize = (
  contributions: readonly VerifiedCashContribution[],
): readonly VerifiedCashCurrencySummary[] => {
  const totals = new Map<
    string,
    { inflowMicros: bigint; outflowMicros: bigint; recordIds: string[] }
  >();

  for (const contribution of contributions) {
    const total = totals.get(contribution.currencyCode) ?? {
      inflowMicros: ZERO,
      outflowMicros: ZERO,
      recordIds: [],
    };
    if (contribution.direction === 'INFLOW') {
      total.inflowMicros += contribution.amountMicros;
    } else {
      total.outflowMicros += contribution.amountMicros;
    }
    total.recordIds.push(contribution.recordId);
    totals.set(contribution.currencyCode, total);
  }

  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currencyCode, total]) => ({
      currencyCode,
      inflowMicros: total.inflowMicros,
      outflowMicros: total.outflowMicros,
      netCashMicros: total.inflowMicros - total.outflowMicros,
      contributionRecordIds: total.recordIds,
    }));
};

const buildTrend = (
  contributions: readonly VerifiedCashContribution[],
): readonly VerifiedCashTrendPoint[] => {
  const groups = new Map<string, VerifiedCashContribution[]>();
  for (const contribution of contributions) {
    const key = `${contribution.month}\u0000${contribution.currencyCode}`;
    groups.set(key, [...(groups.get(key) ?? []), contribution]);
  }

  return [...groups.entries()]
    .map(([key, group]) => ({
      period: key.split('\u0000')[0]!,
      ...summarize(group)[0]!,
    }))
    .sort(
      (left, right) =>
        left.period.localeCompare(right.period) ||
        left.currencyCode.localeCompare(right.currencyCode),
    );
};

export const aggregateVerifiedCashFlow = ({
  records,
  filters,
}: {
  records: readonly CashMovementRecord[];
  filters: ProfitabilityFilters;
}): VerifiedCashFlowResult => {
  const exclusions = createExclusionCounts();
  const contributions: VerifiedCashContribution[] = [];

  for (const record of records) {
    const exclusion = recordExclusion(record, filters);
    if (exclusion !== null) {
      exclusions[exclusion] += 1;
      continue;
    }
    contributions.push({
      recordId: record.recordId,
      recordName: record.recordName,
      direction: record.direction,
      occurredOn: record.occurredOn!,
      month: record.occurredOn!.slice(0, 7),
      amountMicros: BigInt(record.amountMicros!),
      currencyCode: record.currencyCode!,
      sourceDocumentRecordId: record.sourceDocumentRecordId!,
      bankReference: record.bankReference,
      evidenceReference: record.evidenceReference!,
      caseDimension: record.caseDimension!,
    });
  }

  return {
    inclusionRules: VERIFIED_CASH_FLOW_INCLUSION_RULES,
    currencies: summarize(contributions),
    contributions,
    trend: buildTrend(contributions),
    quality: {
      sourceRecordCount: records.length,
      includedRecordCount: contributions.length,
      excludedRecordCount: records.length - contributions.length,
      exclusions,
    },
  };
};
