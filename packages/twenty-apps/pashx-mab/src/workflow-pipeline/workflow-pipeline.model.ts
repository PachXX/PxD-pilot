import {
  PASHX_PROCUREMENT_CASE_STAGES,
  getPashxMabStageTransition,
  type PashxCommercialDocumentType,
  type PashxProcurementCaseStage,
} from 'pashx-mab-contract';

import type {
  WorkflowPipelineCard,
  WorkflowPipelineColumn,
  WorkflowPipelineDocumentRecord,
  WorkflowPipelineEvidence,
  WorkflowPipelineResult,
  WorkflowPipelineSummary,
} from './workflow-pipeline.types';
import { isAcceptedComplianceException } from '../command-centre/compliance-status';

export const getNextWorkflowPipelineStage = (
  stage: PashxProcurementCaseStage,
): PashxProcurementCaseStage | null => {
  const transition = PASHX_PROCUREMENT_CASE_STAGES
    .map((candidate) => getPashxMabStageTransition(stage, candidate))
    .find((candidate) => candidate !== undefined);

  return transition?.to ?? null;
};

export const isAllowedWorkflowPipelineMove = (
  fromStage: PashxProcurementCaseStage,
  toStage: PashxProcurementCaseStage,
): boolean => getPashxMabStageTransition(fromStage, toStage) !== undefined;

const ACTIVE_STAGES = new Set<PashxProcurementCaseStage>([
  'intake',
  'sourcing',
  'quoted',
  'customer-order',
  'vendor-order',
  'delivery',
  'invoicing',
]);

const EVIDENCE_PRIORITY: Readonly<
  Partial<Record<PashxCommercialDocumentType, number>>
> = {
  customerInvoice: 0,
  customerPurchaseOrder: 1,
  customerQuote: 2,
  vendorPurchaseOrder: 3,
  vendorQuote: 4,
  vendorInvoice: 5,
};

const isValidDate = (value: string | null): value is string =>
  value !== null && !Number.isNaN(Date.parse(value));

const isFinalized = (document: WorkflowPipelineDocumentRecord): boolean =>
  document.lifecycleStatus === 'FINALIZED';

const toEvidence = (
  document: WorkflowPipelineDocumentRecord,
): WorkflowPipelineEvidence | null => {
  if (
    !isFinalized(document) ||
    document.documentType === null ||
    EVIDENCE_PRIORITY[document.documentType] === undefined ||
    document.totalAmountMicros === null ||
    document.currencyCode === null
  ) {
    return null;
  }

  return {
    documentId: document.id,
    reference: document.name,
    documentType: document.documentType,
    issueDate: document.issueDate,
    currencyCode: document.currencyCode,
    totalAmountMicros: document.totalAmountMicros,
  };
};

export const selectLatestPipelineEvidence = (
  documents: readonly WorkflowPipelineDocumentRecord[],
): WorkflowPipelineEvidence | null => {
  const evidence = documents
    .map(toEvidence)
    .filter((item): item is WorkflowPipelineEvidence => item !== null);

  evidence.sort((left, right) => {
    const leftDate = isValidDate(left.issueDate)
      ? Date.parse(left.issueDate)
      : Number.NEGATIVE_INFINITY;
    const rightDate = isValidDate(right.issueDate)
      ? Date.parse(right.issueDate)
      : Number.NEGATIVE_INFINITY;
    if (leftDate !== rightDate) return rightDate - leftDate;

    const priorityDifference =
      (EVIDENCE_PRIORITY[left.documentType] ?? Number.MAX_SAFE_INTEGER) -
      (EVIDENCE_PRIORITY[right.documentType] ?? Number.MAX_SAFE_INTEGER);
    if (priorityDifference !== 0) return priorityDifference;

    const referenceDifference = left.reference.localeCompare(right.reference);
    return referenceDifference !== 0
      ? referenceDifference
      : left.documentId.localeCompare(right.documentId);
  });

  return evidence[0] ?? null;
};

const resolveDueAt = (
  stage: PashxProcurementCaseStage,
  actionDueAt: string | null,
  supplierResponseDeadlineAt: string | null,
  deliveryDueAt: string | null,
): string | null => {
  if (stage === 'sourcing') {
    return supplierResponseDeadlineAt ?? actionDueAt;
  }
  if (stage === 'delivery') return deliveryDueAt ?? actionDueAt;

  return actionDueAt;
};

const isComplianceException = (
  document: WorkflowPipelineDocumentRecord,
): boolean => isAcceptedComplianceException(document.complianceStatus);

export const buildWorkflowPipelineCards = (
  result: WorkflowPipelineResult,
  now: Date,
): readonly WorkflowPipelineCard[] => {
  const customerNameById = new Map(
    result.companies.map((company) => [company.id, company.name]),
  );
  const customerIdById = new Map(
    result.companies.map((company) => [company.id, company.customerId]),
  );
  const documentsByCaseId = new Map<
    string,
    WorkflowPipelineDocumentRecord[]
  >();

  for (const document of result.documents) {
    const bucket = documentsByCaseId.get(document.procurementCaseRecordId) ?? [];
    bucket.push(document);
    documentsByCaseId.set(document.procurementCaseRecordId, bucket);
  }

  return result.cases.flatMap((caseRecord) => {
    if (caseRecord.stage === null) return [];
    const stage = caseRecord.stage;
    const documents = documentsByCaseId.get(caseRecord.id) ?? [];
    const dueAt = resolveDueAt(
      stage,
      caseRecord.actionDueAt,
      caseRecord.supplierResponseDeadlineAt,
      caseRecord.deliveryDueAt,
    );

    return [
      {
        caseRecord,
        stage,
        customerName:
          caseRecord.customerRecordId === null
            ? null
            : (customerNameById.get(caseRecord.customerRecordId) ?? null),
        customerId:
          caseRecord.customerRecordId === null
            ? null
            : (customerIdById.get(caseRecord.customerRecordId) ?? null),
        dueAt,
        isOverdue:
          ACTIVE_STAGES.has(stage) &&
          isValidDate(dueAt) &&
          Date.parse(dueAt) < now.getTime(),
        documentCount: documents.length,
        finalizedDocumentCount: documents.filter(isFinalized).length,
        complianceExceptionCount: documents.filter(isComplianceException)
          .length,
        latestEvidence: selectLatestPipelineEvidence(documents),
      },
    ];
  });
};

const compareCards = (
  left: WorkflowPipelineCard,
  right: WorkflowPipelineCard,
): number => {
  if (left.isOverdue !== right.isOverdue) return left.isOverdue ? -1 : 1;

  const leftDue = isValidDate(left.dueAt)
    ? Date.parse(left.dueAt)
    : Number.POSITIVE_INFINITY;
  const rightDue = isValidDate(right.dueAt)
    ? Date.parse(right.dueAt)
    : Number.POSITIVE_INFINITY;
  if (leftDue !== rightDue) return leftDue - rightDue;

  const updatedDifference =
    Date.parse(right.caseRecord.updatedAt) - Date.parse(left.caseRecord.updatedAt);
  if (!Number.isNaN(updatedDifference) && updatedDifference !== 0) {
    return updatedDifference;
  }

  const nameDifference = left.caseRecord.name.localeCompare(
    right.caseRecord.name,
  );
  return nameDifference !== 0
    ? nameDifference
    : left.caseRecord.id.localeCompare(right.caseRecord.id);
};

export const buildWorkflowPipelineColumns = ({
  cards,
  includeArchived,
  searchTerm,
}: {
  cards: readonly WorkflowPipelineCard[];
  includeArchived: boolean;
  searchTerm: string;
}): readonly WorkflowPipelineColumn[] => {
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const visibleStages = includeArchived
    ? PASHX_PROCUREMENT_CASE_STAGES
    : PASHX_PROCUREMENT_CASE_STAGES.filter((stage) => ACTIVE_STAGES.has(stage));
  const visibleCards = cards.filter((card) => {
    if (!includeArchived && !ACTIVE_STAGES.has(card.stage)) return false;
    if (normalizedSearch === '') return true;

    return [
      card.caseRecord.name,
      card.caseRecord.projectName ?? '',
      card.customerName ?? '',
    ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
  });

  return visibleStages.map((stage) => ({
    stage,
    cards: visibleCards.filter((card) => card.stage === stage).sort(compareCards),
  }));
};

export const buildWorkflowPipelineSummary = (
  cards: readonly WorkflowPipelineCard[],
): WorkflowPipelineSummary => ({
  visibleCaseCount: cards.length,
  activeCaseCount: cards.filter((card) => ACTIVE_STAGES.has(card.stage)).length,
  overdueCaseCount: cards.filter((card) => card.isOverdue).length,
  complianceExceptionCount: cards.reduce(
    (total, card) => total + card.complianceExceptionCount,
    0,
  ),
  finalizedDocumentCount: cards.reduce(
    (total, card) => total + card.finalizedDocumentCount,
    0,
  ),
  totalDocumentCount: cards.reduce(
    (total, card) => total + card.documentCount,
    0,
  ),
});

export const getWorkflowPipelineCaseHref = (caseId: string): string =>
  `/object/procurementCase/${encodeURIComponent(caseId)}`;

export const getWorkflowPipelineDocumentHref = (documentId: string): string =>
  `/object/commercialDocument/${encodeURIComponent(documentId)}`;

export const isWorkflowPipelineActiveStage = (
  stage: PashxProcurementCaseStage,
): boolean => ACTIVE_STAGES.has(stage);
