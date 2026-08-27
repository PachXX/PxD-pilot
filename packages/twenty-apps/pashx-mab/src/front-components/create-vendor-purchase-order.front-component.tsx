import { type ReactElement, useRef, useState } from 'react';
import { RestApiClient, RestApiClientError } from 'twenty-client-sdk/rest';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  closeSidePanel,
  enqueueSnackbar,
  unmountFrontComponent,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';
import {
  PASHX_MAB_CONTRACT_VERSION,
  PASHX_COMMAND_ERROR_DEFINITIONS,
  PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  getPashxCommandErrorMessage,
  type PashxCommandError,
  type PashxCommandSuccess,
  type PashxCreateVendorPurchaseOrderRequest,
  type PashxVendorPurchaseOrderResult,
} from 'pashx-mab-contract';
import { createVendorPurchaseOrderCopy } from './create-vendor-purchase-order.copy';
import { createVendorPurchaseOrderStyles as styles } from './create-vendor-purchase-order.styles';
import { useVendorPurchaseOrderData } from './use-vendor-purchase-order-data';
import { VendorPurchaseOrderFields } from './vendor-purchase-order-fields';

const PASHX_COMMAND_TIMEOUT_MS = 30_000;
const HOST_FETCH_TIMEOUT_ERROR_CODE = 'FRONT_COMPONENT_HOST_FETCH_TIMEOUT';

const createUuid = (): string => {
  const bytes = new Uint8Array(16);

  globalThis.crypto.getRandomValues(bytes);
  // Typed-array indices read as possibly-undefined under noUncheckedIndexedAccess;
  // the byte at a fixed index of a freshly filled 16-byte array is always defined.
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
  if (!(error instanceof RestApiClientError)) {
    return undefined;
  }

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

const CreateVendorPurchaseOrder = (): ReactElement => {
  const locale = globalThis.navigator?.language.startsWith('ar') ? 'ar' : 'en';
  const text = createVendorPurchaseOrderCopy[locale];
  const selectedRecordIds = useSelectedRecordIds();
  const procurementCaseRecordId =
    selectedRecordIds.length === 1 ? selectedRecordIds[0] : undefined;
  const [supplierRecordId, setSupplierRecordId] = useState('');
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [currency, setCurrency] = useState('SAR');
  const [vendorReference, setVendorReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionFailed, setSubmissionFailed] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const { companies, expectedVersion, loading, loadStatus } =
    useVendorPurchaseOrderData({
      procurementCaseRecordId,
      loadError: text.loadError,
      selectionError: text.selectionError,
    });
  const commandAttempt = useRef<
    | Readonly<{
        signature: string;
        commercialDocumentRecordId: string;
        idempotencyKey: string;
      }>
    | undefined
  >(undefined);
  const activeSubmission = useRef<AbortController | undefined>(undefined);

  const close = (): void => {
    activeSubmission.current?.abort();
    unmountFrontComponent();
    closeSidePanel();
  };
  const canSubmit =
    !loading &&
    !submitting &&
    procurementCaseRecordId !== undefined &&
    expectedVersion !== undefined &&
    supplierRecordId !== '' &&
    issueDate !== '' &&
    /^[A-Z]{3}$/.test(currency);

  const submit = async (): Promise<void> => {
    if (!canSubmit || procurementCaseRecordId === undefined) {
      return;
    }

    const signature = JSON.stringify({
      procurementCaseRecordId,
      supplierRecordId,
      issueDate,
      currency,
      vendorReference: vendorReference.trim(),
      expectedVersion,
    });
    if (commandAttempt.current?.signature !== signature) {
      commandAttempt.current = {
        signature,
        commercialDocumentRecordId: createUuid(),
        idempotencyKey: createUuid(),
      };
    }
    const request: PashxCreateVendorPurchaseOrderRequest = {
      contractVersion: PASHX_MAB_CONTRACT_VERSION,
      commercialDocumentRecordId:
        commandAttempt.current.commercialDocumentRecordId,
      idempotencyKey: commandAttempt.current.idempotencyKey,
      expectedVersion,
      payload: {
        procurementCaseRecordId,
        supplierRecordId,
        issueDate,
        currency,
        ...(vendorReference.trim() === ''
          ? {}
          : { vendorReference: vendorReference.trim() }),
      },
    };

    const abortController = new AbortController();
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
    activeSubmission.current = abortController;

    // Start the command before the first React state update. Remote DOM flushes that update back
    // to the host synchronously while this click callback is active; dispatching afterwards can
    // deadlock the callback before fetch is ever invoked.
    const requestPromise = new RestApiClient().post<
      PashxCommandSuccess<PashxVendorPurchaseOrderResult> | PashxCommandError
    >('/rest/pashx-mab/vendor-purchase-orders', request, {
      signal: abortController.signal,
    });
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = globalThis.setTimeout(() => {
        abortController.abort();
        reject(new Error('PASHX_COMMAND_TIMEOUT'));
      }, PASHX_COMMAND_TIMEOUT_MS);
    });

    setSubmitting(true);
    setSubmissionFailed(false);
    setStatusMessage(text.creating);

    try {
      const response = await Promise.race([requestPromise, timeoutPromise]);

      if (!response.ok) {
        setSubmissionFailed(true);
        setStatusMessage(getPashxCommandErrorMessage(response.code, locale));
        return;
      }

      await enqueueSnackbar({
        message: `${response.result.documentNumber} ${text.successSuffix}`,
        variant: 'success',
      });
      close();
    } catch (error) {
      const commandError = getThrownCommandError(error);

      setSubmissionFailed(true);
      setStatusMessage(
        commandError !== undefined
          ? getPashxCommandErrorMessage(commandError.code, locale)
          : abortController.signal.aborted || isHostFetchTimeoutError(error)
            ? text.timeoutError
            : text.submitError,
      );
    } finally {
      if (timeoutId !== undefined) {
        globalThis.clearTimeout(timeoutId);
      }
      if (activeSubmission.current === abortController) {
        activeSubmission.current = undefined;
      }
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <style>{`
        .pashx-command-input:focus-visible,
        .pashx-command-button:focus-visible {
          outline: 2px solid var(--t-color-blue);
          outline-offset: 2px;
        }
      `}</style>
      <header style={styles.header}>
        <h2 style={styles.title}>{text.title}</h2>
        <p style={styles.subtitle}>{text.subtitle}</p>
      </header>

      <VendorPurchaseOrderFields
        locale={locale}
        companies={companies}
        supplierRecordId={supplierRecordId}
        setSupplierRecordId={setSupplierRecordId}
        issueDate={issueDate}
        setIssueDate={setIssueDate}
        currency={currency}
        setCurrency={setCurrency}
        vendorReference={vendorReference}
        setVendorReference={setVendorReference}
        loading={loading}
        submitting={submitting}
        statusMessage={
          statusMessage || loadStatus || (loading ? text.loading : '')
        }
      />

      <footer style={styles.footer}>
        <button
          className="pashx-command-button"
          type="button"
          style={{ ...styles.button, ...styles.secondaryButton }}
          onClick={close}
        >
          {text.cancel}
        </button>
        <button
          className="pashx-command-button"
          type="button"
          style={{
            ...styles.button,
            ...styles.primaryButton,
            ...(canSubmit ? {} : styles.disabledButton),
          }}
          onClick={() => void submit()}
          disabled={!canSubmit}
          aria-describedby="pashx-command-status"
        >
          {submitting
            ? text.creating
            : submissionFailed
              ? text.retry
              : text.create}
        </button>
      </footer>
      <span id="pashx-command-status" hidden>
        {statusMessage}
      </span>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier:
    PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.createVendorPurchaseOrder,
  name: 'create-vendor-purchase-order',
  description: 'Create a draft Vendor PO from a selected procurement case.',
  component: CreateVendorPurchaseOrder,
});
