import type {
  PashxApprovalStatus,
  PashxCommercialDocumentType,
  PashxProcurementCaseStage,
} from 'pashx-mab-contract';

export type VendorPurchaseOrderDocumentRecord = Readonly<{
  id: string;
  name: string;
  documentType: PashxCommercialDocumentType | null;
  lifecycleStatus: string | null;
  aggregateVersion: number | null;
  procurementCaseRecordId: string | null;
  supplierRecordId: string | null;
  issueDate: string | null;
  currencyCode: string | null;
  totalAmountMicros: number | null;
  leadTimeDays: number | null;
  paymentTerms: string | null;
  validUntil: string | null;
}>;

export type VendorPurchaseOrderCaseRecord = Readonly<{
  id: string;
  name: string;
  projectName: string | null;
  ownerRecordId: string | null;
  stage: PashxProcurementCaseStage | null;
  requiredBy: string | null;
}>;

export type VendorPurchaseOrderCompanyRecord = Readonly<{
  id: string;
  name: string;
  commercialRegistrationNumber: string | null;
  vatRegistrationNumber: string | null;
}>;

export type VendorPurchaseOrderLineRecord = Readonly<{
  id: string;
  name: string;
  commercialDocumentRecordId: string;
  position: number | null;
  description: string | null;
  specification: string | null;
  quantity: number | null;
  unit: string | null;
  unitPriceMicros: number | null;
  lineTotalMicros: number | null;
  currencyCode: string | null;
  sourceFileReference: string | null;
}>;

export type VendorPurchaseOrderApprovalRecord = Readonly<{
  id: string;
  status: PashxApprovalStatus | null;
  requestedActionCode: string | null;
  requesterRecordId: string | null;
  approverRecordId: string | null;
  requestedAt: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  payloadDigest: string | null;
  sourceRecordIds: readonly string[];
}>;

export type VendorPurchaseOrderCashMovementRecord = Readonly<{
  id: string;
  direction: string | null;
  verificationStatus: string | null;
  amountMicros: number | null;
  currencyCode: string | null;
  movementDate: string | null;
  sourceDocumentRecordId: string | null;
  evidenceReference: string | null;
}>;

export type VendorPurchaseOrderResult = Readonly<{
  document: VendorPurchaseOrderDocumentRecord | null;
  case: VendorPurchaseOrderCaseRecord | null;
  supplier: VendorPurchaseOrderCompanyRecord | null;
  ownerName: string | null;
  lines: readonly VendorPurchaseOrderLineRecord[];
  approvals: readonly VendorPurchaseOrderApprovalRecord[];
  cashMovements: readonly VendorPurchaseOrderCashMovementRecord[];
  caseDocuments: readonly VendorPurchaseOrderDocumentRecord[];
  isPartial: boolean;
  asOf: string;
}>;

export type MabOperatingStepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type MabOperatingStep = Readonly<{
  step: MabOperatingStepNumber;
  stage: PashxProcurementCaseStage;
}>;

export type MabProgressStepState = 'complete' | 'current' | 'upcoming';

export type MabProgressRailEntry = Readonly<{
  step: MabOperatingStepNumber;
  stage: PashxProcurementCaseStage;
  state: MabProgressStepState;
}>;

export type VendorPurchaseOrderLineValidation =
  | Readonly<{ status: 'ready' }>
  | Readonly<{ status: 'no-lines' }>
  | Readonly<{ status: 'invalid-quantity'; positions: readonly number[] }>
  | Readonly<{
      status: 'mixed-currency';
      currencies: readonly string[];
    }>
  | Readonly<{
      status: 'mismatched-total';
      expectedTotalMicros: number;
      summedTotalMicros: number;
    }>
  | Readonly<{ status: 'unsafe-amount'; positions: readonly number[] }>;

export type SupportingEvidenceKind =
  | 'internalApproval'
  | 'supplierConfirmation'
  | 'receipt'
  | 'vendorInvoice'
  | 'verifiedPayment';

export type SupportingEvidenceState =
  | Readonly<{ kind: SupportingEvidenceKind; status: 'not-recorded' }>
  | Readonly<{
      kind: SupportingEvidenceKind;
      status: 'recorded';
      recordIds: readonly string[];
    }>;

export type SupplierRiskState = Readonly<{ status: 'not-recorded' }>;

export type ApprovalPanelState =
  | Readonly<{ status: 'no-request' }>
  | Readonly<{ status: PashxApprovalStatus; approvalRecordId: string }>;
