import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS } from 'pashx-mab-contract';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useColorScheme, useLocale } from 'twenty-sdk/front-component';
import { getPublicAssetUrl } from 'twenty-sdk/utils';

import {
  formatWorkflowAmount,
  formatWorkflowDateTime,
} from '../case-workflow/case-workflow.model';
import { loadWorkflowPipeline } from '../workflow-pipeline/load-workflow-pipeline';
import {
  buildWorkflowPipelineCards,
  buildWorkflowPipelineColumns,
  buildWorkflowPipelineSummary,
  getWorkflowPipelineCaseHref,
  getWorkflowPipelineDocumentHref,
} from '../workflow-pipeline/workflow-pipeline.model';
import type { WorkflowPipelineResult } from '../workflow-pipeline/workflow-pipeline.types';
import { getOperationalProfitabilityDashboardFontStyles } from './operational-profitability-dashboard.styles';
import {
  toWorkflowPipelineLocale,
  workflowPipelineCopy,
  type WorkflowPipelineLocale,
} from './workflow-pipeline.copy';
import { workflowPipelineStyles } from './workflow-pipeline.styles';

const SKELETON_COLUMNS = [0, 1, 2, 3, 4, 5, 6] as const;

const WorkflowPipeline = () => {
  const hostLocale = useLocale();
  const colorScheme = useColorScheme();
  const [localeOverride, setLocaleOverride] =
    useState<WorkflowPipelineLocale | null>(null);
  const locale = localeOverride ?? toWorkflowPipelineLocale(hostLocale);
  const copy = workflowPipelineCopy[locale];
  const [result, setResult] = useState<WorkflowPipelineResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const requestId = useRef(0);
  const mabLogoUrl = getPublicAssetUrl('brand/mab-indus-solutions-logo.jpg');

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

  useEffect(() => setLocaleOverride(null), [hostLocale]);

  const refresh = useCallback(async () => {
    const activeRequest = requestId.current + 1;
    requestId.current = activeRequest;
    setLoading(true);
    setError(false);

    try {
      const nextResult = await loadWorkflowPipeline({});
      if (requestId.current === activeRequest) setResult(nextResult);
    } catch {
      if (requestId.current === activeRequest) setError(true);
    } finally {
      if (requestId.current === activeRequest) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      requestId.current += 1;
    };
  }, [refresh]);

  const cards = useMemo(
    () =>
      result === null
        ? []
        : buildWorkflowPipelineCards(result, new Date(result.asOf)),
    [result],
  );
  const columns = useMemo(
    () =>
      buildWorkflowPipelineColumns({ cards, includeArchived, searchTerm }),
    [cards, includeArchived, searchTerm],
  );
  const summary = useMemo(() => buildWorkflowPipelineSummary(cards), [cards]);
  const visibleCaseCount = columns.reduce(
    (total, column) => total + column.cards.length,
    0,
  );

  return (
    <div
      aria-label={copy.dashboardLabel}
      className="pxd-pipeline"
      data-color-scheme={colorScheme}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      lang={locale}
    >
      <style>{`${fontStyles}\n${workflowPipelineStyles}`}</style>
      <header className="pxd-pipeline__header">
        <div>
          <div className="pxd-pipeline__tenant-brand">
            <span aria-hidden="true" className="pxd-pipeline__tenant-logo">
              <img alt="" src={mabLogoUrl} />
            </span>
            <p className="pxd-pipeline__welcome">{copy.welcomeTitle}</p>
          </div>
          <p className="pxd-pipeline__eyebrow">{copy.eyebrow}</p>
          <h1 className="pxd-pipeline__title">{copy.title}</h1>
          <p className="pxd-pipeline__subtitle">{copy.subtitle}</p>
          {result !== null ? (
            <p className="pxd-pipeline__as-of">
              {copy.observed(formatWorkflowDateTime(result.asOf, locale))}
              {' · '}
              {copy.casesCount(result.cases.length)}
            </p>
          ) : null}
        </div>
        <div className="pxd-pipeline__actions">
          <button
            aria-label={copy.languageButtonLabel}
            className="pxd-pipeline__button"
            lang={locale === 'ar' ? 'en' : 'ar'}
            onClick={() => setLocaleOverride(locale === 'en' ? 'ar' : 'en')}
            type="button"
          >
            {copy.languageName}
          </button>
          <button
            aria-busy={loading}
            className="pxd-pipeline__button pxd-pipeline__button--primary"
            disabled={loading}
            onClick={() => void refresh()}
            type="button"
          >
            {loading ? copy.refreshing : copy.refresh}
          </button>
        </div>
      </header>

      <main aria-busy={loading} className="pxd-pipeline__main">
        <div aria-live="polite">
          {error && result === null ? (
            <div className="pxd-pipeline__notice" role="alert">
              <h2>{copy.errorTitle}</h2>
              <button
                className="pxd-pipeline__button pxd-pipeline__button--primary"
                onClick={() => void refresh()}
                type="button"
              >
                {copy.retry}
              </button>
            </div>
          ) : null}
          {error && result !== null ? (
            <div className="pxd-pipeline__notice" role="alert">
              {copy.errorTitle}
            </div>
          ) : null}
          {result?.isPartial ? (
            <div className="pxd-pipeline__notice" role="status">
              {copy.partial}
            </div>
          ) : null}
        </div>

        <section aria-label={copy.dashboardLabel} className="pxd-pipeline__toolbar">
          <div className="pxd-pipeline__search">
            <label htmlFor="pxd-pipeline-search">{copy.searchLabel}</label>
            <input
              className="pxd-pipeline__input"
              id="pxd-pipeline-search"
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              placeholder={copy.searchPlaceholder}
              type="search"
              value={searchTerm}
            />
          </div>
          <button
            aria-pressed={includeArchived}
            className="pxd-pipeline__button"
            onClick={() => setIncludeArchived((current) => !current)}
            type="button"
          >
            {includeArchived ? copy.hideArchived : copy.showArchived}
          </button>
        </section>

        {result !== null ? (
          <section
            aria-label={copy.summaryLabel}
            className="pxd-pipeline__summary"
          >
            <div className="pxd-pipeline__summary-item">
              <span className="pxd-pipeline__summary-label">
                {copy.activeCasesLabel}
              </span>
              <span className="pxd-pipeline__summary-value">
                {summary.activeCaseCount}
              </span>
            </div>
            <div className="pxd-pipeline__summary-item">
              <span className="pxd-pipeline__summary-label">
                {copy.overdueCasesLabel}
              </span>
              <span className="pxd-pipeline__summary-value pxd-pipeline__summary-value--warning">
                {summary.overdueCaseCount}
              </span>
            </div>
            <div className="pxd-pipeline__summary-item">
              <span className="pxd-pipeline__summary-label">
                {copy.complianceLabel}
              </span>
              <span className="pxd-pipeline__summary-value pxd-pipeline__summary-value--warning">
                {summary.complianceExceptionCount}
              </span>
            </div>
            <div className="pxd-pipeline__summary-item">
              <span className="pxd-pipeline__summary-label">
                {copy.evidenceLabel}
              </span>
              <span className="pxd-pipeline__summary-value">
                {copy.evidenceValue(
                  summary.finalizedDocumentCount,
                  summary.totalDocumentCount,
                )}
              </span>
            </div>
          </section>
        ) : null}

        {loading && result === null ? (
          <div aria-label={copy.loading} className="pxd-pipeline__board-wrap" role="status">
            <div className="pxd-pipeline__board">
              {SKELETON_COLUMNS.map((column) => (
                <section className="pxd-pipeline__column" key={column}>
                  <div className="pxd-pipeline__skeleton" />
                </section>
              ))}
            </div>
          </div>
        ) : null}

        {result !== null && result.cases.length === 0 ? (
          <div className="pxd-pipeline__state">
            <h2>{copy.emptyTitle}</h2>
            <p>{copy.emptyBody}</p>
          </div>
        ) : null}

        {result !== null && result.cases.length > 0 && visibleCaseCount === 0 ? (
          <div className="pxd-pipeline__state">
            <h2>{copy.noSearchResultsTitle}</h2>
            <p>{copy.noSearchResultsBody}</p>
          </div>
        ) : null}

        {result !== null && visibleCaseCount > 0 ? (
          <div className="pxd-pipeline__board-wrap">
            <div aria-label={copy.dashboardLabel} className="pxd-pipeline__board">
              {columns.map((column) => (
                <section
                  aria-labelledby={`pxd-pipeline-stage-${column.stage}`}
                  className="pxd-pipeline__column"
                  data-stage={column.stage}
                  key={column.stage}
                >
                  <header className="pxd-pipeline__column-header">
                    <div className="pxd-pipeline__column-title-row">
                      <h2 id={`pxd-pipeline-stage-${column.stage}`}>
                        {copy.stages[column.stage]}
                      </h2>
                      <span className="pxd-pipeline__column-count">
                        {column.cards.length}
                      </span>
                    </div>
                    <p className="pxd-pipeline__column-description">
                      {copy.stageDescriptions[column.stage]}
                    </p>
                  </header>

                  {column.cards.length === 0 ? (
                    <p className="pxd-pipeline__empty-column">
                      {copy.emptyColumn}
                    </p>
                  ) : (
                    <ol className="pxd-pipeline__card-list">
                      {column.cards.map((card) => {
                        const caseRecord = card.caseRecord;
                        const evidence = card.latestEvidence;
                        return (
                          <li key={caseRecord.id}>
                            <article
                              className={`pxd-pipeline__card${
                                card.isOverdue ? ' pxd-pipeline__card--overdue' : ''
                              }`}
                            >
                              <div className="pxd-pipeline__card-top">
                                <h3 className="pxd-pipeline__card-title">
                                  <a
                                    className="pxd-pipeline__link"
                                    href={getWorkflowPipelineCaseHref(caseRecord.id)}
                                    target="_top"
                                  >
                                    <bdi className="pxd-pipeline__isolate">
                                      {caseRecord.name}
                                    </bdi>
                                  </a>
                                </h3>
                                {card.isOverdue ? (
                                  <span className="pxd-pipeline__tag pxd-pipeline__tag--danger">
                                    {copy.overdue}
                                  </span>
                                ) : null}
                              </div>
                              <p className="pxd-pipeline__card-project">
                                {card.customerName ?? copy.noCustomer}
                                {card.customerId === null
                                  ? ''
                                  : ` · ${copy.customerIdLabel} ${card.customerId}`}
                                {' · '}
                                {caseRecord.projectName ?? copy.noProject}
                              </p>

                              <div className="pxd-pipeline__badges">
                                {caseRecord.blockedReasonCode !== null ? (
                                  <span className="pxd-pipeline__tag pxd-pipeline__tag--warning">
                                    {copy.blocked}: {' '}
                                    {copy.blockedReasons[
                                      caseRecord.blockedReasonCode
                                    ] ?? caseRecord.blockedReasonCode}
                                  </span>
                                ) : null}
                                {card.complianceExceptionCount > 0 ? (
                                  <span className="pxd-pipeline__tag pxd-pipeline__tag--warning">
                                    {copy.complianceExceptions(
                                      card.complianceExceptionCount,
                                    )}
                                  </span>
                                ) : null}
                              </div>

                              <dl className="pxd-pipeline__detail">
                                <dt>{copy.nextActionLabel}</dt>
                                <dd>
                                  {caseRecord.nextActionCode === null
                                    ? copy.noNextAction
                                    : copy.nextActions[caseRecord.nextActionCode] ??
                                      caseRecord.nextActionCode}
                                </dd>
                                <dt>{copy.dueLabel}</dt>
                                <dd>
                                  <bdi>
                                    {card.dueAt === null
                                      ? copy.noDueDate
                                      : formatWorkflowDateTime(card.dueAt, locale)}
                                  </bdi>
                                </dd>
                                {column.stage === 'delivery' ? (
                                  <>
                                    <dt>{copy.deliveryLabel}</dt>
                                    <dd>
                                      {copy.deliveryStatuses[
                                        caseRecord.deliveryStatus ?? 'notStarted'
                                      ]}
                                    </dd>
                                  </>
                                ) : null}
                              </dl>

                              <div className="pxd-pipeline__evidence">
                                <span className="pxd-pipeline__evidence-label">
                                  {copy.evidenceCardLabel}
                                </span>
                                {evidence === null ? (
                                  <span className="pxd-pipeline__evidence-meta">
                                    {copy.noFinancialEvidence}
                                  </span>
                                ) : (
                                  <>
                                    <bdi className="pxd-pipeline__amount">
                                      {formatWorkflowAmount(
                                        evidence.totalAmountMicros,
                                        evidence.currencyCode,
                                        locale,
                                      )}
                                    </bdi>
                                    <span className="pxd-pipeline__evidence-meta">
                                      {copy.documentTypes[evidence.documentType] ??
                                        evidence.documentType}
                                      {' · '}
                                      <a
                                        className="pxd-pipeline__link"
                                        href={getWorkflowPipelineDocumentHref(
                                          evidence.documentId,
                                        )}
                                        target="_top"
                                      >
                                        <bdi>{evidence.reference}</bdi>
                                      </a>
                                    </span>
                                  </>
                                )}
                              </div>

                              <footer className="pxd-pipeline__card-footer">
                                <span className="pxd-pipeline__docs">
                                  {copy.documentsValue(
                                    card.finalizedDocumentCount,
                                    card.documentCount,
                                  )}
                                </span>
                                <a
                                  className="pxd-pipeline__link"
                                  href={getWorkflowPipelineCaseHref(caseRecord.id)}
                                  target="_top"
                                >
                                  {copy.openCase}
                                </a>
                              </footer>
                            </article>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </section>
              ))}
            </div>
          </div>
        ) : null}

        <aside className="pxd-pipeline__notice" role="note">
          <h2>{copy.readOnlyTitle}</h2>
          <p>{copy.readOnlyBody}</p>
        </aside>
      </main>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier:
    PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.workflowPipeline,
  name: 'MAB workflow pipeline',
  description:
    'Read-only case pipeline for the approved MAB procurement workflow.',
  component: WorkflowPipeline,
});
