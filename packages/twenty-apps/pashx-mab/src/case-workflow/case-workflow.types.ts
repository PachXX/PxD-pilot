import type {
  PashxCaseDeliveryStatus,
  PashxCommercialDocumentType,
  PashxProcurementCaseStage,
} from 'pashx-mab-contract';

export type CaseWorkflowCaseRecord = Readonly<{
  id: string;
  name: string;
  stage: PashxProcurementCaseStage | null;
  deliveryStatus: PashxCaseDeliveryStatus | null;
  deliveryDueAt: string | null;
  updatedAt: string;
}>;

export type CaseWorkflowDocumentRecord = Readonly<{
  id: string;
  name: string;
  procurementCaseRecordId: string;
  documentType: PashxCommercialDocumentType | null;
  lifecycleStatus: string | null;
  supplierRecordId: string | null;
  issueDate: string | null;
  currencyCode: string | null;
  totalAmountMicros: number | null;
}>;

export type CaseWorkflowResult = Readonly<{
  cases: readonly CaseWorkflowCaseRecord[];
  documents: readonly CaseWorkflowDocumentRecord[];
  isPartial: boolean;
  asOf: string;
}>;

export type CaseWorkflowStageState =
  | 'complete'
  | 'current'
  | 'upcoming'
  | 'cancelled';

export type CaseWorkflowStageRailEntry = Readonly<{
  stage: PashxProcurementCaseStage;
  state: CaseWorkflowStageState;
  position: number;
}>;

export type CaseWorkflowPriceComparisonRow = Readonly<{
  documentId: string;
  documentName: string;
  supplierRecordId: string | null;
  totalAmountMicros: number | null;
  currencyCode: string | null;
  lifecycleStatus: string | null;
}>;

export type CaseWorkflowDeliveryState = Readonly<{
  status: PashxCaseDeliveryStatus;
  dueAt: string | null;
  deliveryNoteCount: number;
  finalizedDeliveryNoteCount: number;
  deliveryNoteDocumentIds: readonly string[];
}>;

export type CaseWorkflowInvoiceReadiness = Readonly<{
  customerPurchaseOrderCount: number;
  finalizedCustomerPurchaseOrderCount: number;
  deliveryNoteCount: number;
  finalizedDeliveryNoteCount: number;
  customerInvoiceCount: number;
  finalizedCustomerInvoiceCount: number;
  missingReasons: readonly CaseWorkflowInvoiceMissingReason[];
}>;

export type CaseWorkflowInvoiceMissingReason =
  | 'missing-finalized-customer-purchase-order'
  | 'missing-finalized-delivery-note'
  | 'missing-finalized-customer-invoice';
