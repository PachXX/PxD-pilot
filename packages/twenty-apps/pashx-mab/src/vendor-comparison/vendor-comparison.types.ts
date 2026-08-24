import type {
  PashxCommercialDocumentType,
  PashxProcurementCaseStage,
} from 'pashx-mab-contract';

export type VendorComparisonCaseRecord = Readonly<{
  id: string;
  name: string;
  stage: PashxProcurementCaseStage | null;
  customerRecordId: string | null;
  nextActionCode: string | null;
  actionDueAt: string | null;
  supplierResponseDeadlineAt: string | null;
}>;

export type VendorComparisonDocumentRecord = Readonly<{
  id: string;
  name: string;
  procurementCaseRecordId: string;
  documentType: PashxCommercialDocumentType | null;
  lifecycleStatus: string | null;
  supplierRecordId: string | null;
  issueDate: string | null;
  currencyCode: string | null;
  totalAmountMicros: number | null;
  leadTimeDays: number | null;
  paymentTerms: string | null;
  validUntil: string | null;
}>;

export type VendorComparisonCompanyRecord = Readonly<{
  id: string;
  name: string;
  commercialRegistrationNumber: string | null;
  vatRegistrationNumber: string | null;
}>;

export type VendorComparisonResult = Readonly<{
  case: VendorComparisonCaseRecord | null;
  documents: readonly VendorComparisonDocumentRecord[];
  companies: readonly VendorComparisonCompanyRecord[];
  isPartial: boolean;
  asOf: string;
}>;

export type VendorComparisonRankedQuote = Readonly<{
  rank: number;
  documentId: string;
  reference: string;
  supplierRecordId: string | null;
  currencyCode: string | null;
  totalAmountMicros: number;
  leadTimeDays: number | null;
  paymentTerms: string | null;
  validUntil: string | null;
}>;

export type VendorComparisonExcludedQuote = Readonly<{
  documentId: string;
  reference: string;
  reason: 'expired';
  validUntil: string;
}>;

export type VendorComparisonRecommendation =
  | Readonly<{
      status: 'ranked';
      ranking: readonly VendorComparisonRankedQuote[];
      excluded: readonly VendorComparisonExcludedQuote[];
    }>
  | Readonly<{ status: 'no-finalized-quotes' }>
  | Readonly<{ status: 'mixed-currency'; currencies: readonly string[] }>
  | Readonly<{ status: 'missing-total'; refs: readonly string[] }>
  | Readonly<{ status: 'conflicting-supplier-quotes'; refs: readonly string[] }>
  | Readonly<{
      status: 'all-expired';
      expiredCount: number;
      expiredRefs: readonly string[];
    }>
  | Readonly<{ status: 'insufficient-comparable'; comparableCount: number }>;

export type VendorComparisonSummary = Readonly<{
  invitedSupplierIds: readonly string[];
  invitedCount: number;
  responseSupplierIds: readonly string[];
  responseCount: number;
  priceVariance: number | null;
  priceVarianceCurrencyCode: string | null;
}>;

export type VendorComparisonEvidenceCompleteness = Readonly<{
  totalDocumentCount: number;
  finalizedDocumentCount: number;
  finalizedSupplierRfqCount: number;
  finalizedVendorQuoteCount: number;
  finalizedCustomerQuoteCount: number;
}>;

export type VendorComparisonCustomerQuotationSummary = Readonly<{
  quotations: readonly Readonly<{
    documentId: string;
    reference: string;
    lifecycleStatus: string | null;
  }>[];
  totalCount: number;
  finalizedCount: number;
}>;
