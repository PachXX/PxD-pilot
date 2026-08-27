import type {
  PashxApprovalQueueItem,
  PashxBlockedReasonCode,
  PashxCaseDeliveryStatus,
  PashxCommandCentreItem,
  PashxCommercialDocumentType,
  PashxEvidenceInsight,
  PashxNextActionCode,
  PashxOperationalWorkItem,
  PashxProcurementCaseStage,
} from 'pashx-mab-contract';
import type {
  CashMovementDirection,
  CashMovementVerificationStatus,
} from '../profitability/operational-profitability.types';

export type CommandCentreCaseRecord = Readonly<{
  id: string;
  name: string;
  customerRecordId: string | null;
  projectName: string | null;
  ownerRecordId: string | null;
  stage: PashxProcurementCaseStage | null;
  nextActionCode: PashxNextActionCode | null;
  actionDueAt: string | null;
  blockedReasonCode: PashxBlockedReasonCode | null;
  deliveryStatus: PashxCaseDeliveryStatus | null;
  deliveryDueAt: string | null;
  supplierResponseDeadlineAt: string | null;
  updatedAt: string;
}>;

export type CommandCentreDocumentRecord = Readonly<{
  id: string;
  name: string;
  procurementCaseRecordId: string;
  documentType: string;
  normalizedDocumentType: PashxCommercialDocumentType | null;
  lifecycleStatus: string;
  complianceStatus: string | null;
  supplierRecordId: string | null;
  issueDate: string | null;
  currencyCode: string | null;
  totalAmountMicros: number | null;
  leadTimeDays: number | null;
  paymentTerms: string | null;
  validUntil: string | null;
  updatedAt: string;
}>;

export type CommandCentreExpenseRecord = Readonly<{
  id: string;
  procurementCaseRecordId: string;
  approvalStatus: string;
  updatedAt: string;
}>;

export type CommandCentreCompanyRecord = Readonly<{
  id: string;
  name: string;
  commercialRegistrationNumber: string | null;
  vatRegistrationNumber: string | null;
}>;

export type CommandCentreCashMovementRecord = Readonly<{
  id: string;
  name: string;
  direction: CashMovementDirection;
  verificationStatus: CashMovementVerificationStatus;
  procurementCaseRecordId: string;
  sourceDocumentRecordId: string | null;
  movementDate: string | null;
  amountMicros: number | null;
  currencyCode: string | null;
  bankReference: string | null;
  evidenceReference: string | null;
}>;

export type CommandCentreNativeLink = Readonly<{
  objectName: string;
  recordId: string;
  label: string;
  href: string;
}>;

export const COMMAND_CENTRE_PARTIAL_SOURCES = [
  'cases',
  'documents',
  'expenses',
  'cash',
  'companies',
  'approvals',
  'insights',
  'evidenceSourceLinks',
] as const;

export type CommandCentrePartialSource =
  (typeof COMMAND_CENTRE_PARTIAL_SOURCES)[number];

export type CommandCentreCashState =
  | Readonly<{ status: 'UNAVAILABLE' }>
  | Readonly<{ status: 'NOT_RECORDED' }>
  | Readonly<{
      status: 'VERIFIED';
      currencies: readonly Readonly<{
        currencyCode: string;
        inflowMicros: bigint;
        outflowMicros: bigint;
        netCashMicros: bigint;
      }>[];
      movementLinks: readonly CommandCentreNativeLink[];
    }>;

export type CommandCentreQuotationState = Readonly<{
  finalizedInvitationCount: number;
  finalizedResponseCount: number;
  draftInvitationCount: number;
  draftResponseCount: number;
  recommendationStatus:
    | 'AWAITING_FINALIZED_RESPONSES'
    | 'INSUFFICIENT_COMPARABLE'
    | 'INCOMPARABLE'
    | 'COMPARABLE';
}>;

export type CommandCentreCaseRow = Readonly<{
  caseRecord: CommandCentreCaseRecord;
  caseLink: CommandCentreNativeLink;
  customer: CommandCentreCompanyRecord | null;
  customerLink: CommandCentreNativeLink | null;
  suppliers: readonly Readonly<{
    company: CommandCentreCompanyRecord;
    link: CommandCentreNativeLink;
  }>[];
  nextWork: PashxOperationalWorkItem | null;
  totalDocumentCount: number;
  finalizedDocumentCount: number;
  amountRecordedCount: number;
  documentLinks: readonly CommandCentreNativeLink[];
  quotation: CommandCentreQuotationState;
  deliveryStatus: PashxCaseDeliveryStatus | null;
  deliveryDueAt: string | null;
  invoices: readonly Readonly<{
    id: string;
    name: string;
    lifecycleStatus: string;
    complianceStatus: string | null;
    amountMicros: number | null;
    currencyCode: string | null;
    link: CommandCentreNativeLink;
  }>[];
  cash: CommandCentreCashState;
}>;

export type CommandCentreStageSummary = Readonly<{
  counts: Readonly<
    Record<
      Extract<
        PashxProcurementCaseStage,
        | 'intake'
        | 'sourcing'
        | 'quoted'
        | 'customer-order'
        | 'vendor-order'
        | 'delivery'
        | 'invoicing'
      >,
      number
    >
  >;
  unrecordedCount: number;
}>;

export type CommandCentreOverviewResult = Readonly<{
  commandItems: readonly PashxCommandCentreItem[];
  approvals: readonly PashxApprovalQueueItem[];
  insights: readonly PashxEvidenceInsight[];
  workQueue: readonly PashxOperationalWorkItem[];
  cases: readonly CommandCentreCaseRow[];
  stageSummary: CommandCentreStageSummary;
  recordLinks: readonly CommandCentreNativeLink[];
  isPartial: boolean;
  partialSources: readonly CommandCentrePartialSource[];
  asOf: string;
}>;
