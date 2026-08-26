import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  useColorScheme,
  useLocale,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';
import { getPublicAssetUrl } from 'twenty-sdk/utils';

import { loadVendorComparison } from '../vendor-comparison/load-vendor-comparison';
import {
  buildCustomerQuotationSummary,
  buildEvidenceCompleteness,
  buildVendorComparisonRecommendation,
  buildVendorComparisonSummary,
  formatVendorComparisonAmount,
  formatVendorComparisonDate,
  formatVendorComparisonDateTime,
  formatVendorComparisonVariance,
  getVendorComparisonCaseHref,
  getVendorComparisonCompanyHref,
  getVendorComparisonDocumentHref,
  isVendorComparisonQuoteExpired,
  selectFinalizedVendorQuotes,
} from '../vendor-comparison/vendor-comparison.model';
import type {
  VendorComparisonCompanyRecord,
  VendorComparisonResult,
} from '../vendor-comparison/vendor-comparison.types';
import {
  toVendorComparisonLocale,
  vendorComparisonCopy,
  type VendorComparisonCopy,
  type VendorComparisonLocale,
} from './vendor-comparison.copy';
import { vendorComparisonStyles } from './vendor-comparison.styles';
import { getOperationalProfitabilityDashboardFontStyles } from './operational-profitability-dashboard.styles';

const isConflictStatus = (status: string): boolean =>
  status === 'mixed-currency' ||
  status === 'missing-total' ||
  status === 'conflicting-supplier-quotes';

const lifecycleLabel = (
  status: string | null,
  copy: VendorComparisonCopy,
): string =>
  status === null ? copy.draftLabel : copy.lifecycleStatuses[status] ?? status;

const nextActionLabel = (
  code: string | null,
  copy: VendorComparisonCopy,
): string =>
  code === null
    ? copy.noNextTask
    : copy.nextActionLabels[code] ?? copy.unknownValue;

const joinNames = (values: readonly string[]): string =>
  values.length === 0 ? '—' : values.join(', ');

const VendorComparison = () => {
  const hostLocale = useLocale();
  const colorScheme = useColorScheme();
  const selectedRecordIds = useSelectedRecordIds();
  const [localeOverride, setLocaleOverride] =
    useState<VendorComparisonLocale | null>(null);
  const locale = localeOverride ?? toVendorComparisonLocale(hostLocale);
  const copy = vendorComparisonCopy[locale];
  const mabIndusSolutionsLogoUrl = getPublicAssetUrl(
    'brand/mab-indus-solutions-logo.jpg',
  );
  const [result, setResult] = useState<VendorComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  const caseId =
    selectedRecordIds.length === 1 ? (selectedRecordIds[0] ?? null) : null;

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
    if (caseId === null) {
      setResult(null);
      setLoading(false);
      setError(false);
      return;
    }
    const activeRequest = requestId.current + 1;
    requestId.current = activeRequest;
    setLoading(true);
    setError(false);

    try {
      const nextResult = await loadVendorComparison({ caseId });
      if (requestId.current === activeRequest) setResult(nextResult);
    } catch {
      if (requestId.current === activeRequest) setError(true);
    } finally {
      if (requestId.current === activeRequest) setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void refresh();
    return () => {
      requestId.current += 1;
    };
  }, [refresh]);

  const caseRecord = result?.case ?? null;
  const documents = result?.documents ?? [];
  const companies = result?.companies ?? [];
  const asOf = result?.asOf ?? '';

  const companyById = useMemo(() => {
    const index = new Map<string, VendorComparisonCompanyRecord>();
    for (const company of companies) index.set(company.id, company);
    return index;
  }, [companies]);

  const finalizedQuotes = useMemo(
    () => selectFinalizedVendorQuotes(documents),
    [documents],
  );

  const recommendation = useMemo(
    () =>
      caseRecord === null
        ? null
        : buildVendorComparisonRecommendation(finalizedQuotes, asOf),
    [caseRecord, finalizedQuotes, asOf],
  );

  const summary = useMemo(
    () => buildVendorComparisonSummary(documents, caseRecord),
    [documents, caseRecord],
  );
  const completeness = useMemo(
    () => buildEvidenceCompleteness(documents),
    [documents],
  );
  const customerQuotation = useMemo(
    () => buildCustomerQuotationSummary(documents, caseRecord),
    [documents, caseRecord],
  );
  const clientRfq = useMemo(
    () =>
      documents.find(
        (document) =>
          document.documentType === 'customerRfq' &&
          document.lifecycleStatus === 'FINALIZED',
      ) ?? null,
    [documents],
  );

  const rankByDocumentId = useMemo(() => {
    const index = new Map<string, number>();
    if (recommendation?.status === 'ranked') {
      for (const entry of recommendation.ranking) {
        index.set(entry.documentId, entry.rank);
      }
    }
    return index;
  }, [recommendation]);

  const hasConflict =
    recommendation !== null && isConflictStatus(recommendation.status);

  return (
    <div
      aria-label={copy.dashboardLabel}
      className="pxd-vc"
      data-color-scheme={colorScheme}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      lang={locale}
    >
      <style>{`${fontStyles}\n${vendorComparisonStyles}`}</style>
      <header className="pxd-vc__header">
        <div>
          <div className="pxd-vc__tenant-brand">
            <span aria-hidden="true" className="pxd-vc__tenant-logo">
              <img alt="" src={mabIndusSolutionsLogoUrl} />
            </span>
            <p className="pxd-vc__welcome">{copy.welcomeTitle}</p>
          </div>
          <p className="pxd-vc__eyebrow">{copy.eyebrow}</p>
          <h1 className="pxd-vc__title">{copy.title}</h1>
          <p className="pxd-vc__subtitle">{copy.subtitle}</p>
          {result !== null ? (
            <p className="pxd-vc__as-of">
              {copy.observed(formatVendorComparisonDateTime(result.asOf, locale))}
            </p>
          ) : null}
        </div>
        <div className="pxd-vc__actions">
          <button
            aria-label={copy.languageButtonLabel}
            className="pxd-vc__button"
            lang={locale === 'ar' ? 'en' : 'ar'}
            onClick={() => setLocaleOverride(locale === 'en' ? 'ar' : 'en')}
            type="button"
          >
            {copy.languageName}
          </button>
          <button
            aria-busy={loading}
            className="pxd-vc__button pxd-vc__button--primary"
            disabled={loading}
            onClick={() => void refresh()}
            type="button"
          >
            {loading ? copy.refreshing : copy.refresh}
          </button>
        </div>
      </header>

      <main aria-busy={loading} className="pxd-vc__main">
        <div aria-live="polite">
          {loading ? (
            <div className="pxd-vc__notice" role="status">
              {copy.loading}
            </div>
          ) : null}
          {error ? (
            <div className="pxd-vc__notice" role="alert">
              <h2>{copy.errorTitle}</h2>
              <button
                className="pxd-vc__button pxd-vc__button--primary"
                onClick={() => void refresh()}
                type="button"
              >
                {copy.retry}
              </button>
            </div>
          ) : null}
          {result?.isPartial ? (
            <div className="pxd-vc__notice" role="status">
              {copy.partial}
            </div>
          ) : null}
          {hasConflict ? (
            <div className="pxd-vc__notice" role="status">
              {copy.conflict}
            </div>
          ) : null}
        </div>

        {!loading && !error && (caseId === null || caseRecord === null) ? (
          <div className="pxd-vc__state">
            <h2>{copy.emptyTitle}</h2>
            <p className="pxd-vc__muted">{copy.emptyBody}</p>
          </div>
        ) : null}

        {caseRecord !== null ? (
          <div className="pxd-vc__stack">
            <section
              aria-labelledby="pxd-vc-case-title"
              className="pxd-vc__panel"
            >
              <div className="pxd-vc__panel-row">
                <h2 id="pxd-vc-case-title">{copy.caseHeaderTitle}</h2>
                <a
                  className="pxd-vc__link"
                  href={getVendorComparisonCaseHref(caseRecord.id)}
                  target="_top"
                >
                  {copy.openCaseLabel}
                </a>
              </div>
              <dl className="pxd-vc__detail">
                <dt>{copy.clientRfqLabel}</dt>
                <dd>
                  {clientRfq === null ? (
                    <span className="pxd-vc__muted">{copy.noClientRfq}</span>
                  ) : (
                    <a
                      className="pxd-vc__link"
                      href={getVendorComparisonDocumentHref(clientRfq.id)}
                      target="_top"
                    >
                      <bdi className="pxd-vc__isolate">{clientRfq.name}</bdi>
                    </a>
                  )}
                </dd>
                <dt>{copy.dueDateLabel}</dt>
                <dd>
                  <bdi>
                    {caseRecord.actionDueAt === null
                      ? copy.noDueDate
                      : formatVendorComparisonDateTime(
                          caseRecord.actionDueAt,
                          locale,
                        )}
                  </bdi>
                </dd>
                <dt>{copy.stageLabel}</dt>
                <dd>
                  {caseRecord.stage === null
                    ? copy.noStage
                    : copy.stages[caseRecord.stage]}
                </dd>
                <dt>{copy.evidenceCompletenessLabel}</dt>
                <dd>
                  {copy.evidenceCompletenessValue(
                    completeness.finalizedDocumentCount,
                    completeness.totalDocumentCount,
                  )}
                </dd>
              </dl>
            </section>

            <section
              aria-labelledby="pxd-vc-summary-title"
              className="pxd-vc__panel"
            >
              <h2 id="pxd-vc-summary-title">{copy.summaryTitle}</h2>
              <p>{copy.summaryDescription}</p>
              <dl className="pxd-vc__signals">
                <div className="pxd-vc__signal">
                  <dt className="pxd-vc__signal-label">{copy.invitedLabel}</dt>
                  <dd className="pxd-vc__signal-value">
                    {copy.invitedValue(summary.invitedCount)}
                  </dd>
                  <dd className="pxd-vc__signal-formula">{copy.invitedFormula}</dd>
                </div>
                <div className="pxd-vc__signal">
                  <dt className="pxd-vc__signal-label">{copy.responsesLabel}</dt>
                  <dd className="pxd-vc__signal-value">
                    {copy.responsesValue(summary.responseCount)}
                  </dd>
                  <dd className="pxd-vc__signal-formula">
                    {copy.responsesFormula}
                  </dd>
                </div>
                <div className="pxd-vc__signal">
                  <dt className="pxd-vc__signal-label">
                    {copy.responseDeadlineLabel}
                  </dt>
                  <dd className="pxd-vc__signal-value">
                    <bdi>
                      {caseRecord.supplierResponseDeadlineAt === null
                        ? copy.noDueDate
                        : formatVendorComparisonDateTime(
                            caseRecord.supplierResponseDeadlineAt,
                            locale,
                          )}
                    </bdi>
                  </dd>
                  <dd className="pxd-vc__signal-formula">
                    {copy.responseDeadlineFormula}
                  </dd>
                </div>
                <div className="pxd-vc__signal">
                  <dt className="pxd-vc__signal-label">
                    {copy.priceVarianceLabel}
                  </dt>
                  <dd className="pxd-vc__signal-value">
                    {summary.priceVariance === null
                      ? copy.notApplicable
                      : formatVendorComparisonVariance(
                          summary.priceVariance,
                          locale,
                        )}
                  </dd>
                  <dd className="pxd-vc__signal-formula">
                    {copy.priceVarianceFormula}
                  </dd>
                </div>
              </dl>
            </section>

            <section
              aria-labelledby="pxd-vc-comparison-title"
              className="pxd-vc__panel"
            >
              <h2 id="pxd-vc-comparison-title">{copy.comparisonTitle}</h2>
              <p>{copy.comparisonDescription}</p>
              {finalizedQuotes.length === 0 ? (
                <p className="pxd-vc__muted">{copy.noFinalizedQuotesBody}</p>
              ) : (
                <div className="pxd-vc__table-scroll">
                  <table className="pxd-vc__table">
                    <thead>
                      <tr>
                        <th scope="col">{copy.supplierLabel}</th>
                        <th scope="col" data-numeric>
                          {copy.totalLabel}
                        </th>
                        <th scope="col" data-numeric>
                          {copy.leadTimeLabel}
                        </th>
                        <th scope="col">{copy.paymentTermsLabel}</th>
                        <th scope="col">{copy.validityLabel}</th>
                        <th scope="col">{copy.statusLabel}</th>
                        <th scope="col">
                          <span className="pxd-vc__sr-only">{copy.sourceLabel}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {finalizedQuotes.map((quote) => {
                        const company =
                          quote.supplierRecordId === null
                            ? null
                            : (companyById.get(quote.supplierRecordId) ?? null);
                        const expired = isVendorComparisonQuoteExpired(
                          quote.validUntil,
                          asOf,
                        );
                        const rank = rankByDocumentId.get(quote.id);

                        return (
                          <tr key={quote.id}>
                            <td>
                              {company === null ? (
                                <span className="pxd-vc__muted">
                                  {copy.noSupplier}
                                </span>
                              ) : (
                                <a
                                  className="pxd-vc__link"
                                  href={getVendorComparisonCompanyHref(company.id)}
                                  target="_top"
                                >
                                  <bdi className="pxd-vc__isolate">
                                    {company.name}
                                  </bdi>
                                </a>
                              )}
                              {company !== null ? (
                                <span className="pxd-vc__muted">
                                  {' '}
                                  · {copy.vendorIdLabel}:{' '}
                                  <bdi className="pxd-vc__mono">
                                    {company.vendorId ?? copy.missingLabel}
                                  </bdi>{' '}
                                  · {copy.crLabel}:{' '}
                                  <bdi className="pxd-vc__mono">
                                    {company.commercialRegistrationNumber ??
                                      copy.missingLabel}
                                  </bdi>{' '}
                                  · {copy.vatLabel}:{' '}
                                  <bdi className="pxd-vc__mono">
                                    {company.vatRegistrationNumber ??
                                      copy.missingLabel}
                                  </bdi>
                                </span>
                              ) : null}
                            </td>
                            <td data-numeric>
                              <bdi>
                                {formatVendorComparisonAmount(
                                  quote.totalAmountMicros,
                                  quote.currencyCode,
                                  locale,
                                )}
                              </bdi>
                            </td>
                            <td data-numeric>
                              {quote.leadTimeDays === null ? (
                                <span className="pxd-vc__tag pxd-vc__tag--missing">
                                  {copy.noLeadTime}
                                </span>
                              ) : (
                                <bdi>{copy.daysSuffix(quote.leadTimeDays)}</bdi>
                              )}
                            </td>
                            <td>
                              {quote.paymentTerms === null ||
                              quote.paymentTerms.trim() === '' ? (
                                <span className="pxd-vc__muted">
                                  {copy.noPaymentTerms}
                                </span>
                              ) : (
                                <bdi className="pxd-vc__isolate">
                                  {quote.paymentTerms}
                                </bdi>
                              )}
                            </td>
                            <td>
                              <bdi>
                                {quote.validUntil === null
                                  ? copy.noValidity
                                  : formatVendorComparisonDate(
                                      quote.validUntil,
                                      locale,
                                    )}
                              </bdi>
                            </td>
                            <td>
                              {expired ? (
                                <span className="pxd-vc__tag pxd-vc__tag--expired">
                                  {copy.expiredStatus}
                                </span>
                              ) : (
                                <span className="pxd-vc__tag pxd-vc__tag--finalized">
                                  {copy.finalizedLabel}
                                </span>
                              )}
                              {rank !== undefined ? ` · #${rank}` : ''}
                            </td>
                            <td>
                              <a
                                className="pxd-vc__link"
                                href={getVendorComparisonDocumentHref(quote.id)}
                                target="_top"
                              >
                                {copy.openRecord}
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section
              aria-labelledby="pxd-vc-recommendation-title"
              className="pxd-vc__panel"
            >
              <h2 id="pxd-vc-recommendation-title">
                {copy.recommendationTitle}
              </h2>
              <p>{copy.recommendationDescription}</p>

              {recommendation !== null ? (
                recommendation.status === 'ranked' ? (
                  <div>
                    <h3>{copy.rankingTitle}</h3>
                    <ol className="pxd-vc__ranking">
                      {recommendation.ranking.map((entry) => (
                        <li className="pxd-vc__ranking-item" key={entry.documentId}>
                          <span>
                            <span className="pxd-vc__rank">{entry.rank}</span>{' '}
                            <a
                              className="pxd-vc__link"
                              href={getVendorComparisonDocumentHref(
                                entry.documentId,
                              )}
                              target="_top"
                            >
                              <bdi className="pxd-vc__isolate">
                                {entry.reference}
                              </bdi>
                            </a>
                          </span>
                          <span className="pxd-vc__table-num">
                            <bdi>
                              {formatVendorComparisonAmount(
                                entry.totalAmountMicros,
                                entry.currencyCode,
                                locale,
                              )}
                            </bdi>
                            {' · '}
                            {entry.leadTimeDays === null
                              ? `${copy.leadTimeLabel}: ${copy.noLeadTime}`
                              : `${copy.leadTimeLabel}: ${copy.daysSuffix(
                                  entry.leadTimeDays,
                                )}`}
                          </span>
                        </li>
                      ))}
                    </ol>
                    <p className="pxd-vc__muted">{copy.rankedNote}</p>
                  </div>
                ) : (
                  <div>
                    <h3>
                      {recommendation.status === 'no-finalized-quotes'
                        ? copy.noFinalizedQuotesTitle
                        : recommendation.status === 'mixed-currency'
                          ? copy.mixedCurrencyTitle
                          : recommendation.status === 'missing-total'
                            ? copy.missingTotalTitle
                            : recommendation.status ===
                                'conflicting-supplier-quotes'
                              ? copy.conflictingSupplierQuotesTitle
                              : recommendation.status === 'all-expired'
                                ? copy.allExpiredTitle
                                : copy.insufficientComparableTitle}
                    </h3>
                    <p className="pxd-vc__muted">
                      {recommendation.status === 'no-finalized-quotes'
                        ? copy.noFinalizedQuotesBody
                        : recommendation.status === 'mixed-currency'
                          ? copy.mixedCurrencyBody(
                              joinNames(recommendation.currencies),
                            )
                          : recommendation.status === 'missing-total'
                            ? copy.missingTotalBody(
                                joinNames(recommendation.refs),
                              )
                            : recommendation.status ===
                                'conflicting-supplier-quotes'
                              ? copy.conflictingSupplierQuotesBody(
                                  joinNames(recommendation.refs),
                                )
                              : recommendation.status === 'all-expired'
                                ? copy.allExpiredBody(
                                    recommendation.expiredCount,
                                  )
                                : copy.insufficientComparableBody(
                                    recommendation.comparableCount,
                                  )}
                    </p>
                  </div>
                )
              ) : null}

              <h3>{copy.formulaTitle}</h3>
              <ol className="pxd-vc__formula">
                {copy.formulaSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>

              <h3>{copy.exclusionsLabel}</h3>
              {recommendation?.status === 'ranked' &&
              recommendation.excluded.length > 0 ? (
                <ul className="pxd-vc__exclusions">
                  {recommendation.excluded.map((exclusion) => (
                    <li className="pxd-vc__exclusion" key={exclusion.documentId}>
                      {copy.expiredExclusion(exclusion.reference)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pxd-vc__muted">{copy.noExclusions}</p>
              )}
            </section>

            <div className="pxd-vc__split">
              <section
                aria-labelledby="pxd-vc-customer-quote-title"
                className="pxd-vc__panel"
              >
                <h2 id="pxd-vc-customer-quote-title">
                  {copy.customerQuotationTitle}
                </h2>
                <p>{copy.customerQuotationDescription}</p>
                {customerQuotation.totalCount === 0 ? (
                  <p className="pxd-vc__muted">{copy.noCustomerQuotes}</p>
                ) : (
                  <ul className="pxd-vc__quotes">
                    {customerQuotation.quotations.map((quotation) => (
                      <li className="pxd-vc__quote" key={quotation.documentId}>
                        <a
                          className="pxd-vc__link"
                          href={getVendorComparisonDocumentHref(
                            quotation.documentId,
                          )}
                          target="_top"
                        >
                          <bdi className="pxd-vc__isolate">
                            {quotation.reference}
                          </bdi>
                        </a>
                        <span
                          className={`pxd-vc__tag pxd-vc__tag--${
                            quotation.lifecycleStatus === 'FINALIZED'
                              ? 'finalized'
                              : 'draft'
                          }`}
                        >
                          {lifecycleLabel(quotation.lifecycleStatus, copy)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <dl className="pxd-vc__detail">
                  <dt>{copy.sourceLinkageLabel}</dt>
                  <dd>{copy.noneSelected}</dd>
                </dl>
              </section>

              <div className="pxd-vc__stack">
                <section
                  aria-labelledby="pxd-vc-next-task-title"
                  className="pxd-vc__panel"
                >
                  <h2 id="pxd-vc-next-task-title">{copy.nextTaskTitle}</h2>
                  <dl className="pxd-vc__detail">
                    <dt>{copy.nextTaskLabel}</dt>
                    <dd>
                      {nextActionLabel(caseRecord.nextActionCode, copy)}
                      {' · '}
                      <a
                        className="pxd-vc__link"
                        href={getVendorComparisonCaseHref(caseRecord.id)}
                        target="_top"
                      >
                        {copy.openCaseLabel}
                      </a>
                    </dd>
                  </dl>
                </section>
                <section
                  aria-labelledby="pxd-vc-approval-title"
                  className="pxd-vc__panel"
                >
                  <h2 id="pxd-vc-approval-title">{copy.approvalTitle}</h2>
                  <p className="pxd-vc__muted">{copy.approvalBody}</p>
                </section>
                <section
                  aria-labelledby="pxd-vc-compliance-title"
                  className="pxd-vc__panel"
                >
                  <h2 id="pxd-vc-compliance-title">{copy.complianceTitle}</h2>
                  <p className="pxd-vc__muted">{copy.complianceBody}</p>
                </section>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier:
    PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.vendorComparison,
  name: 'vendor-comparison',
  description:
    'Read-only deterministic vendor comparison for one selected procurement case.',
  component: VendorComparison,
});
