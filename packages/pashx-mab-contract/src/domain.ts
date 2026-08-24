export const PASHX_PARTY_ROLES = ['customer', 'supplier', 'both'] as const;
export type PashxPartyRole = (typeof PASHX_PARTY_ROLES)[number];

export const PASHX_COMMERCIAL_DOCUMENT_TYPES = [
  'rfq',
  'customerRfq',
  'supplierRfq',
  'vendorQuote',
  'customerQuote',
  'customerPurchaseOrder',
  'vendorPurchaseOrder',
  'deliveryNote',
  'vendorInvoice',
  'customerInvoice',
  'customerCreditNote',
  'vendorCreditNote',
  'creditNote',
  'debitNote',
] as const;
export type PashxCommercialDocumentType =
  (typeof PASHX_COMMERCIAL_DOCUMENT_TYPES)[number];

export const PASHX_DOCUMENT_LIFECYCLE_STATUSES = [
  'draft',
  'finalized',
  'cancelled',
  'credited',
] as const;
export type PashxDocumentLifecycleStatus =
  (typeof PASHX_DOCUMENT_LIFECYCLE_STATUSES)[number];

export const PASHX_COMPLIANCE_LIFECYCLE_STATUSES = [
  'not-required',
  'queued',
  'validating',
  'reported',
  'cleared',
  'rejected',
  'retryable-failure',
] as const;
export type PashxComplianceLifecycleStatus =
  (typeof PASHX_COMPLIANCE_LIFECYCLE_STATUSES)[number];

export const PASHX_PROCUREMENT_CASE_STAGES = [
  'intake',
  'sourcing',
  'quoted',
  'customer-order',
  'vendor-order',
  'delivery',
  'invoicing',
  'closed',
  'cancelled',
] as const;
export type PashxProcurementCaseStage =
  (typeof PASHX_PROCUREMENT_CASE_STAGES)[number];
