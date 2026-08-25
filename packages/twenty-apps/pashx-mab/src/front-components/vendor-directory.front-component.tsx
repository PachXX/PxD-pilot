import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RestApiClient } from 'twenty-client-sdk/rest';
import {
  PASHX_MAB_CONTRACT_VERSION,
  PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  getPashxCommandErrorMessage,
  type PashxCommandError,
  type PashxCommandSuccess,
  type PashxRequestSupplierRfqsRequest,
  type PashxRequestSupplierRfqsResult,
} from 'pashx-mab-contract';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useColorScheme, useLocale } from 'twenty-sdk/front-component';
import { getPublicAssetUrl } from 'twenty-sdk/utils';

import {
  buildRfqEligibleCases,
  buildVendorDirectoryRows,
  getCompanyRecordHref,
  loadVendorDirectory,
} from '../vendor-directory/load-vendor-directory';
import type {
  VendorDirectoryResult,
  VendorDirectoryRow,
} from '../vendor-directory/vendor-directory.types';
import {
  toVendorDirectoryLocale,
  vendorDirectoryCopy,
  type VendorDirectoryLocale,
} from './vendor-directory.copy';
import { vendorDirectoryStyles } from './vendor-directory.styles';
import { getOperationalProfitabilityDashboardFontStyles } from './operational-profitability-dashboard.styles';

const PASHX_COMMAND_TIMEOUT_MS = 30_000;
const createUuid = (): string => {
  const bytes = new Uint8Array(16);

  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0'));

  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
};

const VendorDirectory = () => {
  const hostLocale = useLocale();
  const colorScheme = useColorScheme();
  const [localeOverride, setLocaleOverride] =
    useState<VendorDirectoryLocale | null>(null);
  const locale = localeOverride ?? toVendorDirectoryLocale(hostLocale);
  const copy = vendorDirectoryCopy[locale];
  const mabIndusSolutionsLogoUrl = getPublicAssetUrl(
    'brand/mab-indus-solutions-logo.jpg',
  );
  const [result, setResult] = useState<VendorDirectoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [selectedVendorIds, setSelectedVendorIds] = useState<readonly string[]>(
    [],
  );
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>(
    'idle',
  );
  const [errorMessage, setErrorMessage] = useState('');

  const rows: readonly VendorDirectoryRow[] = useMemo(
    () => (result === null ? [] : buildVendorDirectoryRows(result)),
    [result],
  );
  const eligibleCases = useMemo(
    () =>
      result === null
        ? []
        : buildRfqEligibleCases(result.cases, result.documents),
    [result],
  );
  const selectedVendors = useMemo(
    () =>
      rows.filter((row) => selectedVendorIds.includes(row.vendor.id)),
    [rows, selectedVendorIds],
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
      const nextResult = await loadVendorDirectory({});
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

  const toggleVendor = (vendorId: string): void => {
    setSubmitStatus('idle');
    setSelectedVendorIds((previous) =>
      previous.includes(vendorId)
        ? previous.filter((id) => id !== vendorId)
        : [...previous, vendorId],
    );
  };

  const canSubmit =
    !submitting &&
    selectedCaseId !== '' &&
    selectedVendorIds.length > 0 &&
    dueDate.trim() !== '';

  const submit = async (): Promise<void> => {
    if (!canSubmit) return;
    const selectedCase = eligibleCases.find(
      (caseRecord) => caseRecord.id === selectedCaseId,
    );
    if (selectedCase === undefined) return;

    const idempotencyKey = createUuid();
    const request: PashxRequestSupplierRfqsRequest = {
      contractVersion: PASHX_MAB_CONTRACT_VERSION,
      procurementCaseRecordId: selectedCase.id,
      idempotencyKey,
      expectedVersion: selectedCase.aggregateVersion,
      payload: {
        dueAt: `${dueDate}T00:00:00.000Z`,
        vendorRows: selectedVendors.map((row) => ({
          supplierRfqRecordId: createUuid(),
          supplierRecordId: row.vendor.id,
        })),
      },
    };

    const abortController = new AbortController();
    const timeoutId = globalThis.setTimeout(
      () => abortController.abort(),
      PASHX_COMMAND_TIMEOUT_MS,
    );
    setSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await new RestApiClient().post<
        | PashxCommandSuccess<PashxRequestSupplierRfqsResult>
        | PashxCommandError
      >(`/rest/pashx-mab/procurement-cases/${selectedCase.id}/supplier-rfqs`, request, {
        signal: abortController.signal,
      });

      if (response.ok) {
        setSubmitStatus('success');
        setSelectedVendorIds([]);
        setDueDate('');
        void refresh();
      } else {
        setSubmitStatus('error');
        setErrorMessage(
          getPashxCommandErrorMessage(response.code, locale) ??
            copy.submitFailed,
        );
      }
    } catch {
      setSubmitStatus('error');
      setErrorMessage(copy.submitFailed);
    } finally {
      globalThis.clearTimeout(timeoutId);
      setSubmitting(false);
    }
  };

  return (
    <div
      aria-label={copy.dashboardLabel}
      className="pxd-vendor"
      data-color-scheme={colorScheme}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      lang={locale}
    >
      <style>{`${fontStyles}\n${vendorDirectoryStyles}`}</style>
      <header className="pxd-vendor__header">
        <div>
          <div className="pxd-vendor__tenant-brand">
            <span aria-hidden="true" className="pxd-vendor__tenant-logo">
              <img alt="" src={mabIndusSolutionsLogoUrl} />
            </span>
            <p className="pxd-vendor__welcome">{copy.welcomeTitle}</p>
          </div>
          <p className="pxd-vendor__eyebrow">{copy.eyebrow}</p>
          <h1 className="pxd-vendor__title">{copy.title}</h1>
          <p className="pxd-vendor__subtitle">{copy.subtitle}</p>
          {result !== null ? (
            <p className="pxd-vendor__as-of">
              {copy.observed(new Date(result.asOf).toLocaleString(
                locale === 'ar' ? 'ar-SA' : 'en-GB',
              ))}
              {' · '}
              {copy.vendorCoverage(result.vendors.length)}
            </p>
          ) : null}
        </div>
        <div className="pxd-vendor__actions">
          <button
            aria-label={copy.languageButtonLabel}
            className="pxd-vendor__button"
            lang={locale === 'ar' ? 'en' : 'ar'}
            onClick={() => setLocaleOverride(locale === 'en' ? 'ar' : 'en')}
            type="button"
          >
            {copy.languageName}
          </button>
          <button
            aria-busy={loading}
            className="pxd-vendor__button pxd-vendor__button--primary"
            disabled={loading}
            onClick={() => void refresh()}
            type="button"
          >
            {loading ? copy.refreshing : copy.refresh}
          </button>
        </div>
      </header>

      <main aria-busy={loading} className="pxd-vendor__main">
        <div aria-live="polite">
          {loading && result === null ? (
            <div className="pxd-vendor__notice" role="status">
              {copy.loading}
            </div>
          ) : null}
          {error && result === null ? (
            <div className="pxd-vendor__notice pxd-vendor__notice--error" role="alert">
              <h2>{copy.errorTitle}</h2>
              <button
                className="pxd-vendor__button pxd-vendor__button--primary"
                onClick={() => void refresh()}
                type="button"
              >
                {copy.retry}
              </button>
            </div>
          ) : null}
          {error && result !== null ? (
            <div className="pxd-vendor__notice pxd-vendor__notice--error" role="alert">
              {copy.errorTitle}
            </div>
          ) : null}
          {result?.isPartial ? (
            <div className="pxd-vendor__notice" role="status">
              {copy.partial}
            </div>
          ) : null}
        </div>

        {result !== null && result.vendors.length === 0 ? (
          <div className="pxd-vendor__state">
            <h2>{copy.emptyTitle}</h2>
            <p className="pxd-vendor__muted">{copy.emptyBody}</p>
          </div>
        ) : null}

        {result !== null && result.vendors.length > 0 ? (
          <>
            <section
              aria-labelledby="pxd-vendor-directory-title"
              className="pxd-vendor__panel"
            >
              <h2 id="pxd-vendor-directory-title">{copy.directoryTitle}</h2>
              <p>{copy.directoryDescription}</p>
              <div className="pxd-vendor__table-scroll">
                <table className="pxd-vendor__table">
                  <thead>
                    <tr>
                      <th scope="col">{copy.vendorLabel}</th>
                      <th scope="col">{copy.crLabel}</th>
                      <th scope="col">{copy.vatLabel}</th>
                      <th scope="col">{copy.openRfqLabel}</th>
                      <th scope="col">{copy.repliedLabel}</th>
                      <th scope="col">{copy.activeCasesLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.vendor.id}>
                        <td>
                          <a
                            className="pxd-vendor__link"
                            href={getCompanyRecordHref(row.vendor.id)}
                            target="_top"
                          >
                            <bdi className="pxd-vendor__isolate">
                              {row.vendor.name}
                            </bdi>
                          </a>
                        </td>
                        <td>
                          <bdi className="pxd-vendor__isolate">
                            {row.vendor.commercialRegistrationNumber ??
                              copy.noCr}
                          </bdi>
                        </td>
                        <td>
                          <bdi className="pxd-vendor__isolate">
                            {row.vendor.vatRegistrationNumber ?? copy.noVat}
                          </bdi>
                        </td>
                        <td className="pxd-vendor__table-num">
                          {row.openSupplierRfqCount}
                        </td>
                        <td className="pxd-vendor__table-num">
                          {row.vendorQuoteCount}
                        </td>
                        <td>
                          {row.activeCaseNames.length === 0 ? (
                            <span className="pxd-vendor__muted">
                              {copy.noActiveCases}
                            </span>
                          ) : (
                            <bdi className="pxd-vendor__isolate">
                              {row.activeCaseNames.join(', ')}
                            </bdi>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <aside
              aria-labelledby="pxd-vendor-request-title"
              className="pxd-vendor__panel"
            >
              <h2 id="pxd-vendor-request-title">{copy.requestRfqTitle}</h2>
              <p>{copy.requestRfqDescription}</p>
              <form
                className="pxd-vendor__form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <div className="pxd-vendor__field">
                  <label htmlFor="pxd-vendor-case">{copy.caseSelectLabel}</label>
                  <select
                    className="pxd-vendor__select"
                    id="pxd-vendor-case"
                    onChange={(event) => {
                      setSubmitStatus('idle');
                      setSelectedCaseId(event.target.value);
                    }}
                    value={selectedCaseId}
                  >
                    <option value="">{copy.selectCaseHint}</option>
                    {eligibleCases.map((caseRecord) => (
                      <option key={caseRecord.id} value={caseRecord.id}>
                        {caseRecord.name} · {copy.stages[caseRecord.stage]}
                      </option>
                    ))}
                  </select>
                  {eligibleCases.length === 0 ? (
                    <span className="pxd-vendor__hint">{copy.noEligibleCases}</span>
                  ) : null}
                </div>

                <fieldset className="pxd-vendor__field">
                  <legend>{copy.vendorSelectLabel}</legend>
                  {rows.map((row) => (
                    <label className="pxd-vendor__check" key={row.vendor.id}>
                      <input
                        checked={selectedVendorIds.includes(row.vendor.id)}
                        onChange={() => toggleVendor(row.vendor.id)}
                        type="checkbox"
                      />
                      <span>
                        <span className="pxd-vendor__check-name">
                          <bdi className="pxd-vendor__isolate">
                            {row.vendor.name}
                          </bdi>
                        </span>
                        <span className="pxd-vendor__check-meta">
                          {copy.openRfqLabel}: {row.openSupplierRfqCount} ·{' '}
                          {copy.repliedLabel}: {row.vendorQuoteCount}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>

                <div className="pxd-vendor__field">
                  <label htmlFor="pxd-vendor-due">{copy.dueDateLabel}</label>
                  <input
                    className="pxd-vendor__select"
                    id="pxd-vendor-due"
                    onChange={(event) => {
                      setSubmitStatus('idle');
                      setDueDate(event.target.value);
                    }}
                    type="date"
                    value={dueDate}
                  />
                  <span className="pxd-vendor__hint">{copy.dueDateHint}</span>
                </div>

                <button
                  className="pxd-vendor__button pxd-vendor__button--primary"
                  disabled={!canSubmit}
                  type="submit"
                >
                  {submitting ? copy.submittingRfq : copy.submitRfq}
                </button>

                {submitStatus === 'success' ? (
                  <p
                    className="pxd-vendor__status pxd-vendor__status--success"
                    role="status"
                  >
                    {copy.submitSuccess}
                  </p>
                ) : null}
                {submitStatus === 'error' ? (
                  <p
                    className="pxd-vendor__status pxd-vendor__status--error"
                    role="alert"
                  >
                    {errorMessage || copy.submitFailed}
                  </p>
                ) : null}
              </form>
              <p className="pxd-vendor__hint">
                {copy.outboundUnavailable} — {copy.noOutboundBoundary}
              </p>
            </aside>
          </>
        ) : null}
      </main>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier:
    PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.vendorDirectory,
  name: 'vendor-directory',
  description:
    'Supplier directory with RFQ activity and a bounded supplier-RFQ request flow.',
  component: VendorDirectory,
});
