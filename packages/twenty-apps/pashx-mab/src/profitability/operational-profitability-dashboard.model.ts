import { calculateGrossMarginBasisPoints } from './aggregate-operational-profitability';
import {
  PROFITABILITY_EXCLUSION_REASONS,
  type OperationalProfitabilityResult,
  type ProfitabilityBreakdownRow,
  type ProfitabilityContribution,
  type ProfitabilityCurrencySummary,
  type ProfitabilityExclusionReason,
  type ProfitabilityFilters,
} from './operational-profitability.types';

const BIGINT_ZERO = BigInt(0);
const MICROS_PER_CENT = BigInt(10_000);
const CENTS_PER_UNIT = BigInt(100);

export type DashboardFilterSelection = Readonly<{
  startDate: string;
  endDate: string;
  vendorRecordId?: string;
  customerRecordId?: string;
  projectName?: string;
  ownerRecordId?: string;
}>;

export type ProfitabilityMetric = Readonly<{
  key: 'REVENUE' | 'DIRECT_COST' | 'GROSS_PROFIT' | 'GROSS_MARGIN';
  label: string;
  value: bigint | null;
  previousValue: bigint | null;
  valueType: 'MONEY' | 'MARGIN';
  higherIsFavorable: boolean;
  contributionCount: number;
}>;

export type ProfitabilityMetricComparison = Readonly<{
  kind:
    | 'NO_COMPARABLE_PRIOR_MARGIN'
    | 'NO_CHANGE'
    | 'NO_POSITIVE_PRIOR_BASELINE'
    | 'PERCENT_CHANGE'
    | 'POINT_CHANGE';
  direction: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  signedChangeBasisPoints?: bigint;
}>;

export type ProfitabilityTrendPoint = Readonly<{
  period: string;
  revenueMicros: bigint;
  directCostMicros: bigint;
  grossProfitMicros: bigint;
  contributionCount: number;
}>;

export type ProfitabilityEvidenceRow = Readonly<{
  reason: ProfitabilityExclusionReason;
  label: string;
  count: number;
}>;

const EXCLUSION_LABELS: Readonly<Record<ProfitabilityExclusionReason, string>> =
  {
    OUTSIDE_PERIOD: 'Outside selected period',
    FILTERED_OUT: 'Outside selected dimensions',
    MISSING_CASE: 'Missing procurement case',
    MISSING_DATE: 'Missing reporting date',
    MISSING_AMOUNT: 'Missing amount',
    UNSAFE_AMOUNT: 'Unsafe amount boundary',
    INVALID_CURRENCY: 'Invalid or missing currency',
    DRAFT: 'Draft documents',
    CANCELLED: 'Cancelled documents',
    CREDITED: 'Credited originals',
    ZATCA_PENDING: 'ZATCA pending',
    ZATCA_REJECTED: 'ZATCA rejected',
    UNSUPPORTED_DOCUMENT_TYPE: 'Unsupported document type',
    EXPENSE_PENDING: 'Pending direct expenses',
    EXPENSE_REJECTED: 'Rejected direct expenses',
  };

const parseIsoDay = (value: string): Date => {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(parsed.getTime()) ||
    toIsoDay(parsed) !== value
  ) {
    throw new Error(`Invalid dashboard date: ${value}`);
  }

  return parsed;
};

function toIsoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

const addUtcDays = (value: Date, days: number): Date => {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

export const getDefaultDashboardPeriod = (
  now: Date,
): Pick<DashboardFilterSelection, 'startDate' | 'endDate'> => ({
  startDate: `${now.getUTCFullYear()}-01-01`,
  endDate: toIsoDay(now),
});

export const toProfitabilityFilters = (
  selection: DashboardFilterSelection,
): ProfitabilityFilters => {
  const start = parseIsoDay(selection.startDate);
  const end = parseIsoDay(selection.endDate);

  if (start > end) {
    throw new Error('The dashboard start date must not be after the end date.');
  }

  return {
    periodStart: selection.startDate,
    periodEndExclusive: toIsoDay(addUtcDays(end, 1)),
    ...(selection.vendorRecordId === undefined
      ? {}
      : { vendorRecordIds: [selection.vendorRecordId] }),
    ...(selection.customerRecordId === undefined
      ? {}
      : { customerRecordIds: [selection.customerRecordId] }),
    ...(selection.projectName === undefined
      ? {}
      : { projectNames: [selection.projectName] }),
    ...(selection.ownerRecordId === undefined
      ? {}
      : { ownerRecordIds: [selection.ownerRecordId] }),
  };
};

export const getEqualDurationPriorFilters = (
  current: ProfitabilityFilters,
): ProfitabilityFilters => {
  const start = parseIsoDay(current.periodStart);
  const endExclusive = parseIsoDay(current.periodEndExclusive);
  const durationDays = Math.round(
    (endExclusive.getTime() - start.getTime()) / 86_400_000,
  );
  const priorEndExclusive = start;
  const priorStart = addUtcDays(priorEndExclusive, -durationDays);

  return {
    ...current,
    periodStart: toIsoDay(priorStart),
    periodEndExclusive: toIsoDay(priorEndExclusive),
  };
};

export const getPeriodDayCount = (filters: ProfitabilityFilters): number =>
  Math.round(
    (parseIsoDay(filters.periodEndExclusive).getTime() -
      parseIsoDay(filters.periodStart).getTime()) /
      86_400_000,
  );

export const findCurrencySummary = (
  result: OperationalProfitabilityResult,
  currencyCode: string,
): ProfitabilityCurrencySummary | null =>
  result.currencies.find((summary) => summary.currencyCode === currencyCode) ??
  null;

export const getAvailableCurrencies = (
  current: OperationalProfitabilityResult,
  previous: OperationalProfitabilityResult,
): readonly string[] =>
  [
    ...new Set(
      [
        ...current.currencies,
        ...previous.currencies,
        ...(current.cashFlow?.currencies ?? []),
        ...(previous.cashFlow?.currencies ?? []),
      ].map(({ currencyCode }) => currencyCode),
    ),
  ].sort();

const countContributions = (
  result: OperationalProfitabilityResult,
  currencyCode: string,
  kind: ProfitabilityContribution['kind'] | 'ALL',
): number =>
  result.contributions.filter(
    (contribution) =>
      contribution.currencyCode === currencyCode &&
      (kind === 'ALL' || contribution.kind === kind),
  ).length;

export const buildProfitabilityMetrics = ({
  current,
  previous,
  currencyCode,
}: {
  current: OperationalProfitabilityResult;
  previous: OperationalProfitabilityResult;
  currencyCode: string;
}): readonly ProfitabilityMetric[] => {
  const currentSummary = findCurrencySummary(current, currencyCode);
  const previousSummary = findCurrencySummary(previous, currencyCode);

  return [
    {
      key: 'REVENUE',
      label: 'Finalized revenue',
      value: currentSummary?.finalizedRevenueMicros ?? BIGINT_ZERO,
      previousValue: previousSummary?.finalizedRevenueMicros ?? BIGINT_ZERO,
      valueType: 'MONEY',
      higherIsFavorable: true,
      contributionCount: countContributions(current, currencyCode, 'REVENUE'),
    },
    {
      key: 'DIRECT_COST',
      label: 'Direct cost',
      value: currentSummary?.directCostMicros ?? BIGINT_ZERO,
      previousValue: previousSummary?.directCostMicros ?? BIGINT_ZERO,
      valueType: 'MONEY',
      higherIsFavorable: false,
      contributionCount:
        countContributions(current, currencyCode, 'DIRECT_COST_DOCUMENT') +
        countContributions(current, currencyCode, 'DIRECT_COST_EXPENSE'),
    },
    {
      key: 'GROSS_PROFIT',
      label: 'Gross profit',
      value: currentSummary?.grossProfitMicros ?? BIGINT_ZERO,
      previousValue: previousSummary?.grossProfitMicros ?? BIGINT_ZERO,
      valueType: 'MONEY',
      higherIsFavorable: true,
      contributionCount: countContributions(current, currencyCode, 'ALL'),
    },
    {
      key: 'GROSS_MARGIN',
      label: 'Gross margin',
      value: currentSummary?.grossMarginBasisPoints ?? null,
      previousValue: previousSummary?.grossMarginBasisPoints ?? null,
      valueType: 'MARGIN',
      higherIsFavorable: true,
      contributionCount: countContributions(current, currencyCode, 'ALL'),
    },
  ];
};

const groupDigits = (value: string): string =>
  value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const formatMoneyMicros = (
  amountMicros: bigint,
  currencyCode: string,
): string => {
  const isNegative = amountMicros < BIGINT_ZERO;
  const absoluteMicros = isNegative ? -amountMicros : amountMicros;
  const roundedCents =
    (absoluteMicros + MICROS_PER_CENT / BigInt(2)) / MICROS_PER_CENT;
  const units = roundedCents / CENTS_PER_UNIT;
  const cents = (roundedCents % CENTS_PER_UNIT).toString().padStart(2, '0');

  return `${currencyCode} ${isNegative ? '−' : ''}${groupDigits(units.toString())}.${cents}`;
};

export const formatMarginBasisPoints = (basisPoints: bigint | null): string => {
  if (basisPoints === null) return 'Not applicable';

  const isNegative = basisPoints < BIGINT_ZERO;
  const absolute = isNegative ? -basisPoints : basisPoints;
  const percentage = absolute / CENTS_PER_UNIT;
  const hundredths = (absolute % CENTS_PER_UNIT).toString().padStart(2, '0');

  return `${isNegative ? '−' : ''}${percentage}.${hundredths}%`;
};

export const getMetricComparisonData = (
  metric: ProfitabilityMetric,
): ProfitabilityMetricComparison => {
  if (metric.value === null || metric.previousValue === null) {
    return { kind: 'NO_COMPARABLE_PRIOR_MARGIN', direction: 'NEUTRAL' };
  }

  const difference = metric.value - metric.previousValue;

  if (difference === BIGINT_ZERO) {
    return { kind: 'NO_CHANGE', direction: 'NEUTRAL' };
  }

  const favorable = metric.higherIsFavorable
    ? difference > BIGINT_ZERO
    : difference < BIGINT_ZERO;

  if (metric.valueType === 'MARGIN') {
    return {
      kind: 'POINT_CHANGE',
      direction: favorable ? 'POSITIVE' : 'NEGATIVE',
      signedChangeBasisPoints: difference,
    };
  }

  if (metric.previousValue <= BIGINT_ZERO) {
    return {
      kind: 'NO_POSITIVE_PRIOR_BASELINE',
      direction: favorable ? 'POSITIVE' : 'NEGATIVE',
    };
  }

  const changeBasisPoints = calculateGrossMarginBasisPoints({
    finalizedRevenueMicros: metric.previousValue,
    grossProfitMicros: difference,
  });
  const absolute =
    changeBasisPoints === null || changeBasisPoints >= BIGINT_ZERO
      ? changeBasisPoints
      : -changeBasisPoints;

  if (absolute === null) {
    return { kind: 'NO_POSITIVE_PRIOR_BASELINE', direction: 'NEUTRAL' };
  }

  return {
    kind: 'PERCENT_CHANGE',
    direction: favorable ? 'POSITIVE' : 'NEGATIVE',
    signedChangeBasisPoints: changeBasisPoints!,
  };
};

const formatSignedBasisPoints = (value: bigint): string => {
  const absolute = value < BIGINT_ZERO ? -value : value;
  return `${value > BIGINT_ZERO ? '+' : '−'}${formatMarginBasisPoints(absolute)}`;
};

export const getMetricComparison = (
  metric: ProfitabilityMetric,
): Readonly<{
  copy: string;
  direction: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}> => {
  const comparison = getMetricComparisonData(metric);

  switch (comparison.kind) {
    case 'NO_COMPARABLE_PRIOR_MARGIN':
      return {
        copy: 'No comparable prior margin',
        direction: comparison.direction,
      };
    case 'NO_CHANGE':
      return {
        copy: 'No change vs prior period',
        direction: comparison.direction,
      };
    case 'NO_POSITIVE_PRIOR_BASELINE':
      return {
        copy: 'No positive prior-period baseline',
        direction: comparison.direction,
      };
    case 'PERCENT_CHANGE':
      return {
        copy: `${formatSignedBasisPoints(comparison.signedChangeBasisPoints!)} vs prior period`,
        direction: comparison.direction,
      };
    case 'POINT_CHANGE': {
      const formatted = formatSignedBasisPoints(
        comparison.signedChangeBasisPoints!,
      );
      return {
        copy: `${formatted.slice(0, -1)} pp vs prior period`,
        direction: comparison.direction,
      };
    }
  }
};

export const getTrendPoints = (
  result: OperationalProfitabilityResult,
  currencyCode: string,
): readonly ProfitabilityTrendPoint[] =>
  result.breakdowns.PERIOD.filter(
    (row) => row.summary.currencyCode === currencyCode,
  )
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((row) => ({
      period: row.key,
      revenueMicros: row.summary.finalizedRevenueMicros,
      directCostMicros: row.summary.directCostMicros,
      grossProfitMicros: row.summary.grossProfitMicros,
      contributionCount: row.summary.contributionRecordIds.length,
    }));

const absoluteBigInt = (value: bigint): bigint =>
  value < BIGINT_ZERO ? -value : value;

export const getRankedCaseRows = (
  result: OperationalProfitabilityResult,
  currencyCode: string,
): readonly ProfitabilityBreakdownRow[] =>
  result.breakdowns.CASE.filter(
    (row) => row.summary.currencyCode === currencyCode,
  ).sort((left, right) => {
    const leftValue = absoluteBigInt(left.summary.grossProfitMicros);
    const rightValue = absoluteBigInt(right.summary.grossProfitMicros);
    return leftValue === rightValue ? 0 : leftValue > rightValue ? -1 : 1;
  });

export const getRankedContributions = (
  result: OperationalProfitabilityResult,
  currencyCode: string,
): readonly ProfitabilityContribution[] =>
  result.contributions
    .filter((contribution) => contribution.currencyCode === currencyCode)
    .sort((left, right) => {
      const leftValue = absoluteBigInt(left.signedAmountMicros);
      const rightValue = absoluteBigInt(right.signedAmountMicros);
      if (leftValue !== rightValue) return leftValue > rightValue ? -1 : 1;
      return right.occurredOn.localeCompare(left.occurredOn);
    });

export const getEvidenceRows = (
  result: OperationalProfitabilityResult,
): readonly ProfitabilityEvidenceRow[] =>
  PROFITABILITY_EXCLUSION_REASONS.map((reason) => ({
    reason,
    label: EXCLUSION_LABELS[reason],
    count: result.quality.exclusions[reason],
  }));

export const getRelativeBarWidth = (
  value: bigint,
  values: readonly bigint[],
): number => {
  const absoluteValue = absoluteBigInt(value);
  const maximum = values.reduce(
    (largest, candidate) =>
      absoluteBigInt(candidate) > largest ? absoluteBigInt(candidate) : largest,
    BIGINT_ZERO,
  );

  if (maximum === BIGINT_ZERO || absoluteValue === BIGINT_ZERO) return 0;

  const scaled = Number((absoluteValue * BigInt(10_000)) / maximum) / 100;
  return Math.max(4, Math.min(100, scaled));
};

export const getTrendPolylinePoints = (
  values: readonly bigint[],
  width = 640,
  height = 180,
  domainValues: readonly bigint[] = values,
): string => {
  if (values.length === 0) return '';

  const minimum = domainValues.reduce((lowest, value) =>
    value < lowest ? value : lowest,
  );
  const maximum = domainValues.reduce((highest, value) =>
    value > highest ? value : highest,
  );
  const range = maximum - minimum;

  return values
    .map((value, index) => {
      const x =
        values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const ratio =
        range === BIGINT_ZERO
          ? 0.5
          : Number(((value - minimum) * BigInt(10_000)) / range) / 10_000;
      const y = height - ratio * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
};

export const isDashboardResultEmpty = (
  result: OperationalProfitabilityResult,
): boolean =>
  result.quality.includedRecordCount === 0 &&
  (result.cashFlow?.quality.includedRecordCount ?? 0) === 0;

export const countVisibleCurrencyRecords = (
  result: OperationalProfitabilityResult,
  currencyCode: string,
): number => countContributions(result, currencyCode, 'ALL');

export const getCurrencyConversionLabel = (): string =>
  'None — currencies remain separated';

export const hasPartialEvidence = (
  result: OperationalProfitabilityResult,
): boolean => result.quality.excludedRecordCount > 0;
