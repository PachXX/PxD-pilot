import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  type PashxEvidenceInsight,
  type PashxOperationalCommandCentreResult,
  type PashxOperationalWorkItem,
} from 'pashx-mab-contract';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useColorScheme, useLocale } from 'twenty-sdk/front-component';
import { getPublicAssetUrl } from 'twenty-sdk/utils';

import { buildOperationalWorkQueue } from '../command-centre/build-operational-work-queue';
import { loadCommandCentre } from '../command-centre/load-command-centre';
import {
  formatCommandCentreDateTime,
  getInsightRecordHref,
  getOperationalWorkItemHref,
  groupOperationalWorkItems,
  resolveInsightSourceLinks,
} from '../command-centre/command-centre.model';
import {
  commandCentreCopy,
  toCommandCentreLocale,
  type CommandCentreCopy,
  type CommandCentreLocale,
} from './command-centre.copy';
import { commandCentreStyles } from './command-centre.styles';
import { getOperationalProfitabilityDashboardFontStyles } from './operational-profitability-dashboard.styles';

const InsightCard = ({
  insight,
  result,
  locale,
  copy,
}: Readonly<{
  insight: PashxEvidenceInsight;
  result: PashxOperationalCommandCentreResult;
  locale: CommandCentreLocale;
  copy: CommandCentreCopy;
}>) => {
  const sourceLinks = resolveInsightSourceLinks(insight, result);
  const typeLabel =
    insight.insightType === null
      ? copy.insightTypeUnknown
      : copy.insightTypeLabels[insight.insightType];
  const confidenceLabel =
    insight.confidence === null
      ? copy.confidenceUnknown
      : copy.confidenceLabels[insight.confidence];

  return (
    <li className="pxd-command__insight">
      <span className={`pxd-command__tag pxd-command__tag--${insight.insightType ?? 'unknown'}`}>
        {typeLabel}
      </span>
      <p className="pxd-command__insight-narrative">{insight.narrative}</p>
      <dl className="pxd-command__insight-meta">
        <div>
          <dt>{copy.generatedLabel}</dt>
          <dd>
            <bdi>{formatCommandCentreDateTime(insight.generatedAt, locale)}</bdi>
          </dd>
        </div>
        <div>
          <dt>{copy.confidenceLabel}</dt>
          <dd>{confidenceLabel}</dd>
        </div>
        <div>
          <dt>{copy.generatorLabel}</dt>
          <dd>
            <bdi className="pxd-command__isolate">
              {insight.generatorVersion || '—'}
            </bdi>
          </dd>
        </div>
      </dl>
      {sourceLinks.length === 0 ? (
        <p className="pxd-command__muted">{copy.noSources}</p>
      ) : (
        <div className="pxd-command__sources">
          <span className="pxd-command__sources-label">{copy.sourcesLabel}</span>
          <ul className="pxd-command__sources-list">
            {sourceLinks.map((sourceLink) =>
              sourceLink.kind === 'link' ? (
                <li key={`${sourceLink.objectName}:${sourceLink.recordId}`}>
                  <a
                    className="pxd-command__link"
                    href={sourceLink.href}
                    target="_top"
                  >
                    <bdi className="pxd-command__isolate">
                      {sourceLink.objectName}: {sourceLink.recordId}
                    </bdi>
                  </a>
                </li>
              ) : (
                <li
                  key={sourceLink.recordId}
                  className="pxd-command__source-plain"
                >
                  <bdi className="pxd-command__isolate">{sourceLink.recordId}</bdi>
                </li>
              ),
            )}
          </ul>
          <p className="pxd-command__muted pxd-command__source-note">
            {copy.sourceIdsPlainLabel}
          </p>
        </div>
      )}
      <a
        className="pxd-command__link"
        href={getInsightRecordHref(insight)}
        target="_top"
      >
        {copy.openInsightRecord}
      </a>
    </li>
  );
};

const LedgerRow = ({
  item,
  locale,
  copy,
}: Readonly<{
  item: PashxOperationalWorkItem;
  locale: CommandCentreLocale;
  copy: CommandCentreCopy;
}>) => {
  const isApproval = item.source === 'APPROVAL_REQUEST';
  const commandItem = isApproval ? null : item.item;
  const approval = isApproval ? item.item : null;

  return (
    <tr>
      <td data-label={copy.priorityLabel}>
        <span className={`pxd-command__signal pxd-command__signal--${item.signal.toLowerCase()}`}>
          <span aria-hidden="true" className="pxd-command__signal-dot" />
          {copy.signals[item.signal]}
        </span>
      </td>
      <td data-label={copy.requiredActionLabel}>
        {isApproval ? (
          <>
            <strong>
              {approval !== null && approval.name.trim() !== ''
                ? approval.name
                : approval?.requestedActionCode}
            </strong>
            {approval !== null &&
            approval.requestedActionCode.trim() !== '' ? (
              <span className="pxd-command__case">
                {copy.requestedActionPrefix}:{' '}
                <bdi className="pxd-command__isolate">
                  {approval.requestedActionCode}
                </bdi>
              </span>
            ) : null}
          </>
        ) : (
          <>
            <strong>{commandItem !== null ? copy.reasons[commandItem.reasonCode] : ''}</strong>
            <span className="pxd-command__case">
              {copy.caseLabel}: {commandItem?.caseName}
            </span>
          </>
        )}
      </td>
      <td data-label={copy.stageLabel}>
        {isApproval ? (
          copy.approvalPendingLabel
        ) : commandItem === null || commandItem.stage === null ? (
          copy.noStage
        ) : (
          <bdi>{copy.stages[commandItem.stage]}</bdi>
        )}
      </td>
      <td data-label={copy.ownerLabel}>
        {isApproval ? (
          <bdi className="pxd-command__isolate">
            {approval?.approverRecordId ?? copy.unassigned}
          </bdi>
        ) : (
          <bdi className="pxd-command__isolate">
            {commandItem?.ownerRecordId ?? copy.unassigned}
          </bdi>
        )}
      </td>
      <td data-label={copy.dueLabel}>
        {isApproval ? (
          <bdi>
            {copy.requestedAtLabel}{' '}
            {approval !== null
              ? formatCommandCentreDateTime(approval.requestedAt, locale)
              : '—'}
          </bdi>
        ) : commandItem === null || commandItem.actionDueAt === null ? (
          copy.noDeadline
        ) : (
          <bdi>
            {formatCommandCentreDateTime(commandItem.actionDueAt, locale)}
          </bdi>
        )}
      </td>
      <td data-label={copy.evidenceLabel}>
        <a
          className="pxd-command__link"
          href={getOperationalWorkItemHref(item)}
          target="_top"
        >
          {copy.openEvidence}
        </a>
      </td>
    </tr>
  );
};

const CommandCentre = () => {
  const hostLocale = useLocale();
  const colorScheme = useColorScheme();
  const [localeOverride, setLocaleOverride] =
    useState<CommandCentreLocale | null>(null);
  const locale = localeOverride ?? toCommandCentreLocale(hostLocale);
  const copy = commandCentreCopy[locale];
  const mabIndusSolutionsLogoUrl = getPublicAssetUrl(
    'brand/mab-indus-solutions-logo.jpg',
  );
  const [result, setResult] =
    useState<PashxOperationalCommandCentreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  // The frozen precedence lives in buildOperationalWorkQueue; JSX never re-sorts.
  const workQueue = useMemo(
    () =>
      result === null
        ? []
        : buildOperationalWorkQueue({
            commandItems: result.commandItems,
            approvals: result.approvals,
          }),
    [result],
  );
  const groups = useMemo(() => groupOperationalWorkItems(workQueue), [workQueue]);
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
      const nextResult = await loadCommandCentre({});
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

  return (
    <div
      aria-label={copy.dashboardLabel}
      className="pxd-command"
      data-color-scheme={colorScheme}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      lang={locale}
    >
      <style>{`${fontStyles}\n${commandCentreStyles}`}</style>
      <header className="pxd-command__header">
        <div>
          <div className="pxd-command__tenant-brand">
            <span aria-hidden="true" className="pxd-command__tenant-logo">
              <img alt="" src={mabIndusSolutionsLogoUrl} />
            </span>
            <p className="pxd-command__welcome">{copy.welcomeTitle}</p>
          </div>
          <p className="pxd-command__eyebrow">{copy.eyebrow}</p>
          <h1 className="pxd-command__title">{copy.title}</h1>
          <p className="pxd-command__subtitle">{copy.subtitle}</p>
          {result !== null ? (
            <p className="pxd-command__as-of">
              {copy.observed(formatCommandCentreDateTime(result.asOf, locale))}
              {' · '}
              {copy.queueCoverage(workQueue.length)}
            </p>
          ) : null}
        </div>
        <div className="pxd-command__actions">
          <button
            aria-label={copy.languageButtonLabel}
            className="pxd-command__button"
            lang={locale === 'ar' ? 'en' : 'ar'}
            onClick={() => setLocaleOverride(locale === 'en' ? 'ar' : 'en')}
            type="button"
          >
            {copy.languageName}
          </button>
          <button
            aria-busy={loading}
            className="pxd-command__button pxd-command__button--primary"
            disabled={loading}
            onClick={() => void refresh()}
            type="button"
          >
            {loading ? copy.refreshing : copy.refresh}
          </button>
        </div>
      </header>

      <main aria-busy={loading} className="pxd-command__main">
        <div aria-live="polite">
          {loading && result === null ? (
            <section className="pxd-command__state" role="status">
              <p>{copy.loading}</p>
            </section>
          ) : null}

          {error && result === null ? (
            <section className="pxd-command__state" role="alert">
              <h2>{copy.errorTitle}</h2>
              <button
                className="pxd-command__button pxd-command__button--primary"
                onClick={() => void refresh()}
                type="button"
              >
                {copy.retry}
              </button>
            </section>
          ) : null}

          {error && result !== null ? (
            <div className="pxd-command__notice" role="alert">
              {copy.errorTitle}
            </div>
          ) : null}

          {result?.isPartial ? (
            <div className="pxd-command__notice" role="status">
              {copy.partial}
            </div>
          ) : null}
        </div>

        {result !== null ? (
          <>
            <section
              aria-label={copy.queueSummary}
              className="pxd-command__summary"
            >
              {groups.map((group) => (
                <div className="pxd-command__summary-item" key={group.signal}>
                  <span
                    aria-hidden="true"
                    className={`pxd-command__signal-dot pxd-command__signal-dot--${group.signal.toLowerCase()}`}
                  />
                  <span className="pxd-command__summary-label">
                    {copy.signals[group.signal]}
                  </span>
                  <strong className="pxd-command__summary-count">
                    {group.items.length.toLocaleString(
                      locale === 'ar' ? 'ar-SA' : 'en-GB',
                    )}
                  </strong>
                  <span className="pxd-command__summary-description">
                    {copy.signalDescriptions[group.signal]}
                  </span>
                </div>
              ))}
            </section>

            <div className="pxd-command__workspace">
              <section
                aria-labelledby="pxd-command-priority-work"
                className="pxd-command__ledger"
              >
                <header className="pxd-command__section-header">
                  <div>
                    <h2 id="pxd-command-priority-work">{copy.priorityWork}</h2>
                    <p>{copy.priorityWorkDescription}</p>
                  </div>
                  <span>{copy.queueCoverage(workQueue.length)}</span>
                </header>
                {workQueue.length === 0 ? (
                  <section className="pxd-command__empty">
                    <h2>{copy.emptyTitle}</h2>
                    <p className="pxd-command__muted">{copy.emptyBody}</p>
                  </section>
                ) : (
                  <div className="pxd-command__table-scroll">
                    <table className="pxd-command__table">
                      <thead>
                        <tr>
                          <th scope="col">{copy.priorityLabel}</th>
                          <th scope="col">{copy.requiredActionLabel}</th>
                          <th scope="col">{copy.stageLabel}</th>
                          <th scope="col">{copy.ownerLabel}</th>
                          <th scope="col">{copy.dueLabel}</th>
                          <th scope="col">{copy.evidenceLabel}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workQueue.map((item) => (
                          <LedgerRow
                            copy={copy}
                            item={item}
                            key={
                              item.source === 'APPROVAL_REQUEST'
                                ? `approval:${item.item.id}`
                                : `${item.item.recordType}:${item.item.recordId}:${item.item.reasonCode}`
                            }
                            locale={locale}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <aside className="pxd-command__side">
                <section
                  aria-labelledby="pxd-command-insights"
                  className="pxd-command__panel"
                >
                  <h2 id="pxd-command-insights">{copy.insightsTitle}</h2>
                  <p className="pxd-command__panel-body">
                    {copy.insightsDescription}
                  </p>
                  {result.insights.length === 0 ? (
                    <div className="pxd-command__panel-state">
                      <p className="pxd-command__panel-state-title">
                        {copy.insightsEmpty}
                      </p>
                      <p className="pxd-command__muted">
                        {copy.insightsEmptyBody}
                      </p>
                    </div>
                  ) : (
                    <ul className="pxd-command__insights">
                      {result.insights.map((insight) => (
                        <InsightCard
                          copy={copy}
                          insight={insight}
                          key={insight.id}
                          locale={locale}
                          result={result}
                        />
                      ))}
                    </ul>
                  )}
                </section>

                <section
                  aria-labelledby="pxd-command-unavailable"
                  className="pxd-command__panel pxd-command__panel--unavailable"
                >
                  <h2 id="pxd-command-unavailable">{copy.unavailableTitle}</h2>
                  <p className="pxd-command__panel-body">{copy.unavailableBody}</p>
                  <dl className="pxd-command__unavailable-list">
                    <div>
                      <dt>{copy.emailIntakeLabel}</dt>
                      <dd>
                        <strong className="pxd-command__unavailable-state">
                          {copy.unavailableState}
                        </strong>
                        <span className="pxd-command__muted">
                          {copy.emailUnavailableReason}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>{copy.ocrLabel}</dt>
                      <dd>
                        <strong className="pxd-command__unavailable-state">
                          {copy.unavailableState}
                        </strong>
                        <span className="pxd-command__muted">
                          {copy.ocrUnavailableReason}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </section>
              </aside>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier:
    PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.commandCentre,
  name: 'command-centre',
  description: 'Read-only PxD procurement Command Centre.',
  component: CommandCentre,
});
