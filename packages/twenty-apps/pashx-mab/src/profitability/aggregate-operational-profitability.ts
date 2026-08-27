import { isIsoCurrencyCode, isSafeAmountMicros } from 'pashx-mab-contract';

import {
  PROFITABILITY_EXCLUSION_REASONS,
  type OperationalProfitabilityResult,
  type ProfitabilityBreakdownDimension,
  type ProfitabilityBreakdownRow,
  type ProfitabilityContribution,
  type ProfitabilityContributionKind,
  type ProfitabilityCurrencySummary,
  type ProfitabilityDocumentRecord,
  type ProfitabilityExclusionReason,
  type ProfitabilityFilters,
  type ProfitabilitySourceRecord,
} from './operational-profitability.types';

export const OPERATIONAL_PROFITABILITY_INCLUSION_RULES = [
  'Revenue includes finalized customer invoices and finalized customer credit notes with cleared or not-required compliance.',
  'Direct cost includes finalized vendor purchase orders, finalized vendor credit notes, and approved recorded direct expenses.',
  'Customer and vendor credit notes reduce their respective totals using a positive stored amount and a deterministic negative sign.',
  'Draft, cancelled, credited-original, ZATCA-pending, ZATCA-rejected, pending-expense, and rejected-expense records are excluded and counted.',
  'Currencies are never combined; each ISO 4217 currency is reported separately without conversion.',
  'Gross margin is rounded half away from zero to one basis point and is not applicable when finalized revenue is zero.',
] as const;

type MutableCurrencySummary = {
  finalizedRevenueMicros: bigint;
  directCostMicros: bigint;
  contributionRecordIds: string[];
};

const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);
const BIGINT_TWO = BigInt(2);
const BASIS_POINTS_PER_ONE = BigInt(10_000);

const createExclusionCounts = (): Record<ProfitabilityExclusionReason, number> =>
  Object.fromEntries(
    PROFITABILITY_EXCLUSION_REASONS.map((reason) => [reason, 0]),
  ) as Record<ProfitabilityExclusionReason, number>;

const roundRatioHalfAwayFromZero = (
  numerator: bigint,
  denominator: bigint,
): bigint => {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const absoluteRemainder =
    remainder < BIGINT_ZERO ? -remainder : remainder;
  const absoluteDenominator =
    denominator < BIGINT_ZERO ? -denominator : denominator;

  if (absoluteRemainder * BIGINT_TWO < absoluteDenominator) {
    return quotient;
  }

  const sameSign =
    (numerator >= BIGINT_ZERO && denominator > BIGINT_ZERO) ||
    (numerator < BIGINT_ZERO && denominator < BIGINT_ZERO);

  return quotient + (sameSign ? BIGINT_ONE : -BIGINT_ONE);
};

export const calculateGrossMarginBasisPoints = ({
  finalizedRevenueMicros,
  grossProfitMicros,
}: {
  finalizedRevenueMicros: bigint;
  grossProfitMicros: bigint;
}): bigint | null =>
  finalizedRevenueMicros === BIGINT_ZERO
    ? null
    : roundRatioHalfAwayFromZero(
        grossProfitMicros * BASIS_POINTS_PER_ONE,
        finalizedRevenueMicros,
      );

const isWithinFilters = (
  record: ProfitabilitySourceRecord,
  filters: ProfitabilityFilters,
): ProfitabilityExclusionReason | null => {
  if (record.occurredOn === null) {
    return 'MISSING_DATE';
  }

  if (
    record.occurredOn < filters.periodStart ||
    record.occurredOn >= filters.periodEndExclusive
  ) {
    return 'OUTSIDE_PERIOD';
  }

  if (record.caseDimension === null) {
    return 'MISSING_CASE';
  }

  const selectedDimensions: readonly [
    readonly string[] | undefined,
    string | null,
  ][] = [
    [filters.caseRecordIds, record.caseDimension.caseRecordId],
    [filters.customerRecordIds, record.caseDimension.customerRecordId],
    [filters.projectNames, record.caseDimension.projectName],
    [filters.ownerRecordIds, record.caseDimension.ownerRecordId],
  ];

  return selectedDimensions.some(
    ([selectedValues, recordValue]) =>
      selectedValues !== undefined &&
      (recordValue === null || !selectedValues.includes(recordValue)),
  )
    ? 'FILTERED_OUT'
    : null;
};

const getDocumentExclusion = (
  record: ProfitabilityDocumentRecord,
): ProfitabilityExclusionReason | null => {
  if (record.lifecycleStatus === 'DRAFT') return 'DRAFT';
  if (record.lifecycleStatus === 'CANCELLED') return 'CANCELLED';
  if (record.lifecycleStatus === 'CREDITED') return 'CREDITED';

  if (
    record.documentType === 'CUSTOMER_INVOICE' ||
    record.documentType === 'CUSTOMER_CREDIT_NOTE'
  ) {
    if (record.complianceStatus === 'PENDING') return 'ZATCA_PENDING';
    if (record.complianceStatus === 'REJECTED') return 'ZATCA_REJECTED';
  }

  return [
    'CUSTOMER_INVOICE',
    'CUSTOMER_CREDIT_NOTE',
    'VENDOR_PURCHASE_ORDER',
    'VENDOR_CREDIT_NOTE',
  ].includes(record.documentType)
    ? null
    : 'UNSUPPORTED_DOCUMENT_TYPE';
};

const getContributionKind = (
  record: ProfitabilitySourceRecord,
): ProfitabilityContributionKind =>
  record.sourceType === 'EXPENSE'
    ? 'DIRECT_COST_EXPENSE'
    : record.documentType === 'CUSTOMER_INVOICE' ||
        record.documentType === 'CUSTOMER_CREDIT_NOTE'
      ? 'REVENUE'
      : 'DIRECT_COST_DOCUMENT';

const isCredit = (record: ProfitabilitySourceRecord): boolean =>
  record.sourceType === 'DOCUMENT' &&
  (record.documentType === 'CUSTOMER_CREDIT_NOTE' ||
    record.documentType === 'VENDOR_CREDIT_NOTE');

const toContribution = (
  record: ProfitabilitySourceRecord,
): ProfitabilityContribution => ({
  recordId: record.recordId,
  recordName: record.recordName,
  sourceType: record.sourceType,
  kind: getContributionKind(record),
  occurredOn: record.occurredOn!,
  month: record.occurredOn!.slice(0, 7),
  currencyCode: record.currencyCode!,
  signedAmountMicros:
    BigInt(record.amountMicros!) * (isCredit(record) ? -BIGINT_ONE : BIGINT_ONE),
  caseDimension: record.caseDimension!,
});

const toCurrencySummary = (
  currencyCode: string,
  mutableSummary: MutableCurrencySummary,
): ProfitabilityCurrencySummary => {
  const grossProfitMicros =
    mutableSummary.finalizedRevenueMicros - mutableSummary.directCostMicros;

  return {
    currencyCode,
    finalizedRevenueMicros: mutableSummary.finalizedRevenueMicros,
    directCostMicros: mutableSummary.directCostMicros,
    grossProfitMicros,
    grossMarginBasisPoints: calculateGrossMarginBasisPoints({
      finalizedRevenueMicros: mutableSummary.finalizedRevenueMicros,
      grossProfitMicros,
    }),
    contributionRecordIds: mutableSummary.contributionRecordIds,
  };
};

const summarizeContributions = (
  contributions: readonly ProfitabilityContribution[],
): readonly ProfitabilityCurrencySummary[] => {
  const summaries = new Map<string, MutableCurrencySummary>();

  for (const contribution of contributions) {
    const summary = summaries.get(contribution.currencyCode) ?? {
      finalizedRevenueMicros: BIGINT_ZERO,
      directCostMicros: BIGINT_ZERO,
      contributionRecordIds: [],
    };

    if (contribution.kind === 'REVENUE') {
      summary.finalizedRevenueMicros += contribution.signedAmountMicros;
    } else {
      summary.directCostMicros += contribution.signedAmountMicros;
    }

    summary.contributionRecordIds.push(contribution.recordId);
    summaries.set(contribution.currencyCode, summary);
  }

  return [...summaries.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currencyCode, summary]) =>
      toCurrencySummary(currencyCode, summary),
    );
};

const getBreakdownIdentity = (
  contribution: ProfitabilityContribution,
  dimension: ProfitabilityBreakdownDimension,
): readonly [string, string] => {
  switch (dimension) {
    case 'CASE':
      return [
        contribution.caseDimension.caseRecordId,
        contribution.caseDimension.caseName,
      ];
    case 'CUSTOMER':
      return [
        contribution.caseDimension.customerRecordId ?? 'unassigned',
        contribution.caseDimension.customerRecordId ?? 'Unassigned customer',
      ];
    case 'PROJECT':
      return [
        contribution.caseDimension.projectName ?? 'unassigned',
        contribution.caseDimension.projectName ?? 'Unassigned project',
      ];
    case 'OWNER':
      return [
        contribution.caseDimension.ownerRecordId ?? 'unassigned',
        contribution.caseDimension.ownerRecordId ?? 'Unassigned owner',
      ];
    case 'PERIOD':
      return [contribution.month, contribution.month];
  }
};

const buildBreakdown = (
  contributions: readonly ProfitabilityContribution[],
  dimension: ProfitabilityBreakdownDimension,
): readonly ProfitabilityBreakdownRow[] => {
  const grouped = new Map<string, ProfitabilityContribution[]>();
  const labels = new Map<string, string>();

  for (const contribution of contributions) {
    const [key, label] = getBreakdownIdentity(contribution, dimension);
    const compoundKey = `${key}\u0000${contribution.currencyCode}`;

    grouped.set(compoundKey, [
      ...(grouped.get(compoundKey) ?? []),
      contribution,
    ]);
    labels.set(compoundKey, label);
  }

  return [...grouped.entries()]
    .map(([compoundKey, groupContributions]) => {
      const key = compoundKey.split('\u0000')[0]!;
      const summary = summarizeContributions(groupContributions)[0]!;

      return {
        dimension,
        key,
        label: labels.get(compoundKey)!,
        summary,
      };
    })
    .sort(
      (left, right) =>
        Number(
          right.summary.grossProfitMicros - left.summary.grossProfitMicros,
        ) || left.label.localeCompare(right.label),
    );
};

export function aggregateOperationalProfitability({
  records,
  filters,
  asOf,
}: {
  records: readonly ProfitabilitySourceRecord[];
  filters: ProfitabilityFilters;
  asOf: string;
}): OperationalProfitabilityResult {
  const exclusions = createExclusionCounts();
  const contributions: ProfitabilityContribution[] = [];

  for (const record of records) {
    const filterExclusion = isWithinFilters(record, filters);
    const lifecycleExclusion =
      filterExclusion ??
      (record.sourceType === 'DOCUMENT'
        ? getDocumentExclusion(record)
        : record.approvalStatus === 'PENDING'
          ? 'EXPENSE_PENDING'
          : record.approvalStatus === 'REJECTED'
            ? 'EXPENSE_REJECTED'
            : null);
    const amountExclusion =
      record.amountMicros === null
        ? 'MISSING_AMOUNT'
        : !isSafeAmountMicros(record.amountMicros) || record.amountMicros < 0
          ? 'UNSAFE_AMOUNT'
          : record.currencyCode === null ||
              !isIsoCurrencyCode(record.currencyCode)
            ? 'INVALID_CURRENCY'
            : null;
    const exclusion = lifecycleExclusion ?? amountExclusion;

    if (exclusion !== null) {
      exclusions[exclusion] += 1;
      continue;
    }

    contributions.push(toContribution(record));
  }

  const dimensions: readonly ProfitabilityBreakdownDimension[] = [
    'CASE',
    'CUSTOMER',
    'PROJECT',
    'OWNER',
    'PERIOD',
  ];
  const breakdowns = Object.fromEntries(
    dimensions.map((dimension) => [
      dimension,
      buildBreakdown(contributions, dimension),
    ]),
  ) as OperationalProfitabilityResult['breakdowns'];

  return {
    asOf,
    filters,
    inclusionRules: OPERATIONAL_PROFITABILITY_INCLUSION_RULES,
    currencies: summarizeContributions(contributions),
    contributions,
    breakdowns,
    quality: {
      sourceRecordCount: records.length,
      includedRecordCount: contributions.length,
      excludedRecordCount: records.length - contributions.length,
      exclusions,
    },
  };
}
