import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_WORKFLOW_DOCUMENT_TYPES,
} from 'pashx-mab-contract';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useColorScheme, useLocale } from 'twenty-sdk/front-component';
import { getPublicAssetUrl } from 'twenty-sdk/utils';

import { loadCaseWorkflow } from '../case-workflow/load-case-workflow';
import {
  buildCaseStageRail,
  buildDeliveryState,
  buildInvoiceReadiness,
  buildPriceComparisonRows,
  formatWorkflowAmount,
  formatWorkflowDateTime,
  getCaseRecordHref,
  getDocumentRecordHref,
  getSupplierRecordHref,
} from '../case-workflow/case-workflow.model';
import type {
  CaseWorkflowCaseRecord,
  CaseWorkflowDocumentRecord,
  CaseWorkflowResult,
} from '../case-workflow/case-workflow.types';
import {
  caseWorkflowCopy,
  toCaseWorkflowLocale,
  type CaseWorkflowCopy,
  type CaseWorkflowLocale,
} from './case-workflow.copy';
import { caseWorkflowStyles } from './case-workflow.styles';
import { getOperationalProfitabilityDashboardFontStyles } from './operational-profitability-dashboard.styles';

const DOCUMENT_TYPE_ORDER = new Map<string, number>(
  PASHX_MAB_WORKFLOW_DOCUMENT_TYPES.map((documentType, position) => [
    documentType,
    position,
  ]),
);

const sortDocuments = (
  documents: readonly CaseWorkflowDocumentRecord[],
): readonly CaseWorkflowDocumentRecord[] =>
  [...documents].sort((left, right) => {
    const leftPosition =
      DOCUMENT_TYPE_ORDER.get(left.documentType ?? '') ?? Number.MAX_SAFE_INTEGER;
    const rightPosition =
      DOCUMENT_TYPE_ORDER.get(right.documentType ?? '') ??
      Number.MAX_SAFE_INTEGER;

    if (leftPosition !== rightPosition) return leftPosition - rightPosition;

    return left.name.localeCompare(right.name);
  });

const lifecycleLabel = (
  status: string | null,
  copy: CaseWorkflowCopy,
): string =>
  status === null ? copy.draftLabel : copy.lifecycleStatuses[status] ?? status;

const documentTypeLabel = (
  documentType: string | null,
  copy: CaseWorkflowCopy,
): string =>
  documentType === null
    ? copy.unknownDocumentType
    : copy.documentTypeLabels[documentType] ?? copy.unknownDocumentType;

const CaseWorkflow = () => {
  const hostLocale = useLocale();
  const colorScheme = useColorScheme();
  const [localeOverride, setLocaleOverride] =
    useState<CaseWorkflowLocale | null>(null);
  const locale = localeOverride ?? toCaseWorkflowLocale(hostLocale);
  const copy = caseWorkflowCopy[locale];
  const mabIndusSolutionsLogoUrl = getPublicAssetUrl(
    'brand/mab-indus-solutions-logo.jpg',
  );
  const [result, setResult] = useState<CaseWorkflowResult | null>(null);
  const [selectedCaseRecordId, setSelectedCaseRecordId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  const selectedCase: CaseWorkflowCaseRecord | null = useMemo(() => {
    if (result === null) return null;
    const resolved =
      result.cases.find(
        (caseRecord) => caseRecord.id === selectedCaseRecordId,
      ) ?? result.cases[0];

    return resolved ?? null;
  }, [result, selectedCaseRecordId]);

  const caseDocuments = useMemo(
    () =>
      selectedCase === null
        ? []
        : sortDocuments(
            result?.documents.filter(
              (document) =>
                document.procurementCaseRecordId === selectedCase.id,
            ) ?? [],
          ),
    [result, selectedCase],
  );

  const stageRail = useMemo(
    () => buildCaseStageRail(selectedCase?.stage ?? null),
    [selectedCase],
  );
  const priceComparisonRows = useMemo(
    () =>
      selectedCase === null
        ? []
        : buildPriceComparisonRows(result?.documents ?? [], selectedCase.id),
    [result, selectedCase],
  );
  const deliveryState = useMemo(
    () =>
      selectedCase === null
        ? null
        : buildDeliveryState(selectedCase, result?.documents ?? []),
    [selectedCase, result],
  );
  const invoiceReadiness = useMemo(
    () =>
      selectedCase === null
        ? null
        : buildInvoiceReadiness(result?.documents ?? [], selectedCase.id),
    [result, selectedCase],
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

  const refresh = useCallback(async () => {
    const activeRequest = requestId.current + 1;
    requestId.current = activeRequest;
    setLoading(true);
    setError(false);

    try {
      const nextResult = await loadCaseWorkflow({});
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
      className="pxd-case"
      data-color-scheme={colorScheme}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      lang={locale}
    >
      <style>{`${fontStyles}\n${caseWorkflowStyles}`}</style>
      <header className="pxd-case__header">
        <div>
          <div className="pxd-case__tenant-brand">
            <span aria-hidden="true" className="pxd-case__tenant-logo">
              <img alt="" src={mabIndusSolutionsLogoUrl} />
            </span>
            <p className="pxd-case__welcome">{copy.welcomeTitle}</p>
          </div>
          <p className="pxd-case__eyebrow">{copy.eyebrow}</p>
          <h1 className="pxd-case__title">{copy.title}</h1>
          <p className="pxd-case__subtitle">{copy.subtitle}</p>
          {result !== null ? (
            <p className="pxd-case__as-of">
              {copy.observed(formatWorkflowDateTime(result.asOf, locale))}
              {' · '}
              {copy.caseCoverage(result.cases.length)}
            </p>
          ) : null}
        </div>
        <div className="pxd-case__actions">
          <button
            aria-label={copy.languageButtonLabel}
            className="pxd-case__button"
            lang={locale === 'ar' ? 'en' : 'ar'}
            onClick={() => setLocaleOverride(locale === 'en' ? 'ar' : 'en')}
            type="button"
          >
            {copy.languageName}
          </button>
          <button
            aria-busy={loading}
            className="pxd-case__button pxd-case__button--primary"
            disabled={loading}
            onClick={() => void refresh()}
            type="button"
          >
            {loading ? copy.refreshing : copy.refresh}
          </button>
        </div>
      </header>

      <main aria-busy={loading} className="pxd-case__main">
        <div aria-live="polite">
          {loading && result === null ? (
            <div className="pxd-case__notice" role="status">
              {copy.loading}
            </div>
          ) : null}
          {error && result === null ? (
            <div className="pxd-case__notice" role="alert">
              <h2>{copy.errorTitle}</h2>
              <button
                className="pxd-case__button pxd-case__button--primary"
                onClick={() => void refresh()}
                type="button"
              >
                {copy.retry}
              </button>
            </div>
          ) : null}
          {error && result !== null ? (
            <div className="pxd-case__notice" role="alert">
              {copy.errorTitle}
            </div>
          ) : null}
          {result?.isPartial ? (
            <div className="pxd-case__notice" role="status">
              {copy.partial}
            </div>
          ) : null}
        </div>

        {result !== null && result.cases.length === 0 ? (
          <div className="pxd-case__state">
            <h2>{copy.emptyTitle}</h2>
            <p className="pxd-case__muted">{copy.emptyBody}</p>
          </div>
        ) : null}

        {result !== null && result.cases.length > 0 ? (
          <>
            <aside
              aria-labelledby="pxd-case-list-title"
              className="pxd-case__panel"
            >
              <h2 id="pxd-case-list-title">{copy.casesTitle}</h2>
              <p>{copy.casesDescription}</p>
              <ul className="pxd-case__case-list">
                {result.cases.map((caseRecord) => (
                  <li className="pxd-case__case-item" key={caseRecord.id}>
                    <button
                      aria-pressed={selectedCase?.id === caseRecord.id}
                      className="pxd-case__case-button"
                      onClick={() => setSelectedCaseRecordId(caseRecord.id)}
                      type="button"
                    >
                      <span className="pxd-case__case-row">
                        <span className="pxd-case__case-name">
                          {caseRecord.name}
                        </span>
                        {selectedCase?.id === caseRecord.id ? (
                          <span className="pxd-case__tag pxd-case__tag--current">
                            {copy.selectCaseHint}
                          </span>
                        ) : null}
                      </span>
                      <span className="pxd-case__case-meta">
                        {copy.stages[caseRecord.stage ?? 'intake']}
                        {' · '}
                        {caseRecord.deliveryStatus !== null
                          ? copy.deliveryStatuses[caseRecord.deliveryStatus]
                          : copy.deliveryStatuses.notStarted}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            {selectedCase !== null ? (
              <div>
                <section
                  aria-labelledby="pxd-case-rail-title"
                  className="pxd-case__panel"
                >
                  <div className="pxd-case__case-row">
                    <div>
                      <h2 id="pxd-case-rail-title">
                        {copy.processRailTitle}
                      </h2>
                      <p>{copy.processRailDescription}</p>
                    </div>
                    <a
                      className="pxd-case__link"
                      href={getCaseRecordHref(selectedCase.id)}
                      target="_top"
                    >
                      {copy.caseLinkLabel}
                    </a>
                  </div>
                  <ol className="pxd-case__rail">
                    {stageRail.map((entry) => (
                      <li
                        aria-current={
                          entry.state === 'current' ? 'step' : undefined
                        }
                        className={`pxd-case__rail-item pxd-case__rail-item--${entry.state}`}
                        key={entry.stage}
                      >
                        <span className="pxd-case__rail-stage">
                          {copy.stages[entry.stage]}
                        </span>
                        <span className="pxd-case__rail-state">
                          {copy.stageStates[entry.state]}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>

                <section
                  aria-labelledby="pxd-case-documents-title"
                  className="pxd-case__panel"
                >
                  <h2 id="pxd-case-documents-title">{copy.documentsTitle}</h2>
                  <p>{copy.documentsDescription}</p>
                  <div className="pxd-case__table-scroll">
                    <table className="pxd-case__table">
                      <thead>
                        <tr>
                          <th scope="col">{copy.documentLabel}</th>
                          <th scope="col">{copy.documentTypeLabel}</th>
                          <th scope="col">{copy.lifecycleLabel}</th>
                          <th scope="col">{copy.issueDateLabel}</th>
                          <th scope="col">{copy.totalLabel}</th>
                          <th scope="col">
                            <span className="pxd-case__sr-only">
                              {copy.openRecord}
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {caseDocuments.map((document) => (
                          <tr key={document.id}>
                            <td>
                              <a
                                className="pxd-case__link"
                                href={getDocumentRecordHref(document.id)}
                                target="_top"
                              >
                                <bdi className="pxd-case__isolate">
                                  {document.name}
                                </bdi>
                              </a>
                            </td>
                            <td>
                              {documentTypeLabel(document.documentType, copy)}
                            </td>
                            <td>
                              {lifecycleLabel(document.lifecycleStatus, copy)}
                            </td>
                            <td>
                              <bdi>
                                {formatWorkflowDateTime(
                                  document.issueDate,
                                  locale,
                                )}
                              </bdi>
                            </td>
                            <td className="pxd-case__table-num">
                              <bdi>
                                {formatWorkflowAmount(
                                  document.totalAmountMicros,
                                  document.currencyCode,
                                  locale,
                                )}
                              </bdi>
                            </td>
                            <td>
                              <a
                                className="pxd-case__link"
                                href={getDocumentRecordHref(document.id)}
                                target="_top"
                              >
                                {copy.openRecord}
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section
                  aria-labelledby="pxd-case-price-title"
                  className="pxd-case__panel"
                >
                  <h2 id="pxd-case-price-title">
                    {copy.priceComparisonTitle}
                  </h2>
                  <p>{copy.priceComparisonDescription}</p>
                  {priceComparisonRows.length === 0 ? (
                    <p className="pxd-case__muted">{copy.noQuotesBody}</p>
                  ) : (
                    <div className="pxd-case__table-scroll">
                      <table className="pxd-case__table">
                        <thead>
                          <tr>
                            <th scope="col">{copy.documentLabel}</th>
                            <th scope="col">{copy.supplierLabel}</th>
                            <th scope="col">{copy.totalLabel}</th>
                            <th scope="col">{copy.lifecycleLabel}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {priceComparisonRows.map((row) => (
                            <tr key={row.documentId}>
                              <td>
                                <a
                                  className="pxd-case__link"
                                  href={getDocumentRecordHref(row.documentId)}
                                  target="_top"
                                >
                                  <bdi className="pxd-case__isolate">
                                    {row.documentName}
                                  </bdi>
                                </a>
                              </td>
                              <td>
                                {row.supplierRecordId === null ? (
                                  <span className="pxd-case__muted">
                                    {copy.noSupplier}
                                  </span>
                                ) : (
                                  <a
                                    className="pxd-case__link"
                                    href={getSupplierRecordHref(
                                      row.supplierRecordId,
                                    )}
                                    target="_top"
                                  >
                                    {copy.openSupplier}
                                  </a>
                                )}
                              </td>
                              <td className="pxd-case__table-num">
                                <bdi>
                                  {formatWorkflowAmount(
                                    row.totalAmountMicros,
                                    row.currencyCode,
                                    locale,
                                  )}
                                </bdi>
                              </td>
                              <td>
                                {lifecycleLabel(row.lifecycleStatus, copy)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="pxd-case__muted">{copy.deterministicNote}</p>
                </section>

                {deliveryState !== null ? (
                  <section
                    aria-labelledby="pxd-case-delivery-title"
                    className="pxd-case__panel"
                  >
                    <h2 id="pxd-case-delivery-title">{copy.deliveryTitle}</h2>
                    <p>{copy.deliveryDescription}</p>
                    <dl className="pxd-case__detail">
                      <dt>{copy.deliveryStatusLabel}</dt>
                      <dd>{copy.deliveryStatuses[deliveryState.status]}</dd>
                      <dt>{copy.deliveryDueLabel}</dt>
                      <dd>
                        <bdi>
                          {deliveryState.dueAt === null
                            ? copy.noDeadline
                            : formatWorkflowDateTime(
                                deliveryState.dueAt,
                                locale,
                              )}
                        </bdi>
                      </dd>
                      <dt>{copy.deliveryNotesLabel}</dt>
                      <dd>
                        {copy.finalizedLabel}{' '}
                        {deliveryState.finalizedDeliveryNoteCount} /{' '}
                        {deliveryState.deliveryNoteCount}
                        {deliveryState.deliveryNoteCount === 0
                          ? ` — ${copy.noDeliveryNotes}`
                          : ''}
                      </dd>
                    </dl>
                  </section>
                ) : null}

                {invoiceReadiness !== null ? (
                  <section
                    aria-labelledby="pxd-case-invoice-title"
                    className="pxd-case__panel"
                  >
                    <h2 id="pxd-case-invoice-title">
                      {copy.invoiceReadinessTitle}
                    </h2>
                    <p>{copy.invoiceReadinessDescription}</p>
                    <ul className="pxd-case__gates">
                      {Object.entries(copy.gateLabels).map(
                        ([reason, label]) => {
                          const satisfied = !invoiceReadiness.missingReasons.includes(
                            reason as (typeof invoiceReadiness.missingReasons)[number],
                          );

                          return (
                            <li className="pxd-case__gate" key={reason}>
                              <span>{label}</span>
                              <span
                                className={`pxd-case__gate-state pxd-case__gate-state--${
                                  satisfied ? 'ok' : 'missing'
                                }`}
                              >
                                {satisfied
                                  ? copy.gateSatisfied
                                  : copy.gateMissing}
                              </span>
                            </li>
                          );
                        },
                      )}
                    </ul>
                    <p className="pxd-case__muted">
                      {copy.readinessDerivesFrom}
                    </p>
                  </section>
                ) : null}
              </div>
            ) : (
              <div className="pxd-case__state">
                <h2>{copy.noCaseSelectedTitle}</h2>
                <p className="pxd-case__muted">{copy.noCaseSelectedBody}</p>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier:
    PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.caseWorkflow,
  name: 'case-workflow',
  description:
    'Read-only native case timeline, price comparison, delivery and invoice-readiness view.',
  component: CaseWorkflow,
});
