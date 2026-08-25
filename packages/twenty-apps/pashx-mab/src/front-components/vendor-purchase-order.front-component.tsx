import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PASHX_COMMAND_ERROR_DEFINITIONS,
  PASHX_MAB_CONTRACT_VERSION,
  PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  PASHX_PURCHASE_ORDER_APPROVAL_ACTION_CODE,
  buildPurchaseOrderApprovalPayloadDigest,
  getPashxCommandErrorMessage,
  type PashxApprovalCommandResult,
  type PashxCommandError,
  type PashxCommandSuccess,
} from 'pashx-mab-contract';
import { RestApiClient, RestApiClientError } from 'twenty-client-sdk/rest';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  useColorScheme,
  useLocale,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';
import { getPublicAssetUrl } from 'twenty-sdk/utils';

import { loadVendorPurchaseOrder } from '../vendor-purchase-order/load-vendor-purchase-order';
import {
  buildMabProgressRail,
  buildSupplierRisk,
  buildSupportingEvidence,
  formatVendorPurchaseOrderAmount,
  formatVendorPurchaseOrderDate,
  formatVendorPurchaseOrderDateTime,
  formatVendorPurchaseOrderQuantity,
  getVendorPurchaseOrderApprovalHref,
  getVendorPurchaseOrderCaseHref,
  getVendorPurchaseOrderCompanyHref,
  getVendorPurchaseOrderDocumentHref,
  selectApprovalPanelState,
  validateVendorPurchaseOrderLines,
} from '../vendor-purchase-order/vendor-purchase-order.model';
import type {
  VendorPurchaseOrderLineValidation,
  VendorPurchaseOrderResult,
} from '../vendor-purchase-order/vendor-purchase-order.types';
import {
  toVendorPurchaseOrderLocale,
  vendorPurchaseOrderCopy,
  type VendorPurchaseOrderCopy,
  type VendorPurchaseOrderLocale,
} from './vendor-purchase-order.copy';
import { vendorPurchaseOrderStyles } from './vendor-purchase-order.styles';
import { getOperationalProfitabilityDashboardFontStyles } from './operational-profitability-dashboard.styles';

const PASHX_COMMAND_TIMEOUT_MS = 30_000;
const HOST_FETCH_TIMEOUT_ERROR_CODE = 'FRONT_COMPONENT_HOST_FETCH_TIMEOUT';

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

const isHostFetchTimeoutError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === HOST_FETCH_TIMEOUT_ERROR_CODE;

const getThrownCommandError = (
  error: unknown,
): PashxCommandError | undefined => {
  if (!(error instanceof RestApiClientError)) return undefined;
  const body = error.body;
  if (
    typeof body !== 'object' ||
    body === null ||
    !('ok' in body) ||
    body.ok !== false ||
    !('code' in body) ||
    typeof body.code !== 'string' ||
    !(body.code in PASHX_COMMAND_ERROR_DEFINITIONS)
  ) {
    return undefined;
  }
  return body as PashxCommandError;
};

const lifecycleLabel = (
  status: string | null,
  copy: VendorPurchaseOrderCopy,
): string =>
  status === null ? copy.notRecorded : copy.lifecycleStatuses[status] ?? status;

const describeLineValidation = (
  validation: VendorPurchaseOrderLineValidation,
  currencyCode: string | null,
  copy: VendorPurchaseOrderCopy,
  locale: VendorPurchaseOrderLocale,
): string | null => {
  switch (validation.status) {
    case 'ready':
    case 'no-lines':
      return null;
    case 'invalid-quantity':
      return copy.invalidQuantityBody(validation.positions.join(', '));
    case 'mixed-currency':
      return copy.mixedCurrencyBody(validation.currencies.join(', '));
    case 'mismatched-total':
      return copy.mismatchedTotalBody(
        formatVendorPurchaseOrderAmount(
          validation.expectedTotalMicros,
          currencyCode,
          locale,
        ),
        formatVendorPurchaseOrderAmount(
          validation.summedTotalMicros,
          currencyCode,
          locale,
        ),
      );
    case 'unsafe-amount':
      return copy.unsafeAmountBody(validation.positions.join(', '));
  }
};

const VendorPurchaseOrder = () => {
  const hostLocale = useLocale();
  const colorScheme = useColorScheme();
  const selectedRecordIds = useSelectedRecordIds();
  const [localeOverride, setLocaleOverride] =
    useState<VendorPurchaseOrderLocale | null>(null);
  const locale = localeOverride ?? toVendorPurchaseOrderLocale(hostLocale);
  const copy = vendorPurchaseOrderCopy[locale];
  const mabIndusSolutionsLogoUrl = getPublicAssetUrl(
    'brand/mab-indus-solutions-logo.jpg',
  );
  const [result, setResult] = useState<VendorPurchaseOrderResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentUserRecordId, setCurrentUserRecordId] = useState<string | null>(
    null,
  );
  const requestId = useRef(0);

  const poRecordId =
    selectedRecordIds.length === 1 ? (selectedRecordIds[0] ?? null) : null;

  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approvalStatusMessage, setApprovalStatusMessage] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const activeSubmission = useRef<AbortController | undefined>(undefined);

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
    void (async () => {
      try {
        const identity = (await new MetadataApiClient().query({
          currentUser: { workspaceMember: { id: true } },
        })) as {
          currentUser?: { workspaceMember?: { id?: string } | null };
        };
        setCurrentUserRecordId(
          identity.currentUser?.workspaceMember?.id ?? null,
        );
      } catch {
        setCurrentUserRecordId(null);
      }
    })();
  }, []);

  const refresh = useCallback(async () => {
    if (poRecordId === null) {
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
      const nextResult = await loadVendorPurchaseOrder({ poRecordId });
      if (requestId.current === activeRequest) setResult(nextResult);
    } catch {
      if (requestId.current === activeRequest) setError(true);
    } finally {
      if (requestId.current === activeRequest) setLoading(false);
    }
  }, [poRecordId]);

  useEffect(() => {
    void refresh();
    return () => {
      requestId.current += 1;
    };
  }, [refresh]);

  const document = result?.document ?? null;
  const caseRecord = result?.case ?? null;
  const supplier = result?.supplier ?? null;
  const lines = result?.lines ?? [];
  const asOf = result?.asOf ?? '';

  const lineValidation = useMemo(
    () => validateVendorPurchaseOrderLines({ lines, document }),
    [lines, document],
  );
  const rail = useMemo(
    () => buildMabProgressRail(caseRecord?.stage ?? null),
    [caseRecord],
  );
  const supplierRisk = useMemo(() => buildSupplierRisk(), []);
  const supportingEvidence = useMemo(
    () =>
      buildSupportingEvidence({
        approvals: result?.approvals ?? [],
        cashMovements: result?.cashMovements ?? [],
        caseDocuments: result?.caseDocuments ?? [],
        poRecordId: poRecordId ?? '',
      }),
    [result, poRecordId],
  );
  const approvalState = useMemo(
    () => selectApprovalPanelState(result?.approvals ?? [], poRecordId ?? ''),
    [result, poRecordId],
  );

  const isRequester =
    approvalState.status !== 'no-request' &&
    currentUserRecordId !== null &&
    (result?.approvals ?? []).some(
      (approval) =>
        approval.id === approvalState.approvalRecordId &&
        approval.requesterRecordId === currentUserRecordId,
    );

  const canRequest =
    document !== null &&
    document.procurementCaseRecordId !== null &&
    document.aggregateVersion !== null &&
    document.totalAmountMicros !== null &&
    document.currencyCode !== null &&
    !approvalSubmitting &&
    approvalState.status === 'no-request';

  const runApprovalCommand = useCallback(
    async (command: () => Promise<unknown>, successMessage: string) => {
      const abortController = new AbortController();
      let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
      activeSubmission.current = abortController;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = globalThis.setTimeout(() => {
          abortController.abort();
          reject(new Error('PASHX_COMMAND_TIMEOUT'));
        }, PASHX_COMMAND_TIMEOUT_MS);
      });

      setApprovalSubmitting(true);
      setApprovalStatusMessage('');
      try {
        await Promise.race([command(), timeoutPromise]);
        setApprovalStatusMessage(successMessage);
        setApprovalNote('');
        await refresh();
      } catch (commandError) {
        const thrown = getThrownCommandError(commandError);
        setApprovalStatusMessage(
          thrown !== undefined
            ? getPashxCommandErrorMessage(thrown.code, locale)
            : abortController.signal.aborted ||
                isHostFetchTimeoutError(commandError)
              ? copy.timeoutError
              : copy.errorTitle,
        );
      } finally {
        if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
        activeSubmission.current = undefined;
        setApprovalSubmitting(false);
      }
    },
    [copy, locale, refresh],
  );

  const requestApproval = async (): Promise<void> => {
    if (!canRequest || document === null) return;
    const digest = await buildPurchaseOrderApprovalPayloadDigest({
      procurementCaseRecordId: document.procurementCaseRecordId!,
      commercialDocumentRecordId: document.id,
      expectedVersion: document.aggregateVersion!,
      totalAmountMicros: document.totalAmountMicros!,
      currencyCode: document.currencyCode!,
    });
    const request = {
      contractVersion: PASHX_MAB_CONTRACT_VERSION,
      approvalRequestRecordId: createUuid(),
      idempotencyKey: createUuid(),
      name: 'Vendor purchase order approval',
      requestedActionCode: PASHX_PURCHASE_ORDER_APPROVAL_ACTION_CODE,
      payloadDigest: digest,
      sourceRecordIds: [document.id, document.procurementCaseRecordId!],
    };
    await runApprovalCommand(
      () =>
        new RestApiClient().post<
          PashxCommandSuccess<PashxApprovalCommandResult> | PashxCommandError
        >('/rest/pashx-mab/approval-requests', request),
      copy.requestSuccess,
    );
  };

  const decideApproval = async (decision: 'APPROVE' | 'REJECT' | 'CANCEL') => {
    if (approvalState.status === 'no-request') return;
    const decideRequest = {
      contractVersion: PASHX_MAB_CONTRACT_VERSION,
      idempotencyKey: createUuid(),
      expectedStatus: 'PENDING' as const,
      decision,
      decisionNote: approvalNote.trim() || 'Vendor purchase order decision',
    };
    await runApprovalCommand(
      () =>
        new RestApiClient().post<
          PashxCommandSuccess<PashxApprovalCommandResult> | PashxCommandError
        >(
          `/rest/pashx-mab/approval-requests/${approvalState.approvalRecordId}/decisions`,
          decideRequest,
        ),
      copy.decideSuccess(copy.approvalStatuses[decision === 'APPROVE' ? 'APPROVED' : decision === 'REJECT' ? 'REJECTED' : 'CANCELLED'] ?? decision),
    );
  };

  const hasConflict =
    lineValidation.status === 'mixed-currency' ||
    lineValidation.status === 'mismatched-total';
  const validationMessage = useMemo(
    () =>
      describeLineValidation(
        lineValidation,
        document?.currencyCode ?? null,
        copy,
        locale,
      ),
    [lineValidation, document, copy, locale],
  );

  return (
    <div
      aria-label={copy.dashboardLabel}
      className="pxd-vpo"
      data-color-scheme={colorScheme}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      lang={locale}
    >
      <style>{`${fontStyles}\n${vendorPurchaseOrderStyles}`}</style>
      <header className="pxd-vpo__header">
        <div>
          <div className="pxd-vpo__tenant-brand">
            <span aria-hidden="true" className="pxd-vpo__tenant-logo">
              <img alt="" src={mabIndusSolutionsLogoUrl} />
            </span>
            <p className="pxd-vpo__welcome">{copy.welcomeTitle}</p>
          </div>
          <p className="pxd-vpo__eyebrow">{copy.eyebrow}</p>
          <h1 className="pxd-vpo__title">{copy.title}</h1>
          <p className="pxd-vpo__subtitle">{copy.subtitle}</p>
          {result !== null ? (
            <p className="pxd-vpo__as-of">
              {copy.observed(formatVendorPurchaseOrderDateTime(asOf, locale))}
            </p>
          ) : null}
        </div>
        <div className="pxd-vpo__actions">
          <button
            aria-label={copy.languageButtonLabel}
            className="pxd-vpo__button"
            lang={locale === 'ar' ? 'en' : 'ar'}
            onClick={() => setLocaleOverride(locale === 'en' ? 'ar' : 'en')}
            type="button"
          >
            {copy.languageName}
          </button>
          <button
            aria-busy={loading}
            className="pxd-vpo__button pxd-vpo__button--primary"
            disabled={loading}
            onClick={() => void refresh()}
            type="button"
          >
            {loading ? copy.refreshing : copy.refresh}
          </button>
        </div>
      </header>

      <main aria-busy={loading} className="pxd-vpo__main">
        <div aria-live="polite">
          {loading ? (
            <div className="pxd-vpo__notice" role="status">
              {copy.loading}
            </div>
          ) : null}
          {error ? (
            <div className="pxd-vpo__notice" role="alert">
              <h2>{copy.errorTitle}</h2>
              <button
                className="pxd-vpo__button pxd-vpo__button--primary"
                onClick={() => void refresh()}
                type="button"
              >
                {copy.retry}
              </button>
            </div>
          ) : null}
          {result?.isPartial ? (
            <div className="pxd-vpo__notice" role="status">
              {copy.partial}
            </div>
          ) : null}
          {hasConflict ? (
            <div className="pxd-vpo__notice" role="status">
              {copy.conflict}
            </div>
          ) : null}
        </div>

        {!loading && !error && poRecordId === null ? (
          <div className="pxd-vpo__state">
            <h2>{copy.emptyTitle}</h2>
            <p className="pxd-vpo__muted">{copy.emptyBody}</p>
          </div>
        ) : null}

        {!loading && !error && poRecordId !== null && document === null ? (
          <div className="pxd-vpo__state">
            <h2>{copy.notFoundTitle}</h2>
            <p className="pxd-vpo__muted">{copy.notFoundBody}</p>
          </div>
        ) : null}

        {document !== null ? (
          <div className="pxd-vpo__stack">
            <section aria-labelledby="pxd-vpo-header-title" className="pxd-vpo__panel">
              <div className="pxd-vpo__panel-row">
                <h2 id="pxd-vpo-header-title">{copy.headerTitle}</h2>
                <a
                  className="pxd-vpo__link"
                  href={getVendorPurchaseOrderDocumentHref(document.id)}
                  target="_top"
                >
                  {copy.openDocument}
                </a>
              </div>
              <dl className="pxd-vpo__detail">
                <dt>{copy.referenceLabel}</dt>
                <dd>
                  <bdi className="pxd-vpo__isolate">{document.name}</bdi>
                </dd>
                <dt>{copy.documentTypeLabel}</dt>
                <dd>{document.documentType ?? copy.notRecorded}</dd>
                <dt>{copy.lifecycleStatusLabel}</dt>
                <dd>
                  <span
                    className={`pxd-vpo__tag pxd-vpo__tag--${
                      document.lifecycleStatus === 'FINALIZED'
                        ? 'finalized'
                        : document.lifecycleStatus === 'CANCELLED'
                          ? 'cancelled'
                          : 'draft'
                    }`}
                  >
                    {lifecycleLabel(document.lifecycleStatus, copy)}
                  </span>
                </dd>
                <dt>{copy.versionLabel}</dt>
                <dd>
                  {document.aggregateVersion === null
                    ? copy.notRecorded
                    : document.aggregateVersion}
                </dd>
                <dt>{copy.issueDateLabel}</dt>
                <dd>
                  <bdi>
                    {formatVendorPurchaseOrderDate(document.issueDate, locale)}
                  </bdi>
                </dd>
                <dt>{copy.currencyLabel}</dt>
                <dd>
                  <bdi className="pxd-vpo__mono">{document.currencyCode ?? copy.notRecorded}</bdi>
                </dd>
                <dt>{copy.totalLabel}</dt>
                <dd>
                  <bdi>
                    {formatVendorPurchaseOrderAmount(
                      document.totalAmountMicros,
                      document.currencyCode,
                      locale,
                    )}
                  </bdi>
                </dd>
                <dt>{copy.requiredByLabel}</dt>
                <dd>
                  <bdi>
                    {caseRecord?.requiredBy === null ||
                    caseRecord?.requiredBy === undefined
                      ? copy.notRecorded
                      : formatVendorPurchaseOrderDate(caseRecord.requiredBy, locale)}
                  </bdi>
                </dd>
                <dt>{copy.ownerLabel}</dt>
                <dd>
                  {result?.ownerName === null ? (
                    <span className="pxd-vpo__muted">{copy.notRecorded}</span>
                  ) : (
                    <bdi className="pxd-vpo__isolate">{result?.ownerName}</bdi>
                  )}
                </dd>
                <dt>{copy.projectLabel}</dt>
                <dd>
                  {caseRecord?.projectName === null ||
                  caseRecord?.projectName === undefined ||
                  caseRecord.projectName.trim() === '' ? (
                    <span className="pxd-vpo__muted">{copy.notRecorded}</span>
                  ) : (
                    <bdi className="pxd-vpo__isolate">{caseRecord.projectName}</bdi>
                  )}
                </dd>
              </dl>
            </section>

            <div className="pxd-vpo__split">
              <div className="pxd-vpo__stack">
                <section aria-labelledby="pxd-vpo-rail-title" className="pxd-vpo__panel">
                  <h2 id="pxd-vpo-rail-title">{copy.railTitle}</h2>
                  <p>{copy.railDescription}</p>
                  <ol className="pxd-vpo__rail">
                    {rail.map((entry) => (
                      <li className="pxd-vpo__rail-step" key={entry.step}>
                        <span>{copy.stepLabels[entry.step]}</span>
                        <span
                          className={`pxd-vpo__rail-marker pxd-vpo__rail-marker--${entry.state}`}
                        >
                          {entry.state === 'complete'
                            ? copy.stepComplete
                            : entry.state === 'current'
                              ? copy.stepCurrent
                              : copy.stepUpcoming}
                        </span>
                      </li>
                    ))}
                  </ol>
                  {caseRecord?.stage === 'closed' ? (
                    <p className="pxd-vpo__muted">{copy.terminalClosed}</p>
                  ) : null}
                  {caseRecord?.stage === 'cancelled' ? (
                    <p className="pxd-vpo__muted">{copy.terminalCancelled}</p>
                  ) : null}
                </section>

                <section aria-labelledby="pxd-vpo-lines-title" className="pxd-vpo__panel">
                  <h2 id="pxd-vpo-lines-title">{copy.linesTitle}</h2>
                  <p>{copy.linesDescription}</p>
                  {validationMessage !== null ? (
                    <div className="pxd-vpo__notice" role="status">
                      <h3>{copy.validationErrorTitle}</h3>
                      <p className="pxd-vpo__muted">{validationMessage}</p>
                    </div>
                  ) : null}
                  {lines.length === 0 ? (
                    <p className="pxd-vpo__muted">{copy.noLines}</p>
                  ) : (
                    <div className="pxd-vpo__table-scroll">
                      <table className="pxd-vpo__table">
                        <thead>
                          <tr>
                            <th scope="col" data-numeric>{copy.positionLabel}</th>
                            <th scope="col">{copy.descriptionLabel}</th>
                            <th scope="col">{copy.specificationLabel}</th>
                            <th scope="col" data-numeric>{copy.quantityLabel}</th>
                            <th scope="col">{copy.unitLabel}</th>
                            <th scope="col" data-numeric>{copy.unitPriceLabel}</th>
                            <th scope="col" data-numeric>{copy.lineTotalLabel}</th>
                            <th scope="col">
                              <span className="pxd-vpo__sr-only">{copy.sourceLabel}</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {lines.map((line) => (
                            <tr key={line.id}>
                              <td data-numeric>
                                {line.position === null
                                  ? copy.notRecorded
                                  : line.position}
                              </td>
                              <td>
                                {line.description === null ? (
                                  <span className="pxd-vpo__muted">{copy.notRecorded}</span>
                                ) : (
                                  <bdi className="pxd-vpo__isolate">{line.description}</bdi>
                                )}
                              </td>
                              <td>
                                {line.specification === null ? (
                                  <span className="pxd-vpo__muted">{copy.notRecorded}</span>
                                ) : (
                                  <bdi className="pxd-vpo__isolate">{line.specification}</bdi>
                                )}
                              </td>
                              <td data-numeric>
                                <bdi>{formatVendorPurchaseOrderQuantity(line.quantity, locale)}</bdi>
                              </td>
                              <td>
                                {line.unit === null ? (
                                  <span className="pxd-vpo__muted">{copy.notRecorded}</span>
                                ) : (
                                  <bdi className="pxd-vpo__isolate">{line.unit}</bdi>
                                )}
                              </td>
                              <td data-numeric>
                                <bdi>{formatVendorPurchaseOrderAmount(line.unitPriceMicros, line.currencyCode, locale)}</bdi>
                              </td>
                              <td data-numeric>
                                <bdi>{formatVendorPurchaseOrderAmount(line.lineTotalMicros, line.currencyCode, locale)}</bdi>
                              </td>
                              <td>
                                {line.sourceFileReference === null ? (
                                  <span className="pxd-vpo__muted">{copy.notRecorded}</span>
                                ) : (
                                  <bdi className="pxd-vpo__mono">{line.sourceFileReference}</bdi>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <h3>{copy.formulaTitle}</h3>
                  <ol className="pxd-vpo__formula">
                    {copy.formulaSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </section>
              </div>

              <div className="pxd-vpo__stack">
                <section aria-labelledby="pxd-vpo-supplier-title" className="pxd-vpo__panel">
                  <h2 id="pxd-vpo-supplier-title">{copy.supplierTitle}</h2>
                  <p>{copy.supplierDescription}</p>
                  <dl className="pxd-vpo__detail">
                    <dt>{copy.supplierLabel}</dt>
                    <dd>
                      {supplier === null ? (
                        <span className="pxd-vpo__muted">{copy.notRecorded}</span>
                      ) : (
                        <a
                          className="pxd-vpo__link"
                          href={getVendorPurchaseOrderCompanyHref(supplier.id)}
                          target="_top"
                        >
                          <bdi className="pxd-vpo__isolate">{supplier.name}</bdi>
                        </a>
                      )}
                    </dd>
                    <dt>{copy.crLabel}</dt>
                    <dd>
                      <bdi className="pxd-vpo__mono">
                        {supplier?.commercialRegistrationNumber ?? copy.missingLabel}
                      </bdi>
                    </dd>
                    <dt>{copy.vatLabel}</dt>
                    <dd>
                      <bdi className="pxd-vpo__mono">
                        {supplier?.vatRegistrationNumber ?? copy.missingLabel}
                      </bdi>
                    </dd>
                    <dt>{copy.riskLabel}</dt>
                    <dd>
                      <span className="pxd-vpo__muted">
                        {supplierRisk.status === 'not-recorded'
                          ? copy.riskNotRecorded
                          : supplierRisk.status}
                      </span>
                    </dd>
                  </dl>
                  <h3>{copy.riskTitle}</h3>
                  <p className="pxd-vpo__muted">{copy.riskBody}</p>
                </section>

                <section aria-labelledby="pxd-vpo-approval-title" className="pxd-vpo__panel">
                  <h2 id="pxd-vpo-approval-title">{copy.approvalTitle}</h2>
                  <p>{copy.approvalDescription}</p>
                  {approvalState.status === 'no-request' ? (
                    <>
                      <p className="pxd-vpo__muted">{copy.noRequest}</p>
                      <button
                        className="pxd-vpo__button pxd-vpo__button--primary"
                        disabled={!canRequest}
                        onClick={() => void requestApproval()}
                        type="button"
                      >
                        {approvalSubmitting ? copy.requesting : copy.requestApproval}
                      </button>
                    </>
                  ) : (
                    <dl className="pxd-vpo__detail">
                      <dt>{copy.lifecycleStatusLabel}</dt>
                      <dd>
                        <span
                          className={`pxd-vpo__tag pxd-vpo__tag--${approvalState.status.toLowerCase()}`}
                        >
                          {copy.approvalStatuses[approvalState.status] ?? approvalState.status}
                        </span>
                      </dd>
                      <dt>{copy.requestedAtLabel}</dt>
                      <dd>
                        <bdi>
                          {formatVendorPurchaseOrderDateTime(
                            result?.approvals.find(
                              (approval) => approval.id === approvalState.approvalRecordId,
                            )?.requestedAt ?? null,
                            locale,
                          )}
                        </bdi>
                      </dd>
                      <dt>{copy.decidedAtLabel}</dt>
                      <dd>
                        <bdi>
                          {formatVendorPurchaseOrderDateTime(
                            result?.approvals.find(
                              (approval) => approval.id === approvalState.approvalRecordId,
                            )?.decidedAt ?? null,
                            locale,
                          )}
                        </bdi>
                      </dd>
                      <dt>{copy.digestLabel}</dt>
                      <dd>
                        <bdi className="pxd-vpo__mono">
                          {result?.approvals.find(
                            (approval) => approval.id === approvalState.approvalRecordId,
                          )?.payloadDigest ?? copy.notRecorded}
                        </bdi>
                      </dd>
                      <dt>{copy.decisionNoteLabel}</dt>
                      <dd>
                        {result?.approvals.find(
                          (approval) => approval.id === approvalState.approvalRecordId,
                        )?.decisionNote ?? copy.notRecorded}
                      </dd>
                    </dl>
                  )}

                  {approvalState.status !== 'no-request' ? (
                    <a
                      className="pxd-vpo__link"
                      href={getVendorPurchaseOrderApprovalHref(
                        approvalState.approvalRecordId,
                      )}
                      target="_top"
                    >
                      {copy.openApproval}
                    </a>
                  ) : null}

                  {approvalState.status === 'PENDING' ? (
                    isRequester ? (
                      <>
                        <p className="pxd-vpo__muted">{copy.selfDecisionBlocked}</p>
                        <button
                          className="pxd-vpo__button pxd-vpo__button--danger"
                          disabled={approvalSubmitting}
                          onClick={() => void decideApproval('CANCEL')}
                          type="button"
                        >
                          {approvalSubmitting ? copy.deciding : copy.cancelApproval}
                        </button>
                      </>
                    ) : (
                      <>
                        <label htmlFor="pxd-vpo-approval-note">{copy.decisionNoteLabel}</label>
                        <textarea
                          className="pxd-vpo__approval-note"
                          id="pxd-vpo-approval-note"
                          onChange={(event) => setApprovalNote(event.target.value)}
                          placeholder={copy.approvalNotePlaceholder}
                          value={approvalNote}
                        />
                        <div className="pxd-vpo__actions">
                          <button
                            className="pxd-vpo__button pxd-vpo__button--primary"
                            disabled={approvalSubmitting}
                            onClick={() => void decideApproval('APPROVE')}
                            type="button"
                          >
                            {approvalSubmitting ? copy.deciding : copy.approve}
                          </button>
                          <button
                            className="pxd-vpo__button pxd-vpo__button--danger"
                            disabled={approvalSubmitting}
                            onClick={() => void decideApproval('REJECT')}
                            type="button"
                          >
                            {approvalSubmitting ? copy.deciding : copy.reject}
                          </button>
                        </div>
                      </>
                    )
                  ) : null}
                  {approvalStatusMessage !== '' ? (
                    <p className="pxd-vpo__muted" role="status">
                      {approvalStatusMessage}
                    </p>
                  ) : null}
                </section>

                <section aria-labelledby="pxd-vpo-evidence-title" className="pxd-vpo__panel">
                  <h2 id="pxd-vpo-evidence-title">{copy.evidenceTitle}</h2>
                  <p>{copy.evidenceDescription}</p>
                  <ul className="pxd-vpo__evidence">
                    {supportingEvidence.map((evidence) => (
                      <li className="pxd-vpo__evidence-item" key={evidence.kind}>
                        <span>{copy.evidenceKinds[evidence.kind]}</span>
                        <span
                          className={`pxd-vpo__tag pxd-vpo__tag--${
                            evidence.status === 'recorded' ? 'approved' : 'missing'
                          }`}
                        >
                          {evidence.status === 'recorded'
                            ? copy.recorded
                            : copy.notRecorded}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section aria-labelledby="pxd-vpo-download-title" className="pxd-vpo__panel">
                  <h2 id="pxd-vpo-download-title">{copy.downloadTitle}</h2>
                  <p className="pxd-vpo__muted">{copy.downloadUnavailableBody}</p>
                  <span className="pxd-vpo__tag pxd-vpo__tag--missing">
                    {copy.downloadUnavailable}
                  </span>
                </section>

                <section aria-labelledby="pxd-vpo-related-title" className="pxd-vpo__panel">
                  <h2 id="pxd-vpo-related-title">{copy.relatedCaseTitle}</h2>
                  <p>
                    {caseRecord === null ? (
                      <span className="pxd-vpo__muted">{copy.notRecorded}</span>
                    ) : (
                      <a
                        className="pxd-vpo__link"
                        href={getVendorPurchaseOrderCaseHref(caseRecord.id)}
                        target="_top"
                      >
                        <bdi className="pxd-vpo__isolate">{caseRecord.name}</bdi>
                      </a>
                    )}
                  </p>
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
    PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.vendorPurchaseOrder,
  name: 'vendor-purchase-order',
  description:
    'Read-only Vendor Purchase Order detail with source-backed header, MAB progress, lines, approval and evidence.',
  component: VendorPurchaseOrder,
});
