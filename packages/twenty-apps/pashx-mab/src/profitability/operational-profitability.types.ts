export const PROFITABILITY_DOCUMENT_TYPES = [
  'CUSTOMER_INVOICE',
  'CUSTOMER_CREDIT_NOTE',
  'VENDOR_PURCHASE_ORDER',
  'VENDOR_CREDIT_NOTE',
] as const;

export type ProfitabilityDocumentType =
  (typeof PROFITABILITY_DOCUMENT_TYPES)[number];

export type ProfitabilityLifecycleStatus =
  | 'DRAFT'
  | 'FINALIZED'
  | 'CANCELLED'
  | 'CREDITED';

export type ProfitabilityComplianceStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'CLEARED'
  | 'REJECTED';

export type ProfitabilityExpenseApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED';

export type ProfitabilityCaseDimension = Readonly<{
  caseRecordId: string;
  caseName: string;
  customerRecordId: string | null;
  projectName: string | null;
  ownerRecordId: string | null;
}>;

type ProfitabilityRecordBase = Readonly<{
  recordId: string;
  recordName: string;
  occurredOn: string | null;
  amountMicros: number | null;
  currencyCode: string | null;
  caseDimension: ProfitabilityCaseDimension | null;
}>;

export type ProfitabilityDocumentRecord = ProfitabilityRecordBase &
  Readonly<{
    sourceType: 'DOCUMENT';
    documentType: string;
    lifecycleStatus: ProfitabilityLifecycleStatus;
    complianceStatus: ProfitabilityComplianceStatus;
  }>;

export type ProfitabilityExpenseRecord = ProfitabilityRecordBase &
  Readonly<{
    sourceType: 'EXPENSE';
    approvalStatus: ProfitabilityExpenseApprovalStatus;
  }>;

export type ProfitabilitySourceRecord =
  | ProfitabilityDocumentRecord
  | ProfitabilityExpenseRecord;

export type CashMovementDirection = 'INFLOW' | 'OUTFLOW';

export type CashMovementVerificationStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'REJECTED';

export type CashMovementRecord = Readonly<{
  recordId: string;
  recordName: string;
  direction: CashMovementDirection;
  verificationStatus: CashMovementVerificationStatus;
  occurredOn: string | null;
  amountMicros: number | null;
  currencyCode: string | null;
  sourceDocumentRecordId: string | null;
  bankReference: string | null;
  evidenceReference: string | null;
  caseDimension: ProfitabilityCaseDimension | null;
}>;

export type ProfitabilityFilters = Readonly<{
  periodStart: string;
  periodEndExclusive: string;
  caseRecordIds?: readonly string[];
  customerRecordIds?: readonly string[];
  projectNames?: readonly string[];
  ownerRecordIds?: readonly string[];
}>;

export const PROFITABILITY_EXCLUSION_REASONS = [
  'OUTSIDE_PERIOD',
  'FILTERED_OUT',
  'MISSING_CASE',
  'MISSING_DATE',
  'MISSING_AMOUNT',
  'UNSAFE_AMOUNT',
  'INVALID_CURRENCY',
  'DRAFT',
  'CANCELLED',
  'CREDITED',
  'ZATCA_PENDING',
  'ZATCA_REJECTED',
  'UNSUPPORTED_DOCUMENT_TYPE',
  'EXPENSE_PENDING',
  'EXPENSE_REJECTED',
] as const;

export type ProfitabilityExclusionReason =
  (typeof PROFITABILITY_EXCLUSION_REASONS)[number];

export type ProfitabilityContributionKind =
  | 'REVENUE'
  | 'DIRECT_COST_DOCUMENT'
  | 'DIRECT_COST_EXPENSE';

export type ProfitabilityContribution = Readonly<{
  recordId: string;
  recordName: string;
  sourceType: ProfitabilitySourceRecord['sourceType'];
  kind: ProfitabilityContributionKind;
  occurredOn: string;
  month: string;
  currencyCode: string;
  signedAmountMicros: bigint;
  caseDimension: ProfitabilityCaseDimension;
}>;

export type ProfitabilityCurrencySummary = Readonly<{
  currencyCode: string;
  finalizedRevenueMicros: bigint;
  directCostMicros: bigint;
  grossProfitMicros: bigint;
  grossMarginBasisPoints: bigint | null;
  contributionRecordIds: readonly string[];
}>;

export type ProfitabilityBreakdownDimension =
  | 'CASE'
  | 'CUSTOMER'
  | 'PROJECT'
  | 'OWNER'
  | 'PERIOD';

export type ProfitabilityBreakdownRow = Readonly<{
  dimension: ProfitabilityBreakdownDimension;
  key: string;
  label: string;
  summary: ProfitabilityCurrencySummary;
}>;

export type OperationalProfitabilityResult = Readonly<{
  asOf: string;
  filters: ProfitabilityFilters;
  inclusionRules: readonly string[];
  currencies: readonly ProfitabilityCurrencySummary[];
  contributions: readonly ProfitabilityContribution[];
  breakdowns: Readonly<
    Record<
      ProfitabilityBreakdownDimension,
      readonly ProfitabilityBreakdownRow[]
    >
  >;
  quality: Readonly<{
    sourceRecordCount: number;
    includedRecordCount: number;
    excludedRecordCount: number;
    exclusions: Readonly<Record<ProfitabilityExclusionReason, number>>;
  }>;
  cashFlow?: VerifiedCashFlowResult;
}>;

export const CASH_FLOW_EXCLUSION_REASONS = [
  'OUTSIDE_PERIOD',
  'FILTERED_OUT',
  'MISSING_CASE',
  'MISSING_DATE',
  'MISSING_AMOUNT',
  'UNSAFE_AMOUNT',
  'INVALID_CURRENCY',
  'PENDING_VERIFICATION',
  'REJECTED',
  'MISSING_SOURCE_DOCUMENT',
  'MISSING_EVIDENCE_REFERENCE',
] as const;

export type CashFlowExclusionReason =
  (typeof CASH_FLOW_EXCLUSION_REASONS)[number];

export type VerifiedCashContribution = Readonly<{
  recordId: string;
  recordName: string;
  direction: CashMovementDirection;
  occurredOn: string;
  month: string;
  amountMicros: bigint;
  currencyCode: string;
  sourceDocumentRecordId: string;
  bankReference: string | null;
  evidenceReference: string;
  caseDimension: ProfitabilityCaseDimension;
}>;

export type VerifiedCashCurrencySummary = Readonly<{
  currencyCode: string;
  inflowMicros: bigint;
  outflowMicros: bigint;
  netCashMicros: bigint;
  contributionRecordIds: readonly string[];
}>;

export type VerifiedCashTrendPoint = VerifiedCashCurrencySummary &
  Readonly<{ period: string }>;

export type VerifiedCashFlowResult = Readonly<{
  inclusionRules: readonly string[];
  currencies: readonly VerifiedCashCurrencySummary[];
  contributions: readonly VerifiedCashContribution[];
  trend: readonly VerifiedCashTrendPoint[];
  quality: Readonly<{
    sourceRecordCount: number;
    includedRecordCount: number;
    excludedRecordCount: number;
    exclusions: Readonly<Record<CashFlowExclusionReason, number>>;
  }>;
}>;
