import type {
  PashxBlockedReasonCode,
  PashxNextActionCode,
  PashxProcurementCaseStage,
} from 'pashx-mab-contract';

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
  updatedAt: string;
}>;

export type CommandCentreDocumentRecord = Readonly<{
  id: string;
  procurementCaseRecordId: string;
  documentType: string;
  lifecycleStatus: string;
  complianceStatus: string | null;
  supplierRecordId: string | null;
  issueDate: string | null;
  currencyCode: string | null;
  updatedAt: string;
}>;

export type CommandCentreExpenseRecord = Readonly<{
  id: string;
  procurementCaseRecordId: string;
  approvalStatus: string;
  updatedAt: string;
}>;
