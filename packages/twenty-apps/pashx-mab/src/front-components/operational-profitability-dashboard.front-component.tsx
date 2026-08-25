import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS } from 'pashx-mab-contract';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useColorScheme, useLocale } from 'twenty-sdk/front-component';
import { getPublicAssetUrl } from 'twenty-sdk/utils';

import {
  formatDashboardCount,
  formatDashboardDate,
  formatDashboardDateTime,
  operationalProfitabilityDashboardCopy,
  toDashboardLocale,
  type DashboardCopy,
  type DashboardLocale,
} from './operational-profitability-dashboard.copy';
import {
  getOperationalProfitabilityDashboardFontStyles,
  operationalProfitabilityDashboardStyles,
} from './operational-profitability-dashboard.styles';
import {
  buildProfitabilityMetrics,
  countVisibleCurrencyRecords,
  findCurrencySummary,
  formatMarginBasisPoints,
  formatMoneyMicros,
  getAvailableCurrencies,
  getDefaultDashboardPeriod,
  getEqualDurationPriorFilters,
  getEvidenceRows,
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
  type DashboardFilterSelection,
  type ProfitabilityMetric,
  type ProfitabilityMetricComparison,
  type ProfitabilityTrendPoint,
} from '../profitability/operational-profitability-dashboard.model';
import { loadOperationalProfitability } from '../profitability/load-operational-profitability';
import {
  type OperationalProfitabilityResult,
  type ProfitabilityBreakdownRow,
  type ProfitabilityContribution,
  type VerifiedCashFlowResult,
} from '../profitability/operational-profitability.types';

type DashboardData = Readonly<{
  current: OperationalProfitabilityResult;
  previous: OperationalProfitabilityResult;
}>;

type FilterOption = Readonly<{ value: string; label: string }>;

type DimensionOptions = Readonly<{
  cases: readonly FilterOption[];
  customers: readonly FilterOption[];
  projects: readonly FilterOption[];
  owners: readonly FilterOption[];
}>;

const EMPTY_OPTIONS: DimensionOptions = {
  cases: [],
  customers: [],
  projects: [],
  owners: [],
};

const DASHBOARD_SKELETON_FILTERS = [
  'period-start',
  'period-end',
  'case',
  'customer',
  'project',
  'owner',
  'currency',
] as const;

const DASHBOARD_SKELETON_KPIS = [
  'revenue',
  'cost',
  'profit',
  'margin',
] as const;

const getSelectedOptionLabel = (
  options: readonly FilterOption[],
  selectedValue: string,
): string =>
  options.find(({ value }) => value === selectedValue)?.label ?? selectedValue;

const mergeOptions = (
  current: readonly FilterOption[],
  additions: readonly FilterOption[],
): readonly FilterOption[] =>
  [
    ...new Map(
      [...current, ...additions].map((option) => [option.value, option]),
    ).values(),
  ].sort((left, right) => left.label.localeCompare(right.label));

const getOptionsFromBreakdown = (
  rows: readonly ProfitabilityBreakdownRow[],
): readonly FilterOption[] =>
  rows.map(({ key, label }) => ({ value: key, label }));

const formatSignedBasisPointValue = (
  value: bigint,
  unit: 'PERCENT' | 'POINTS',
): string => {
  const absolute = value < BigInt(0) ? -value : value;
  const formatted = formatMarginBasisPoints(absolute);
  const numeric = unit === 'POINTS' ? formatted.slice(0, -1) : formatted;
  return `${value > BigInt(0) ? '+' : '−'}${numeric}`;
};

const formatLocalizedComparison = (
  comparison: ProfitabilityMetricComparison,
  copy: DashboardCopy,
): string => {
  switch (comparison.kind) {
    case 'NO_COMPARABLE_PRIOR_MARGIN':
      return copy.noComparablePriorMargin;
    case 'NO_CHANGE':
      return copy.noChange;
    case 'NO_POSITIVE_PRIOR_BASELINE':
      return copy.noPositivePriorBaseline;
    case 'PERCENT_CHANGE':
      return copy.percentChange(
        formatSignedBasisPointValue(
          comparison.signedChangeBasisPoints!,
          'PERCENT',
        ),
      );
    case 'POINT_CHANGE':
      return copy.pointChange(
        formatSignedBasisPointValue(
          comparison.signedChangeBasisPoints!,
          'POINTS',
        ),
      );
  }
};

const MetricLedger = ({
  metrics,
  currencyCode,
  copy,
  locale,
}: {
  metrics: readonly ProfitabilityMetric[];
  currencyCode: string;
  copy: DashboardCopy;
  locale: DashboardLocale;
}) => (
  <section className="pxd-dashboard__kpis" aria-label={copy.totalsLabel}>
    {metrics.map((metric) => {
      const comparison = getMetricComparisonData(metric);
      const value =
        metric.valueType === 'MONEY'
          ? formatMoneyMicros(metric.value ?? BigInt(0), currencyCode)
          : formatMarginBasisPoints(metric.value);

      return (
        <article className="pxd-dashboard__kpi" key={metric.key}>
          <span className="pxd-dashboard__kpi-label">
            {copy.metricLabels[metric.key]}
          </span>
          <strong className="pxd-dashboard__kpi-value pxd-dashboard__isolate">
            {value}
          </strong>
          <span
            className={`pxd-dashboard__delta pxd-dashboard__delta--${comparison.direction.toLowerCase()}`}
          >
            {formatLocalizedComparison(comparison, copy)}
          </span>
          <a className="pxd-dashboard__evidence-link" href="#evidence-records">
            {copy.contributingRecords(
              formatDashboardCount(metric.contributionCount, locale),
            )}
          </a>
        </article>
      );
    })}
  </section>
);

const TrendChart = ({
  points,
  currencyCode,
  copy,
  locale,
}: {
  points: readonly ProfitabilityTrendPoint[];
  currencyCode: string;
  copy: DashboardCopy;
  locale: DashboardLocale;
}) => {
  const revenueValues = points.map(({ revenueMicros }) => revenueMicros);
  const costValues = points.map(({ directCostMicros }) => directCostMicros);
  const sharedDomain = [...revenueValues, ...costValues, BigInt(0)];
  const revenuePolyline = getTrendPolylinePoints(
    revenueValues,
    640,
    180,
    sharedDomain,
  );
  const costPolyline = getTrendPolylinePoints(
    costValues,
    640,
    180,
    sharedDomain,
  );

  if (points.length === 0) {
    return (
      <div className="pxd-dashboard__state" style={{ minHeight: 250 }}>
        <h2>{copy.noTrendTitle}</h2>
        <p>{copy.noTrendBody}</p>
      </div>
    );
  }

  return (
    <>
      <div className="pxd-dashboard__chart">
        <svg
          aria-label={copy.chartAccessibleLabel(currencyCode)}
          direction="ltr"
          role="img"
          viewBox="0 0 640 210"
        >
          <line
            className="pxd-dashboard__chart-grid"
            x1="0"
            x2="640"
            y1="0"
            y2="0"
          />
          <line
            className="pxd-dashboard__chart-grid"
            x1="0"
            x2="640"
            y1="90"
            y2="90"
          />
          <line
            className="pxd-dashboard__chart-grid"
            x1="0"
            x2="640"
            y1="180"
            y2="180"
          />
          <polyline
            className="pxd-dashboard__chart-revenue"
            points={revenuePolyline}
          />
          <polyline
            className="pxd-dashboard__chart-cost"
            points={costPolyline}
          />
          <text className="pxd-dashboard__chart-label" x="0" y="204">
            {points[0]?.period}
          </text>
          <text
            className="pxd-dashboard__chart-label"
            textAnchor="end"
            x="640"
            y="204"
          >
            {points[points.length - 1]?.period}
          </text>
        </svg>
      </div>
      <details className="pxd-dashboard__rules">
        <summary>{copy.exactMonthlyValues}</summary>
        <div className="pxd-dashboard__table-wrap">
          <table className="pxd-dashboard__table">
            <thead>
              <tr>
                <th>{copy.period}</th>
                <th data-numeric>{copy.chartRevenue}</th>
                <th data-numeric>{copy.chartDirectCost}</th>
                <th data-numeric>{copy.grossProfit}</th>
                <th data-numeric>{copy.records}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.period}>
                  <td className="pxd-dashboard__isolate">{point.period}</td>
                  <td data-numeric>
                    {formatMoneyMicros(point.revenueMicros, currencyCode)}
                  </td>
                  <td data-numeric>
                    {formatMoneyMicros(point.directCostMicros, currencyCode)}
                  </td>
                  <td data-numeric>
                    {formatMoneyMicros(point.grossProfitMicros, currencyCode)}
                  </td>
                  <td data-numeric>
                    {formatDashboardCount(point.contributionCount, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
};

const CashFlowPanel = ({
  cashFlow,
  currencyCode,
  copy,
  locale,
}: {
  cashFlow: VerifiedCashFlowResult | undefined;
  currencyCode: string;
  copy: DashboardCopy;
  locale: DashboardLocale;
}) => {
  const summary = cashFlow?.currencies.find(
    (candidate) => candidate.currencyCode === currencyCode,
  );
  const points = (cashFlow?.trend ?? []).filter(
    (point) => point.currencyCode === currencyCode,
  );
  const inflowValues = points.map(({ inflowMicros }) => inflowMicros);
  const outflowValues = points.map(({ outflowMicros }) => outflowMicros);
  const sharedDomain = [...inflowValues, ...outflowValues, BigInt(0)];
  const inflowPolyline = getTrendPolylinePoints(
    inflowValues,
    640,
    180,
    sharedDomain,
  );
  const outflowPolyline = getTrendPolylinePoints(
    outflowValues,
    640,
    180,
    sharedDomain,
  );
  const excludedCount = cashFlow?.quality.excludedRecordCount ?? 0;

  return (
    <section className="pxd-dashboard__panel" aria-labelledby="cash-flow-title">
      <div className="pxd-dashboard__panel-header">
        <div>
          <h2 className="pxd-dashboard__panel-title" id="cash-flow-title">
            {copy.cashTitle}
          </h2>
          <p className="pxd-dashboard__panel-subtitle">{copy.cashSubtitle}</p>
        </div>
        <div className="pxd-dashboard__legend" aria-label={copy.chartLegend}>
          <span className="pxd-dashboard__legend-item">
            <i aria-hidden="true" className="pxd-dashboard__legend-line" />{' '}
            {copy.cashInflow}
          </span>
          <span className="pxd-dashboard__legend-item">
            <i
              aria-hidden="true"
              className="pxd-dashboard__legend-line pxd-dashboard__legend-line--cash-out"
            />{' '}
            {copy.cashOutflow}
          </span>
        </div>
      </div>
      <div className="pxd-dashboard__cash-boundary" role="note">
        {copy.cashBoundary}
      </div>

      {summary === undefined ? (
        <div className="pxd-dashboard__cash-empty">
          <div>
            <h3>{copy.cashEmptyTitle}</h3>
            <p>{copy.cashEmptyBody}</p>
          </div>
          <dl className="pxd-dashboard__cash-metrics">
            {[copy.cashInflow, copy.cashOutflow, copy.netCash].map((label) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{copy.cashNotRecorded}</dd>
              </div>
            ))}
          </dl>
          {excludedCount > 0 ? (
            <p className="pxd-dashboard__cash-excluded">
              {copy.cashExcluded(formatDashboardCount(excludedCount, locale))}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="pxd-dashboard__panel-body">
          <dl className="pxd-dashboard__cash-metrics">
            <div>
              <dt>{copy.cashInflow}</dt>
              <dd>{formatMoneyMicros(summary.inflowMicros, currencyCode)}</dd>
            </div>
            <div>
              <dt>{copy.cashOutflow}</dt>
              <dd>{formatMoneyMicros(summary.outflowMicros, currencyCode)}</dd>
            </div>
            <div>
              <dt>{copy.netCash}</dt>
              <dd>{formatMoneyMicros(summary.netCashMicros, currencyCode)}</dd>
            </div>
          </dl>
          <div className="pxd-dashboard__chart">
            <svg
              aria-label={copy.cashChartAccessibleLabel(currencyCode)}
              direction="ltr"
              role="img"
              viewBox="0 0 640 210"
            >
              <line
                className="pxd-dashboard__chart-grid"
                x1="0"
                x2="640"
                y1="0"
                y2="0"
              />
              <line
                className="pxd-dashboard__chart-grid"
                x1="0"
                x2="640"
                y1="90"
                y2="90"
              />
              <line
                className="pxd-dashboard__chart-grid"
                x1="0"
                x2="640"
                y1="180"
                y2="180"
              />
              <polyline
                className="pxd-dashboard__chart-revenue"
                points={inflowPolyline}
              />
              <polyline
                className="pxd-dashboard__chart-cash-out"
                points={outflowPolyline}
              />
              <text className="pxd-dashboard__chart-label" x="0" y="204">
                {points[0]?.period}
              </text>
              <text
                className="pxd-dashboard__chart-label"
                textAnchor="end"
                x="640"
                y="204"
              >
                {points[points.length - 1]?.period}
              </text>
            </svg>
          </div>
          <details className="pxd-dashboard__rules">
            <summary>{copy.exactCashValues}</summary>
            <div className="pxd-dashboard__table-wrap">
              <table className="pxd-dashboard__table">
                <thead>
                  <tr>
                    <th>{copy.period}</th>
                    <th data-numeric>{copy.cashInflow}</th>
                    <th data-numeric>{copy.cashOutflow}</th>
                    <th data-numeric>{copy.netCash}</th>
                    <th data-numeric>{copy.records}</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((point) => (
                    <tr key={point.period}>
                      <td className="pxd-dashboard__isolate">{point.period}</td>
                      <td data-numeric>
                        {formatMoneyMicros(point.inflowMicros, currencyCode)}
                      </td>
                      <td data-numeric>
                        {formatMoneyMicros(point.outflowMicros, currencyCode)}
                      </td>
                      <td data-numeric>
                        {formatMoneyMicros(point.netCashMicros, currencyCode)}
                      </td>
                      <td data-numeric>
                        {formatDashboardCount(
                          point.contributionRecordIds.length,
                          locale,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          {excludedCount > 0 ? (
            <p className="pxd-dashboard__cash-excluded">
              {copy.cashExcluded(formatDashboardCount(excludedCount, locale))}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
};

const EvidenceCoverage = ({
  result,
  copy,
  locale,
}: {
  result: OperationalProfitabilityResult;
  copy: DashboardCopy;
  locale: DashboardLocale;
}) => {
  const evidenceRows = getEvidenceRows(result);

  return (
    <section
      className="pxd-dashboard__panel"
      aria-labelledby="evidence-coverage-title"
    >
      <div className="pxd-dashboard__panel-header">
        <div>
          <h2
            className="pxd-dashboard__panel-title"
            id="evidence-coverage-title"
          >
            {copy.evidenceTitle}
          </h2>
          <p className="pxd-dashboard__panel-subtitle">
            {copy.evidenceSubtitle}
          </p>
        </div>
      </div>
      <div className="pxd-dashboard__quality-summary">
        <div className="pxd-dashboard__quality-stat">
          <strong className="pxd-dashboard__quality-value">
            {formatDashboardCount(result.quality.sourceRecordCount, locale)}
          </strong>
          <span className="pxd-dashboard__quality-label">{copy.source}</span>
        </div>
        <div className="pxd-dashboard__quality-stat">
          <strong className="pxd-dashboard__quality-value">
            {formatDashboardCount(result.quality.includedRecordCount, locale)}
          </strong>
          <span className="pxd-dashboard__quality-label">{copy.included}</span>
        </div>
        <div className="pxd-dashboard__quality-stat">
          <strong className="pxd-dashboard__quality-value">
            {formatDashboardCount(result.quality.excludedRecordCount, locale)}
          </strong>
          <span className="pxd-dashboard__quality-label">{copy.excluded}</span>
        </div>
      </div>
      <ul className="pxd-dashboard__evidence-list">
        {evidenceRows.map((row) => (
          <li className="pxd-dashboard__evidence-row" key={row.reason}>
            <span>{copy.exclusions[row.reason]}</span>
            <strong
              className={`pxd-dashboard__evidence-count${row.count > 0 ? ' pxd-dashboard__evidence-count--warning' : ''}`}
            >
              {formatDashboardCount(row.count, locale)}
            </strong>
          </li>
        ))}
      </ul>
      <div className="pxd-dashboard__evidence-row">
        <span>{copy.currencyConversion}</span>
        <strong>{copy.noCurrencyConversion}</strong>
      </div>
    </section>
  );
};

const MarginBridge = ({
  summary,
  currencyCode,
  copy,
}: {
  summary: ReturnType<typeof findCurrencySummary>;
  currencyCode: string;
  copy: DashboardCopy;
}) => {
  const rows = [
    {
      label: copy.finalizedRevenue,
      value: summary?.finalizedRevenueMicros ?? BigInt(0),
      kind: 'revenue',
    },
    {
      label: copy.lessDirectCost,
      value: summary?.directCostMicros ?? BigInt(0),
      kind: 'cost',
    },
    {
      label: copy.grossProfit,
      value: summary?.grossProfitMicros ?? BigInt(0),
      kind: 'profit',
    },
  ] as const;
  const values = rows.map(({ value }) => value);

  return (
    <section
      className="pxd-dashboard__panel"
      aria-labelledby="margin-bridge-title"
    >
      <div className="pxd-dashboard__panel-header">
        <div>
          <h2 className="pxd-dashboard__panel-title" id="margin-bridge-title">
            {copy.marginBridgeTitle}
          </h2>
          <p className="pxd-dashboard__panel-subtitle">
            {copy.marginBridgeSubtitle}
          </p>
        </div>
      </div>
      <div className="pxd-dashboard__panel-body">
        {rows.map((row) => (
          <div className="pxd-dashboard__bridge-row" key={row.label}>
            <div className="pxd-dashboard__bar-label">
              <span>{row.label}</span>
              <span className="pxd-dashboard__bar-value pxd-dashboard__isolate">
                {formatMoneyMicros(row.value, currencyCode)}
              </span>
            </div>
            <div className="pxd-dashboard__bar-track">
              <div
                className={`pxd-dashboard__bar-fill${row.kind === 'cost' ? ' pxd-dashboard__bar-fill--cost' : ''}${row.value < BigInt(0) ? ' pxd-dashboard__bar-fill--negative' : ''}`}
                style={{ width: `${getRelativeBarWidth(row.value, values)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const RankedCases = ({
  rows,
  currencyCode,
  copy,
}: {
  rows: readonly ProfitabilityBreakdownRow[];
  currencyCode: string;
  copy: DashboardCopy;
}) => {
  const visibleRows = rows.slice(0, 6);
  const values = visibleRows.map(({ summary }) => summary.grossProfitMicros);

  return (
    <section
      className="pxd-dashboard__panel"
      aria-labelledby="ranked-cases-title"
    >
      <div className="pxd-dashboard__panel-header">
        <div>
          <h2 className="pxd-dashboard__panel-title" id="ranked-cases-title">
            {copy.rankedCasesTitle}
          </h2>
          <p className="pxd-dashboard__panel-subtitle">
            {copy.rankedCasesSubtitle}
          </p>
        </div>
      </div>
      <div className="pxd-dashboard__panel-body">
        {visibleRows.length === 0 ? (
          <p className="pxd-dashboard__panel-subtitle">
            {copy.noCaseContributors}
          </p>
        ) : (
          visibleRows.map((row) => (
            <div
              className="pxd-dashboard__rank-row"
              key={`${row.key}-${row.summary.currencyCode}`}
            >
              <div className="pxd-dashboard__bar-label">
                <a
                  className="pxd-dashboard__record-link"
                  href={`/object/procurementCase/${row.key}`}
                  target="_top"
                >
                  {row.label}
                </a>
                <span className="pxd-dashboard__bar-value pxd-dashboard__isolate">
                  {formatMoneyMicros(
                    row.summary.grossProfitMicros,
                    currencyCode,
                  )}
                </span>
              </div>
              <div className="pxd-dashboard__bar-track">
                <div
                  className={`pxd-dashboard__bar-fill${row.summary.grossProfitMicros < BigInt(0) ? ' pxd-dashboard__bar-fill--negative' : ''}`}
                  style={{
                    width: `${getRelativeBarWidth(row.summary.grossProfitMicros, values)}%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

const EvidenceTable = ({
  contributions,
  currencyCode,
  copy,
  locale,
}: {
  contributions: readonly ProfitabilityContribution[];
  currencyCode: string;
  copy: DashboardCopy;
  locale: DashboardLocale;
}) => {
  const visibleContributions = contributions.slice(0, 100);

  return (
    <section
      className="pxd-dashboard__panel"
      id="evidence-records"
      aria-labelledby="records-title"
    >
      <div className="pxd-dashboard__panel-header">
        <div>
          <h2 className="pxd-dashboard__panel-title" id="records-title">
            {copy.ledgerTitle}
          </h2>
          <p className="pxd-dashboard__panel-subtitle">
            {copy.ledgerShowing(
              formatDashboardCount(visibleContributions.length, locale),
              formatDashboardCount(contributions.length, locale),
            )}
          </p>
        </div>
      </div>
      <div className="pxd-dashboard__table-wrap">
        <table className="pxd-dashboard__table">
          <thead>
            <tr>
              <th>{copy.record}</th>
              <th>{copy.type}</th>
              <th>{copy.case}</th>
              <th>{copy.date}</th>
              <th data-numeric>{copy.signedAmount}</th>
            </tr>
          </thead>
          <tbody>
            {visibleContributions.map((contribution) => (
              <tr key={`${contribution.sourceType}-${contribution.recordId}`}>
                <td>
                  <a
                    className="pxd-dashboard__record-link"
                    href={`/object/${contribution.sourceType === 'DOCUMENT' ? 'commercialDocument' : 'expense'}/${contribution.recordId}`}
                    target="_top"
                  >
                    {contribution.recordName}
                  </a>
                  <div className="pxd-dashboard__mono">
                    {contribution.recordId}
                  </div>
                </td>
                <td>{copy.contributionKinds[contribution.kind]}</td>
                <td>
                  <a
                    className="pxd-dashboard__record-link"
                    href={`/object/procurementCase/${contribution.caseDimension.caseRecordId}`}
                    target="_top"
                  >
                    {contribution.caseDimension.caseName}
                  </a>
                </td>
                <td className="pxd-dashboard__isolate">
                  {contribution.occurredOn}
                </td>
                <td data-numeric>
                  {formatMoneyMicros(
                    contribution.signedAmountMicros,
                    currencyCode,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const FilterSelect = ({
  id,
  label,
  value,
  options,
  onChange,
  allLabel,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly FilterOption[];
  onChange: (value: string) => void;
  allLabel: string;
}) => (
  <div className="pxd-dashboard__field">
    <label htmlFor={id}>{label}</label>
    <select
      className="pxd-dashboard__control"
      id={id}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const DashboardSkeleton = ({ copy }: { copy: DashboardCopy }) => (
  <section
    aria-live="polite"
    aria-label={copy.loading}
    className="pxd-dashboard__loading"
  >
    <p className="pxd-dashboard__loading-status">{copy.loading}</p>
    <div aria-hidden="true" className="pxd-dashboard__loading">
      <div className="pxd-dashboard__filters">
        {DASHBOARD_SKELETON_FILTERS.map((key) => (
          <div
            className="pxd-dashboard__skeleton-block pxd-dashboard__skeleton-control"
            key={key}
          />
        ))}
      </div>
      <div className="pxd-dashboard__skeleton-block pxd-dashboard__skeleton-context" />
      <div className="pxd-dashboard__kpis">
        {DASHBOARD_SKELETON_KPIS.map((key) => (
          <div
            className="pxd-dashboard__skeleton-block pxd-dashboard__skeleton-kpi"
            key={key}
          />
        ))}
      </div>
      <div className="pxd-dashboard__analysis-grid">
        <div className="pxd-dashboard__skeleton-block pxd-dashboard__skeleton-panel" />
        <div className="pxd-dashboard__skeleton-block pxd-dashboard__skeleton-panel" />
      </div>
      <div className="pxd-dashboard__secondary-grid">
        <div className="pxd-dashboard__skeleton-block pxd-dashboard__skeleton-secondary" />
        <div className="pxd-dashboard__skeleton-block pxd-dashboard__skeleton-secondary" />
      </div>
      <div className="pxd-dashboard__skeleton-block pxd-dashboard__skeleton-ledger" />
    </div>
  </section>
);

const OperationalProfitabilityDashboard = () => {
  const defaultPeriod = useMemo(
    () => getDefaultDashboardPeriod(new Date()),
    [],
  );
  const hostLocale = useLocale();
  const colorScheme = useColorScheme();
  const [localeOverride, setLocaleOverride] = useState<DashboardLocale | null>(
    null,
  );
  const locale = localeOverride ?? toDashboardLocale(hostLocale);
  const [startDate, setStartDate] = useState(defaultPeriod.startDate);
  const [endDate, setEndDate] = useState(defaultPeriod.endDate);
  const [caseRecordId, setCaseRecordId] = useState('');
  const [customerRecordId, setCustomerRecordId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [ownerRecordId, setOwnerRecordId] = useState('');
  const [currencyCode, setCurrencyCode] = useState('SAR');
  const [options, setOptions] = useState<DimensionOptions>(EMPTY_OPTIONS);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const copy = operationalProfitabilityDashboardCopy[locale];
  const fontStyles = getOperationalProfitabilityDashboardFontStyles({
    sansRegular: getPublicAssetUrl('fonts/ibm-plex/IBMPlexSans-Regular.woff2'),
    sansSemiBold: getPublicAssetUrl(
      'fonts/ibm-plex/IBMPlexSans-SemiBold.woff2',
    ),
    sansArabicRegular: getPublicAssetUrl(
      'fonts/ibm-plex/IBMPlexSansArabic-Regular.woff2',
    ),
    sansArabicSemiBold: getPublicAssetUrl(
      'fonts/ibm-plex/IBMPlexSansArabic-SemiBold.woff2',
    ),
    monoRegular: getPublicAssetUrl('fonts/ibm-plex/IBMPlexMono-Regular.woff2'),
  });

  useEffect(() => {
    setLocaleOverride(null);
  }, [hostLocale]);

  const selection = useMemo<DashboardFilterSelection>(
    () => ({
      startDate,
      endDate,
      ...(caseRecordId === '' ? {} : { caseRecordId }),
      ...(customerRecordId === '' ? {} : { customerRecordId }),
      ...(projectName === '' ? {} : { projectName }),
      ...(ownerRecordId === '' ? {} : { ownerRecordId }),
    }),
    [
      caseRecordId,
      customerRecordId,
      endDate,
      ownerRecordId,
      projectName,
      startDate,
    ],
  );

  const refresh = useCallback(async () => {
    const activeRequest = requestId.current + 1;
    requestId.current = activeRequest;
    setLoading(true);
    setError(null);

    try {
      const currentFilters = toProfitabilityFilters(selection);
      const previousFilters = getEqualDurationPriorFilters(currentFilters);
      const asOf = new Date();
      const now = () => asOf;
      const [current, previous] = await Promise.all([
        loadOperationalProfitability({ filters: currentFilters, now }),
        loadOperationalProfitability({ filters: previousFilters, now }),
      ]);

      if (requestId.current !== activeRequest) return;

      const currencies = getAvailableCurrencies(current, previous);
      setData({ current, previous });
      setCurrencyCode((selected) =>
        currencies.includes(selected)
          ? selected
          : (currencies.find((currency) => currency === 'SAR') ??
            currencies[0] ??
            'SAR'),
      );
      setOptions((currentOptions) => ({
        cases: mergeOptions(
          currentOptions.cases,
          getOptionsFromBreakdown(current.breakdowns.CASE),
        ),
        customers: mergeOptions(
          currentOptions.customers,
          getOptionsFromBreakdown(current.breakdowns.CUSTOMER),
        ),
        projects: mergeOptions(
          currentOptions.projects,
          getOptionsFromBreakdown(current.breakdowns.PROJECT),
        ),
        owners: mergeOptions(
          currentOptions.owners,
          getOptionsFromBreakdown(current.breakdowns.OWNER),
        ),
      }));
    } catch (loadError) {
      if (requestId.current !== activeRequest) return;
      setError(
        loadError instanceof Error ? loadError.message : String(loadError),
      );
    } finally {
      if (requestId.current === activeRequest) setLoading(false);
    }
  }, [selection]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetFilters = () => {
    const nextPeriod = getDefaultDashboardPeriod(new Date());
    setStartDate(nextPeriod.startDate);
    setEndDate(nextPeriod.endDate);
    setCaseRecordId('');
    setCustomerRecordId('');
    setProjectName('');
    setOwnerRecordId('');
  };

  const currencies =
    data === null ? [] : getAvailableCurrencies(data.current, data.previous);
  const currentSummary =
    data === null ? null : findCurrencySummary(data.current, currencyCode);
  const metrics =
    data === null
      ? []
      : buildProfitabilityMetrics({
          current: data.current,
          previous: data.previous,
          currencyCode,
        });
  const trendPoints =
    data === null ? [] : getTrendPoints(data.current, currencyCode);
  const caseRows =
    data === null ? [] : getRankedCaseRows(data.current, currencyCode);
  const contributions =
    data === null ? [] : getRankedContributions(data.current, currencyCode);
  const activeFilters = [
    {
      label: copy.period,
      value: `${formatDashboardDate(startDate, locale)} – ${formatDashboardDate(endDate, locale)}`,
      forceLeftToRight: true,
    },
    { label: copy.currency, value: currencyCode, forceLeftToRight: true },
    ...(caseRecordId === ''
      ? []
      : [
          {
            label: copy.case,
            value: getSelectedOptionLabel(options.cases, caseRecordId),
            forceLeftToRight: false,
          },
        ]),
    ...(customerRecordId === ''
      ? []
      : [
          {
            label: copy.customer,
            value: getSelectedOptionLabel(options.customers, customerRecordId),
            forceLeftToRight: false,
          },
        ]),
    ...(projectName === ''
      ? []
      : [
          {
            label: copy.project,
            value: getSelectedOptionLabel(options.projects, projectName),
            forceLeftToRight: false,
          },
        ]),
    ...(ownerRecordId === ''
      ? []
      : [
          {
            label: copy.owner,
            value: getSelectedOptionLabel(options.owners, ownerRecordId),
            forceLeftToRight: false,
          },
        ]),
  ];

  return (
    <div
      aria-label={copy.dashboardLabel}
      className="pxd-dashboard"
      data-color-scheme={colorScheme}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      lang={locale}
    >
      <style>{`${fontStyles}\n${operationalProfitabilityDashboardStyles}`}</style>
      <header className="pxd-dashboard__header">
        <div>
          <p className="pxd-dashboard__eyebrow">{copy.eyebrow}</p>
          <h1 className="pxd-dashboard__title">{copy.title}</h1>
          <p className="pxd-dashboard__subtitle">{copy.subtitle}</p>
        </div>
        <div className="pxd-dashboard__header-actions">
          <button
            aria-label={copy.languageButtonLabel}
            className="pxd-dashboard__language"
            lang={locale === 'ar' ? 'en' : 'ar'}
            onClick={() => setLocaleOverride(locale === 'en' ? 'ar' : 'en')}
            type="button"
          >
            {copy.languageName}
          </button>
          <button
            aria-busy={loading}
            className="pxd-dashboard__refresh"
            disabled={loading}
            onClick={() => void refresh()}
            type="button"
          >
            {loading ? copy.refreshing : copy.refresh}
          </button>
        </div>
      </header>

      <main aria-busy={loading} className="pxd-dashboard__content">
        {loading && data === null ? null : (
          <section
            className="pxd-dashboard__filters"
            aria-label={copy.filtersLabel}
          >
            <div className="pxd-dashboard__field">
              <label htmlFor="pxd-start-date">{copy.periodStart}</label>
              <input
                className="pxd-dashboard__control"
                id="pxd-start-date"
                onChange={(event) => setStartDate(event.target.value)}
                type="date"
                value={startDate}
              />
            </div>
            <div className="pxd-dashboard__field">
              <label htmlFor="pxd-end-date">{copy.periodEnd}</label>
              <input
                className="pxd-dashboard__control"
                id="pxd-end-date"
                onChange={(event) => setEndDate(event.target.value)}
                type="date"
                value={endDate}
              />
            </div>
            <FilterSelect
              allLabel={copy.all}
              id="pxd-case"
              label={copy.case}
              onChange={setCaseRecordId}
              options={options.cases}
              value={caseRecordId}
            />
            <FilterSelect
              allLabel={copy.all}
              id="pxd-customer"
              label={copy.customer}
              onChange={setCustomerRecordId}
              options={options.customers}
              value={customerRecordId}
            />
            <FilterSelect
              allLabel={copy.all}
              id="pxd-project"
              label={copy.project}
              onChange={setProjectName}
              options={options.projects}
              value={projectName}
            />
            <FilterSelect
              allLabel={copy.all}
              id="pxd-owner"
              label={copy.owner}
              onChange={setOwnerRecordId}
              options={options.owners}
              value={ownerRecordId}
            />
            <div className="pxd-dashboard__field">
              <label htmlFor="pxd-currency">{copy.currency}</label>
              <select
                className="pxd-dashboard__control pxd-dashboard__isolate"
                disabled={currencies.length === 0}
                id="pxd-currency"
                onChange={(event) => setCurrencyCode(event.target.value)}
                value={currencyCode}
              >
                {currencies.length === 0 ? (
                  <option value="SAR">{copy.noCurrency}</option>
                ) : null}
                {currencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
          </section>
        )}

        {data !== null ? (
          <section
            className="pxd-dashboard__context"
            aria-label={copy.methodStrong}
          >
            <p className="pxd-dashboard__context-copy">
              <strong>{copy.methodStrong}</strong> {copy.methodBody}
            </p>
            <div className="pxd-dashboard__context-meta">
              <span className="pxd-dashboard__as-of">
                {copy.asOf(
                  formatDashboardDateTime(data.current.asOf, locale),
                  formatDashboardCount(
                    getPeriodDayCount(data.current.filters),
                    locale,
                  ),
                )}
              </span>
              <div
                aria-label={copy.activeFiltersLabel}
                className="pxd-dashboard__active-filters"
              >
                {activeFilters.map((filter) => (
                  <span
                    className="pxd-dashboard__active-filter"
                    key={filter.label}
                  >
                    {filter.label}:{' '}
                    <bdi
                      className={
                        filter.forceLeftToRight
                          ? 'pxd-dashboard__isolate'
                          : undefined
                      }
                    >
                      {filter.value}
                    </bdi>
                  </span>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {error !== null && data !== null ? (
          <div className="pxd-dashboard__partial" role="alert">
            {copy.staleRefreshError(error)}
          </div>
        ) : null}

        {loading && data === null ? <DashboardSkeleton copy={copy} /> : null}

        {error !== null && data === null ? (
          <section className="pxd-dashboard__state" role="alert">
            <h2>{copy.errorTitle}</h2>
            <p className="pxd-dashboard__isolate">{error}</p>
            <button
              className="pxd-dashboard__refresh"
              onClick={() => void refresh()}
              type="button"
            >
              {copy.retry}
            </button>
          </section>
        ) : null}

        {data !== null && isDashboardResultEmpty(data.current) ? (
          <section className="pxd-dashboard__state">
            <h2>{copy.emptyTitle}</h2>
            <p>{copy.emptyBody}</p>
            <button
              className="pxd-dashboard__refresh"
              onClick={resetFilters}
              type="button"
            >
              {copy.resetFilters}
            </button>
          </section>
        ) : null}

        {data !== null && !isDashboardResultEmpty(data.current) ? (
          <>
            {hasPartialEvidence(data.current) ? (
              <div className="pxd-dashboard__partial" role="status">
                {copy.partialEvidence(
                  formatDashboardCount(
                    data.current.quality.excludedRecordCount,
                    locale,
                  ),
                )}
              </div>
            ) : null}

            <MetricLedger
              copy={copy}
              currencyCode={currencyCode}
              locale={locale}
              metrics={metrics}
            />

            <CashFlowPanel
              cashFlow={data.current.cashFlow}
              copy={copy}
              currencyCode={currencyCode}
              locale={locale}
            />

            <div className="pxd-dashboard__analysis-grid">
              <section
                className="pxd-dashboard__panel"
                aria-labelledby="trend-title"
              >
                <div className="pxd-dashboard__panel-header">
                  <div>
                    <h2 className="pxd-dashboard__panel-title" id="trend-title">
                      {copy.trendTitle}
                    </h2>
                    <p className="pxd-dashboard__panel-subtitle">
                      {copy.trendSubtitle(currencyCode)}
                    </p>
                  </div>
                  <div
                    className="pxd-dashboard__legend"
                    aria-label={copy.chartLegend}
                  >
                    <span className="pxd-dashboard__legend-item">
                      <i
                        aria-hidden="true"
                        className="pxd-dashboard__legend-line"
                      />{' '}
                      {copy.chartRevenue}
                    </span>
                    <span className="pxd-dashboard__legend-item">
                      <i
                        aria-hidden="true"
                        className="pxd-dashboard__legend-line pxd-dashboard__legend-line--cost"
                      />{' '}
                      {copy.chartDirectCost}
                    </span>
                  </div>
                </div>
                <div className="pxd-dashboard__panel-body">
                  <TrendChart
                    copy={copy}
                    currencyCode={currencyCode}
                    locale={locale}
                    points={trendPoints}
                  />
                </div>
              </section>
              <EvidenceCoverage
                copy={copy}
                locale={locale}
                result={data.current}
              />
            </div>

            <div className="pxd-dashboard__secondary-grid">
              <MarginBridge
                copy={copy}
                currencyCode={currencyCode}
                summary={currentSummary}
              />
              <RankedCases
                copy={copy}
                currencyCode={currencyCode}
                rows={caseRows}
              />
            </div>

            <EvidenceTable
              contributions={contributions}
              copy={copy}
              currencyCode={currencyCode}
              locale={locale}
            />

            <details className="pxd-dashboard__panel pxd-dashboard__rules">
              <summary>{copy.inclusionRulesTitle}</summary>
              <ol>
                {copy.inclusionRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ol>
            </details>

            <p className="pxd-dashboard__panel-subtitle">
              {copy.includedCurrencyRecords(
                formatDashboardCount(
                  countVisibleCurrencyRecords(data.current, currencyCode),
                  locale,
                ),
                currencyCode,
              )}{' '}
              · {copy.noCurrencyConversion}.
            </p>
          </>
        ) : null}
      </main>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier:
    PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.operationalProfitabilityDashboard,
  name: 'operational-profitability-dashboard',
  description: 'Read-only PxD Evidence Ledger for operational profitability.',
  component: OperationalProfitabilityDashboard,
});
