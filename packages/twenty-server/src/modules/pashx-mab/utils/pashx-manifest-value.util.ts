import {
  type PashxCommercialDocumentType,
  type PashxDocumentLifecycleStatus,
} from 'pashx-mab-contract';

// Translation between the contract vocabulary and the workspace SELECT option values.
//
// Twenty's metadata validator requires SELECT option values to be UPPER_CASE snake_case and
// rejects the contract's camelCase spellings outright:
//   INVALID_FIELD_INPUT: Value must be in UPPER_CASE and follow snake_case "vendorPurchaseOrder"
//
// The contract keeps its own spelling — it is the shared domain vocabulary used by the command
// payloads, the front component and the tests, and reshaping it to satisfy a storage-layer
// validator would let the metadata engine dictate the domain language. The translation is done
// here instead, at the single point where contract values are written into workspace records.
//
// These are exhaustive Records rather than a generic camelCase-to-UPPER_SNAKE function on
// purpose: adding a value to the contract must fail the TypeScript build here, rather than
// silently producing an option value the workspace column will reject at INSERT time. That
// failure mode is invisible until a record is actually written.

export const PASHX_DOCUMENT_TYPE_MANIFEST_VALUES: Record<
  PashxCommercialDocumentType,
  string
> = {
  rfq: 'RFQ',
  vendorQuote: 'VENDOR_QUOTE',
  customerQuote: 'CUSTOMER_QUOTE',
  customerPurchaseOrder: 'CUSTOMER_PURCHASE_ORDER',
  vendorPurchaseOrder: 'VENDOR_PURCHASE_ORDER',
  deliveryNote: 'DELIVERY_NOTE',
  customerInvoice: 'CUSTOMER_INVOICE',
  customerCreditNote: 'CUSTOMER_CREDIT_NOTE',
  vendorCreditNote: 'VENDOR_CREDIT_NOTE',
  creditNote: 'CREDIT_NOTE',
  debitNote: 'DEBIT_NOTE',
};

export const PASHX_LIFECYCLE_STATUS_MANIFEST_VALUES: Record<
  PashxDocumentLifecycleStatus,
  string
> = {
  draft: 'DRAFT',
  finalized: 'FINALIZED',
  cancelled: 'CANCELLED',
  credited: 'CREDITED',
};

export const toManifestDocumentType = (
  documentType: PashxCommercialDocumentType,
): string => PASHX_DOCUMENT_TYPE_MANIFEST_VALUES[documentType];

export const toManifestLifecycleStatus = (
  lifecycleStatus: PashxDocumentLifecycleStatus,
): string => PASHX_LIFECYCLE_STATUS_MANIFEST_VALUES[lifecycleStatus];
