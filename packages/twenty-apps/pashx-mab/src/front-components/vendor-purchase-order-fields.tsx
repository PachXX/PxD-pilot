import {
  type Dispatch,
  type ReactElement,
  type SetStateAction,
} from 'react';

import {
  createVendorPurchaseOrderCopy,
  type PashxCommandLocale,
} from './create-vendor-purchase-order.copy';
import { createVendorPurchaseOrderStyles as styles } from './create-vendor-purchase-order.styles';
import { type PashxSupplier } from './use-vendor-purchase-order-data';

export const VendorPurchaseOrderFields = ({
  locale,
  companies,
  supplierRecordId,
  setSupplierRecordId,
  issueDate,
  setIssueDate,
  currency,
  setCurrency,
  vendorReference,
  setVendorReference,
  loading,
  submitting,
  statusMessage,
}: {
  locale: PashxCommandLocale;
  companies: readonly PashxSupplier[];
  supplierRecordId: string;
  setSupplierRecordId: Dispatch<SetStateAction<string>>;
  issueDate: string;
  setIssueDate: Dispatch<SetStateAction<string>>;
  currency: string;
  setCurrency: Dispatch<SetStateAction<string>>;
  vendorReference: string;
  setVendorReference: Dispatch<SetStateAction<string>>;
  loading: boolean;
  submitting: boolean;
  statusMessage: string;
}): ReactElement => {
  const text = createVendorPurchaseOrderCopy[locale];

  return (
    <main style={styles.body} aria-busy={loading || submitting}>
      <div style={styles.field}>
        <label htmlFor="pashx-supplier" style={styles.label}>
          {text.supplier}
        </label>
        <select
          className="pashx-command-input"
          id="pashx-supplier"
          style={styles.input}
          value={supplierRecordId}
          disabled={loading}
          onChange={(event) => setSupplierRecordId(event.target.value)}
        >
          <option value="">{text.chooseSupplier}</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>
      <div style={styles.field}>
        <label htmlFor="pashx-issue-date" style={styles.label}>
          {text.issueDate}
        </label>
        <input
          className="pashx-command-input"
          id="pashx-issue-date"
          style={styles.input}
          type="date"
          value={issueDate}
          onChange={(event) => setIssueDate(event.target.value)}
        />
      </div>
      <div style={styles.field}>
        <label htmlFor="pashx-currency" style={styles.label}>
          {text.currency}
        </label>
        <input
          className="pashx-command-input"
          id="pashx-currency"
          style={styles.input}
          value={currency}
          maxLength={3}
          onBlur={() => setCurrency((value) => value.trim().toUpperCase())}
          onChange={(event) => setCurrency(event.target.value.toUpperCase())}
        />
      </div>
      <div style={styles.field}>
        <label htmlFor="pashx-vendor-reference" style={styles.label}>
          {text.reference}
        </label>
        <input
          className="pashx-command-input"
          id="pashx-vendor-reference"
          style={styles.input}
          value={vendorReference}
          maxLength={200}
          onChange={(event) => setVendorReference(event.target.value)}
        />
        <span style={styles.helper}>{text.referenceHint}</span>
      </div>
      <p aria-live="polite" role="status" style={styles.helper}>
        {statusMessage}
      </p>
    </main>
  );
};
