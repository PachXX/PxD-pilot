import type {
  PashxCaseDeliveryStatus,
  PashxCommercialDocumentType,
  PashxProcurementCaseStage,
} from 'pashx-mab-contract';

export type WorkflowPipelineCaseRecord = Readonly<{
  id: string;
  name: string;
  stage: PashxProcurementCaseStage | null;
  aggregateVersion: number | null;
  customerRecordId: string | null;
  projectName: string | null;
  nextActionCode: string | null;
  actionDueAt: string | null;
  blockedReasonCode: string | null;
  deliveryStatus: PashxCaseDeliveryStatus | null;
  deliveryDueAt: string | null;
  supplierResponseDeadlineAt: string | null;
  updatedAt: string;
}>;

export type WorkflowPipelineDocumentRecord = Readonly<{
  id: string;
  name: string;
  procurementCaseRecordId: string;
  documentType: PashxCommercialDocumentType | null;
  lifecycleStatus: string | null;
  complianceStatus: string | null;
  issueDate: string | null;
  currencyCode: string | null;
  totalAmountMicros: number | null;
}>;

export type WorkflowPipelineCompanyRecord = Readonly<{
  id: string;
  name: string;
  customerId: string | null;
}>;

export type WorkflowPipelineResult = Readonly<{
  cases: readonly WorkflowPipelineCaseRecord[];
  documents: readonly WorkflowPipelineDocumentRecord[];
  companies: readonly WorkflowPipelineCompanyRecord[];
  isPartial: boolean;
  asOf: string;
}>;

export type WorkflowPipelineEvidence = Readonly<{
  documentId: string;
  reference: string;
  documentType: PashxCommercialDocumentType;
  issueDate: string | null;
  currencyCode: string;
  totalAmountMicros: number;
}>;

export type WorkflowPipelineCard = Readonly<{
  caseRecord: WorkflowPipelineCaseRecord;
  stage: PashxProcurementCaseStage;
  customerName: string | null;
  customerId: string | null;
  dueAt: string | null;
  isOverdue: boolean;
  documentCount: number;
  finalizedDocumentCount: number;
  complianceExceptionCount: number;
  latestEvidence: WorkflowPipelineEvidence | null;
}>;

export type WorkflowPipelineColumn = Readonly<{
  stage: PashxProcurementCaseStage;
  cards: readonly WorkflowPipelineCard[];
}>;

export type WorkflowPipelineSummary = Readonly<{
  visibleCaseCount: number;
  activeCaseCount: number;
  overdueCaseCount: number;
  complianceExceptionCount: number;
  finalizedDocumentCount: number;
  totalDocumentCount: number;
}>;
