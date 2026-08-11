import { type ReactElement, useRef, useState } from 'react';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  closeSidePanel,
  enqueueSnackbar,
  unmountFrontComponent,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';
import {
  PASHX_MAB_CONTRACT_VERSION,
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

  const close = (): void => {
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

    setSubmitting(true);
    setStatusMessage(text.creating);
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
        commercialDocumentRecordId: globalThis.crypto.randomUUID(),
        idempotencyKey: globalThis.crypto.randomUUID(),
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

    try {
      const response = await new RestApiClient().post<
        | PashxCommandSuccess<PashxVendorPurchaseOrderResult>
        | PashxCommandError
      >('/rest/pashx-mab/vendor-purchase-orders', request);

      if (!response.ok) {
        setStatusMessage(
          getPashxCommandErrorMessage(response.code, locale),
        );
        return;
      }

      await enqueueSnackbar({
        message: `${response.result.documentNumber} created as a draft.`,
        variant: 'success',
      });
      close();
    } catch {
      setStatusMessage(text.loadError);
    } finally {
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
          disabled={submitting}
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
          {submitting ? text.creating : text.create}
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
