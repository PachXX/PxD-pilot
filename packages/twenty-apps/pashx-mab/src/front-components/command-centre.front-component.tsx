import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  type PashxEvidenceInsight,
  type PashxOperationalWorkItem,
} from 'pashx-mab-contract';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useColorScheme, useLocale } from 'twenty-sdk/front-component';
import { getPublicAssetUrl } from 'twenty-sdk/utils';

import { COMMAND_CENTRE_ACTIVE_STAGES } from '../command-centre/build-command-centre-overview';
import {
  formatCommandCentreDateTime,
  getInsightRecordHref,
  getOperationalWorkItemHref,
  groupOperationalWorkItems,
  resolveOverviewInsightSourceLinks,
} from '../command-centre/command-centre.model';
import type {
  CommandCentreCaseRow,
  CommandCentreCompanyRecord,
  CommandCentreNativeLink,
  CommandCentreOverviewResult,
} from '../command-centre/command-centre.types';
import {
  isCommandCentrePermissionError,
  loadCommandCentreOverview,
} from '../command-centre/load-command-centre-overview';
import {
  commandCentreCopy,
  toCommandCentreLocale,
  type CommandCentreCopy,
  type CommandCentreLocale,
} from './command-centre.copy';
import { commandCentreStyles } from './command-centre.styles';
import { getOperationalProfitabilityDashboardFontStyles } from './operational-profitability-dashboard.styles';

const NativeLink = ({ link }: { link: CommandCentreNativeLink }) => (
  <a className="pxd-command__link" href={link.href} target="_top">
    <bdi dir="ltr">{link.label}</bdi>
  </a>
);

const CompanyIdentity = ({
  company,
  link,
  copy,
}: {
  company: CommandCentreCompanyRecord;
  link: CommandCentreNativeLink;
  copy: CommandCentreCopy;
}) => (
  <span className="pxd-command__identity">
    <NativeLink link={link} />
    {company.commercialRegistrationNumber === null ? null : (
      <small>
        {copy.commercialRegistrationLabel}{' '}
        <bdi dir="ltr">{company.commercialRegistrationNumber}</bdi>
      </small>
    )}
    {company.vatRegistrationNumber === null ? null : (
      <small>
        {copy.vatRegistrationLabel}{' '}
        <bdi dir="ltr">{company.vatRegistrationNumber}</bdi>
      </small>
    )}
  </span>
);

const formatAmount = (
  amountMicros: bigint,
  currencyCode: string,
  locale: CommandCentreLocale,
): string =>
  new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amountMicros) / 1_000_000);

const nextWorkLabel = (
  item: PashxOperationalWorkItem | null,
  copy: CommandCentreCopy,
): string => {
  if (item === null) return copy.notRecorded;
  return item.source === 'APPROVAL_REQUEST'
    ? item.item.name || item.item.requestedActionCode || copy.notRecorded
    : copy.reasons[item.item.reasonCode];
};

const InsightItem = ({
  insight,
  result,
  locale,
  copy,
}: {
  insight: PashxEvidenceInsight;
  result: CommandCentreOverviewResult;
  locale: CommandCentreLocale;
  copy: CommandCentreCopy;
}) => {
  const sourceLinks = resolveOverviewInsightSourceLinks(
    insight,
    result.recordLinks,
  );

  return (
    <li className="pxd-command__insight">
      <span className="pxd-command__tag">
        {insight.insightType === null
          ? copy.insightTypeUnknown
          : copy.insightTypeLabels[insight.insightType]}
      </span>
      <p>{insight.narrative}</p>
      <dl className="pxd-command__compact-list">
        <div>
          <dt>{copy.generatedLabel}</dt>
          <dd>
            <bdi dir="ltr">
              {formatCommandCentreDateTime(insight.generatedAt, locale)}
            </bdi>
          </dd>
        </div>
        <div>
          <dt>{copy.confidenceLabel}</dt>
          <dd>
            {insight.confidence === null
              ? copy.confidenceUnknown
              : copy.confidenceLabels[insight.confidence]}
          </dd>
        </div>
      </dl>
      <ul className="pxd-command__source-list" aria-label={copy.sourcesLabel}>
        {sourceLinks.length === 0 ? <li>{copy.noSources}</li> : null}
        {sourceLinks.map((source) => (
          <li key={`${source.kind}:${source.recordId}`}>
            {source.kind === 'link' ? (
              <a className="pxd-command__link" href={source.href} target="_top">
                <bdi dir="ltr">{source.recordId}</bdi>
              </a>
            ) : (
              <span title={copy.unresolvedSourceLabel}>
                <bdi dir="ltr">{source.recordId}</bdi>
              </span>
            )}
          </li>
        ))}
      </ul>
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

const CashState = ({
  row,
  locale,
  copy,
}: {
  row: CommandCentreCaseRow;
  locale: CommandCentreLocale;
  copy: CommandCentreCopy;
}) => {
  if (row.cash.status === 'UNAVAILABLE')
    return <span>{copy.unavailableState}</span>;
  if (row.cash.status === 'NOT_RECORDED')
    return <span>{copy.notRecorded}</span>;

  return (
    <div className="pxd-command__cash">
      <strong>{copy.verifiedCash}</strong>
      {row.cash.currencies.map((currency) => (
        <dl className="pxd-command__compact-list" key={currency.currencyCode}>
          <div>
            <dt>{copy.inflowLabel}</dt>
            <dd dir="ltr">
              {formatAmount(
                currency.inflowMicros,
                currency.currencyCode,
                locale,
              )}
            </dd>
          </div>
          <div>
            <dt>{copy.outflowLabel}</dt>
            <dd dir="ltr">
              {formatAmount(
                currency.outflowMicros,
                currency.currencyCode,
                locale,
              )}
            </dd>
          </div>
          <div>
            <dt>{copy.netCashLabel}</dt>
            <dd dir="ltr">
              {formatAmount(
                currency.netCashMicros,
                currency.currencyCode,
                locale,
              )}
            </dd>
          </div>
        </dl>
      ))}
      <ul className="pxd-command__inline-links">
        {row.cash.movementLinks.map((link) => (
          <li key={link.recordId}>
            <NativeLink link={link} />
          </li>
        ))}
      </ul>
    </div>
  );
};

const CaseRow = ({
  row,
  locale,
  copy,
}: {
  row: CommandCentreCaseRow;
  locale: CommandCentreLocale;
  copy: CommandCentreCopy;
}) => (
  <tr>
    <th data-label={copy.caseLabel} scope="row">
      <NativeLink link={row.caseLink} />
      {row.caseRecord.projectName !== null ? (
        <span className="pxd-command__muted">{row.caseRecord.projectName}</span>
      ) : null}
    </th>
    <td data-label={copy.identityLabel}>
      <strong>{copy.customerLabel}</strong>
      {row.customerLink === null ? (
        copy.notRecorded
      ) : (
        <CompanyIdentity
          company={row.customer!}
          copy={copy}
          link={row.customerLink}
        />
      )}
      <strong>{copy.suppliersLabel}</strong>
      {row.suppliers.length === 0 ? (
        <span>{copy.notRecorded}</span>
      ) : (
        <ul className="pxd-command__inline-links">
          {row.suppliers.map(({ company, link }) => (
            <li key={link.recordId}>
              <CompanyIdentity company={company} copy={copy} link={link} />
            </li>
          ))}
        </ul>
      )}
    </td>
    <td data-label={copy.stageTaskLabel}>
      <strong>
        {row.caseRecord.stage === null
          ? copy.stageNotRecorded
          : copy.stages[row.caseRecord.stage]}
      </strong>
      <span>{nextWorkLabel(row.nextWork, copy)}</span>
      <span className="pxd-command__muted">
        {row.caseRecord.actionDueAt === null
          ? copy.noDeadline
          : formatCommandCentreDateTime(row.caseRecord.actionDueAt, locale)}
      </span>
    </td>
    <td data-label={copy.documentsLabel}>
      <strong>
        {copy.finalizedDocuments(
          row.finalizedDocumentCount,
          row.totalDocumentCount,
        )}
      </strong>
      <span>
        {copy.amountsRecorded(row.amountRecordedCount, row.totalDocumentCount)}
      </span>
      <ul className="pxd-command__inline-links">
        {row.documentLinks.map((link) => (
          <li key={link.recordId}>
            <NativeLink link={link} />
          </li>
        ))}
      </ul>
    </td>
    <td data-label={copy.quotationLabel}>
      <strong>
        {copy.quotationStatuses[row.quotation.recommendationStatus]}
      </strong>
      <span>
        {copy.finalizedResponses(
          row.quotation.finalizedInvitationCount,
          row.quotation.finalizedResponseCount,
        )}
      </span>
      <span>
        {copy.draftEvidence(
          row.quotation.draftInvitationCount,
          row.quotation.draftResponseCount,
        )}
      </span>
    </td>
    <td data-label={copy.deliveryInvoiceLabel}>
      <strong>
        {row.deliveryStatus === null
          ? copy.notRecorded
          : copy.deliveryStatuses[row.deliveryStatus]}
      </strong>
      <span>
        {row.deliveryDueAt === null
          ? copy.noDeadline
          : formatCommandCentreDateTime(row.deliveryDueAt, locale)}
      </span>
      <span>{copy.invoiceCount(row.invoices.length)}</span>
      <ul className="pxd-command__inline-links">
        {row.invoices.map((invoice) => (
          <li key={invoice.link.recordId}>
            <span>
              {invoice.lifecycleStatus === 'FINALIZED'
                ? copy.finalizedStatus
                : invoice.lifecycleStatus === 'DRAFT'
                  ? copy.draftStatus
                  : copy.notRecorded}
            </span>
            <NativeLink link={invoice.link} />
            {invoice.amountMicros === null || invoice.currencyCode === null ? (
              <span>{copy.notRecorded}</span>
            ) : (
              <span dir="ltr">
                {formatAmount(
                  BigInt(invoice.amountMicros),
                  invoice.currencyCode,
                  locale,
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
    </td>
    <td data-label={copy.cashLabel}>
      <CashState copy={copy} locale={locale} row={row} />
    </td>
  </tr>
);

const CommandCentre = () => {
  const hostLocale = useLocale();
  const colorScheme = useColorScheme();
  const [localeOverride, setLocaleOverride] =
    useState<CommandCentreLocale | null>(null);
  const [result, setResult] = useState<CommandCentreOverviewResult | null>(
    null,
  );
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [noPermission, setNoPermission] = useState(false);
  const requestId = useRef(0);
  const locale = localeOverride ?? toCommandCentreLocale(hostLocale);
  const copy = commandCentreCopy[locale];
  const groups = useMemo(
    () => groupOperationalWorkItems(result?.workQueue ?? []),
    [result],
  );
  const visibleCases = useMemo(
    () =>
      result?.cases.filter(
        ({ caseRecord }) =>
          selectedCaseId === '' || caseRecord.id === selectedCaseId,
      ) ?? [],
    [result, selectedCaseId],
  );
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
  useEffect(() => {
    if (
      result !== null &&
      selectedCaseId !== '' &&
      !result.cases.some(({ caseRecord }) => caseRecord.id === selectedCaseId)
    ) {
      setSelectedCaseId('');
    }
  }, [result, selectedCaseId]);

  const refresh = useCallback(async () => {
    const activeRequest = requestId.current + 1;
    requestId.current = activeRequest;
    setLoading(true);
    setError(false);
    setNoPermission(false);
    try {
      const nextResult = await loadCommandCentreOverview();
      if (requestId.current === activeRequest) setResult(nextResult);
    } catch (nextError) {
      if (requestId.current === activeRequest) {
        const permissionFailure = isCommandCentrePermissionError(nextError);
        setNoPermission(permissionFailure);
        setError(!permissionFailure);
        if (permissionFailure) setResult(null);
      }
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
              <img
                alt=""
                src={getPublicAssetUrl('brand/mab-indus-solutions-logo.jpg')}
              />
            </span>
            <p>{copy.welcomeTitle}</p>
          </div>
          <p className="pxd-command__eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="pxd-command__subtitle">{copy.subtitle}</p>
          {result !== null ? (
            <p className="pxd-command__as-of">
              {copy.observed(formatCommandCentreDateTime(result.asOf, locale))}
              {' · '}
              {copy.caseCoverage(result.cases.length)}
            </p>
          ) : null}
        </div>
        <div className="pxd-command__actions">
          {result !== null && result.cases.length > 1 ? (
            <label className="pxd-command__case-selector">
              <span>{copy.caseSelectorLabel}</span>
              <select
                onChange={(event) => setSelectedCaseId(event.target.value)}
                value={selectedCaseId}
              >
                <option value="">{copy.allCases}</option>
                {result.cases.map(({ caseRecord }) => (
                  <option key={caseRecord.id} value={caseRecord.id}>
                    {caseRecord.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
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
              <div aria-hidden="true" className="pxd-command__skeleton" />
            </section>
          ) : null}
          {noPermission && result === null ? (
            <section className="pxd-command__state" role="status">
              <h2>{copy.noPermissionTitle}</h2>
              <p>{copy.noPermissionBody}</p>
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
            <p className="pxd-command__notice" role="alert">
              {copy.errorTitle}
            </p>
          ) : null}
          {noPermission && result !== null ? (
            <p className="pxd-command__notice" role="status">
              {copy.noPermissionTitle}. {copy.noPermissionBody}
            </p>
          ) : null}
          {result?.isPartial ? (
            <p className="pxd-command__notice" role="status">
              {copy.partial(
                result.partialSources
                  .map((source) => copy.partialSourceLabels[source])
                  .join(locale === 'ar' ? '، ' : ', '),
              )}
            </p>
          ) : null}
        </div>

        {result !== null ? (
          result.cases.length === 0 ? (
            <section className="pxd-command__state">
              <h2>{copy.emptyTitle}</h2>
              <p>{copy.emptyBody}</p>
            </section>
          ) : (
            <>
              <section
                aria-label={copy.queueSummary}
                className="pxd-command__summary"
              >
                {groups.map((group) => (
                  <div className="pxd-command__summary-item" key={group.signal}>
                    <span className="pxd-command__summary-label">
                      {copy.signals[group.signal]}
                    </span>
                    <strong>
                      {group.items.length.toLocaleString(
                        locale === 'ar' ? 'ar-SA' : 'en-GB',
                      )}
                    </strong>
                    <span>{copy.signalDescriptions[group.signal]}</span>
                  </div>
                ))}
              </section>

              <section
                className="pxd-command__pipeline"
                aria-labelledby="pxd-pipeline-title"
              >
                <header className="pxd-command__section-header">
                  <div>
                    <h2 id="pxd-pipeline-title">{copy.pipelineTitle}</h2>
                    <p>{copy.pipelineDescription}</p>
                  </div>
                </header>
                <ol>
                  {COMMAND_CENTRE_ACTIVE_STAGES.map((stage) => (
                    <li key={stage}>
                      <span>{copy.stages[stage]}</span>
                      <strong>
                        {result.stageSummary.counts[stage].toLocaleString(
                          locale === 'ar' ? 'ar-SA' : 'en-GB',
                        )}
                      </strong>
                    </li>
                  ))}
                  <li className="pxd-command__stage-unrecorded">
                    <span>{copy.stageNotRecorded}</span>
                    <strong>
                      {result.stageSummary.unrecordedCount.toLocaleString(
                        locale === 'ar' ? 'ar-SA' : 'en-GB',
                      )}
                    </strong>
                  </li>
                </ol>
              </section>

              <div className="pxd-command__workspace">
                <section
                  className="pxd-command__ledger"
                  aria-labelledby="pxd-operations-title"
                >
                  <header className="pxd-command__section-header">
                    <div>
                      <h2 id="pxd-operations-title">{copy.operationsTitle}</h2>
                      <p>{copy.operationsDescription}</p>
                    </div>
                    <span>{copy.caseCoverage(visibleCases.length)}</span>
                  </header>
                  <div className="pxd-command__table-scroll">
                    <table className="pxd-command__table">
                      <thead>
                        <tr>
                          <th scope="col">{copy.caseLabel}</th>
                          <th scope="col">{copy.identityLabel}</th>
                          <th scope="col">{copy.stageTaskLabel}</th>
                          <th scope="col">{copy.documentsLabel}</th>
                          <th scope="col">{copy.quotationLabel}</th>
                          <th scope="col">{copy.deliveryInvoiceLabel}</th>
                          <th scope="col">{copy.cashLabel}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleCases.map((row) => (
                          <CaseRow
                            copy={copy}
                            key={row.caseRecord.id}
                            locale={locale}
                            row={row}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <aside className="pxd-command__side">
                  <section
                    className="pxd-command__panel"
                    aria-labelledby="pxd-approvals-title"
                  >
                    <h2 id="pxd-approvals-title">{copy.approvalsTitle}</h2>
                    <p>{copy.approvalsDescription}</p>
                    {result.approvals.length === 0 ? (
                      <p className="pxd-command__zero">
                        {copy.noPendingApprovals}
                      </p>
                    ) : (
                      <ul className="pxd-command__evidence-list">
                        {result.approvals.map((approval) => (
                          <li key={approval.id}>
                            <strong>
                              {approval.name || approval.requestedActionCode}
                            </strong>
                            <span>
                              {copy.requestedAtLabel}{' '}
                              <bdi dir="ltr">
                                {formatCommandCentreDateTime(
                                  approval.requestedAt,
                                  locale,
                                )}
                              </bdi>
                            </span>
                            <ul
                              aria-label={copy.sourcesLabel}
                              className="pxd-command__source-list"
                            >
                              {approval.sourceRecordIds.map((recordId) => {
                                const link = result.recordLinks.find(
                                  (recordLink) =>
                                    recordLink.recordId === recordId,
                                );
                                return link === undefined ? null : (
                                  <li key={recordId}>
                                    <NativeLink link={link} />
                                  </li>
                                );
                              })}
                            </ul>
                            <a
                              className="pxd-command__link"
                              href={getOperationalWorkItemHref({
                                signal: 'APPROVAL_REQUIRED',
                                source: 'APPROVAL_REQUEST',
                                item: approval,
                              })}
                              target="_top"
                            >
                              {copy.openRecord}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section
                    className="pxd-command__panel"
                    aria-labelledby="pxd-insights-title"
                  >
                    <h2 id="pxd-insights-title">{copy.insightsTitle}</h2>
                    <p>{copy.insightsDescription}</p>
                    {result.insights.length === 0 ? (
                      <div className="pxd-command__zero">
                        <strong>{copy.insightsEmpty}</strong>
                        <span>{copy.insightsEmptyBody}</span>
                      </div>
                    ) : (
                      <ul className="pxd-command__evidence-list">
                        {result.insights.map((insight) => (
                          <InsightItem
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
                    className="pxd-command__panel pxd-command__panel--gaps"
                    aria-labelledby="pxd-capability-title"
                  >
                    <h2 id="pxd-capability-title">{copy.capabilityTitle}</h2>
                    <p>{copy.capabilityDescription}</p>
                    <dl className="pxd-command__capabilities">
                      {[
                        [copy.emailIntakeLabel, copy.unavailableState],
                        [copy.ocrLabel, copy.unavailableState],
                        [copy.vendorRiskLabel, copy.unavailableState],
                        [copy.paymentStatusLabel, copy.notRecorded],
                        [copy.documentLinesLabel, copy.awaitingVerification],
                      ].map(([label, state]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{state}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                </aside>
              </div>
            </>
          )
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
