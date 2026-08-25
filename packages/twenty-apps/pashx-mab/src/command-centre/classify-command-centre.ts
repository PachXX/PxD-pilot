import {
  PASHX_MAB_WORKFLOW_DOCUMENT_RULES,
  type PashxCommandCentreItem,
  type PashxCommandCentreReasonCode,
  type PashxCommandCentreSignal,
} from 'pashx-mab-contract';

import type {
  CommandCentreCaseRecord,
  CommandCentreDocumentRecord,
  CommandCentreExpenseRecord,
} from './command-centre.types';
import { isAcceptedComplianceException } from './compliance-status';

const SIGNAL_PRIORITY: Record<PashxCommandCentreSignal, number> = {
  COMPLIANCE_EXCEPTION: 0,
  BLOCKED_DATA: 1,
  ACTION_REQUIRED: 2,
};

// Manifest-space (SCREAMING_SNAKE) counterpart of the contract-space document type.
const toManifestDocumentType = (value: string): string =>
  value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();

// Derived from the frozen WF1 workflow rules so the supplier requirement is never duplicated.
// Credit notes are financial corrections outside the workflow graph, so their pre-existing
// supplier requirement is kept explicitly.
const VENDOR_DOCUMENT_TYPES = new Set([
  ...Object.entries(PASHX_MAB_WORKFLOW_DOCUMENT_RULES)
    .filter(([, rule]) => rule.requiresSupplier)
    .map(([documentType]) => toManifestDocumentType(documentType)),
  'VENDOR_CREDIT_NOTE',
]);

const toItem = ({
  caseRecord,
  signal,
  reasonCode,
  recordType,
  recordId,
  sourceUpdatedAt,
  observedAt,
}: {
  caseRecord: CommandCentreCaseRecord;
  signal: PashxCommandCentreSignal;
  reasonCode: PashxCommandCentreReasonCode;
  recordType: PashxCommandCentreItem['recordType'];
  recordId: string;
  sourceUpdatedAt: string;
  observedAt: string;
}): PashxCommandCentreItem => ({
  signal,
  reasonCode,
  recordType,
  recordId,
  procurementCaseId: caseRecord.id,
  caseName: caseRecord.name,
  customerRecordId: caseRecord.customerRecordId,
  projectName: caseRecord.projectName,
  ownerRecordId: caseRecord.ownerRecordId,
  stage: caseRecord.stage,
  nextActionCode: caseRecord.nextActionCode,
  actionDueAt: caseRecord.actionDueAt,
  observedAt,
  sourceUpdatedAt,
});

const firstMissingCaseReason = (
  caseRecord: CommandCentreCaseRecord,
): PashxCommandCentreReasonCode | null => {
  if (caseRecord.customerRecordId === null) return 'CASE_CUSTOMER_MISSING';
  if (caseRecord.projectName === null || caseRecord.projectName.trim() === '') {
    return 'CASE_PROJECT_MISSING';
  }
  if (caseRecord.ownerRecordId === null) return 'CASE_OWNER_MISSING';
  return null;
};

const firstDocumentReason = (
  document: CommandCentreDocumentRecord,
  isOwnedByCurrentUser: boolean,
): Readonly<{
  signal: PashxCommandCentreSignal;
  reasonCode: PashxCommandCentreReasonCode;
}> | null => {
  if (isAcceptedComplianceException(document.complianceStatus)) {
    return {
      signal: 'COMPLIANCE_EXCEPTION',
      reasonCode:
        document.complianceStatus === 'RETRYABLE_FAILURE'
          ? 'COMPLIANCE_RETRYABLE_FAILURE'
          : 'COMPLIANCE_REJECTED',
    };
  }
  if (document.lifecycleStatus !== 'DRAFT') return null;
  if (
    VENDOR_DOCUMENT_TYPES.has(document.documentType) &&
    document.supplierRecordId === null
  ) {
    return {
      signal: 'BLOCKED_DATA',
      reasonCode: 'DRAFT_DOCUMENT_SUPPLIER_MISSING',
    };
  }
  if (document.issueDate === null) {
    return {
      signal: 'BLOCKED_DATA',
      reasonCode: 'DRAFT_DOCUMENT_ISSUE_DATE_MISSING',
    };
  }
  if (document.currencyCode === null || document.currencyCode.trim() === '') {
    return {
      signal: 'BLOCKED_DATA',
      reasonCode: 'DRAFT_DOCUMENT_CURRENCY_MISSING',
    };
  }
  return isOwnedByCurrentUser
    ? {
        signal: 'ACTION_REQUIRED',
        reasonCode: 'DRAFT_DOCUMENT_REVIEW_REQUIRED',
      }
    : null;
};

export const classifyCommandCentre = ({
  cases,
  documents,
  expenses,
  currentUserRecordId,
  observedAt,
}: {
  cases: readonly CommandCentreCaseRecord[];
  documents: readonly CommandCentreDocumentRecord[];
  expenses: readonly CommandCentreExpenseRecord[];
  currentUserRecordId: string;
  observedAt: string;
}): readonly PashxCommandCentreItem[] => {
  const casesById = new Map(
    cases.map((caseRecord) => [caseRecord.id, caseRecord]),
  );
  const items: PashxCommandCentreItem[] = [];

  for (const caseRecord of cases) {
    const reasonCode = firstMissingCaseReason(caseRecord);
    if (reasonCode !== null) {
      items.push(
        toItem({
          caseRecord,
          signal: 'BLOCKED_DATA',
          reasonCode,
          recordType: 'procurementCase',
          recordId: caseRecord.id,
          sourceUpdatedAt: caseRecord.updatedAt,
          observedAt,
        }),
      );
    }
  }

  for (const document of documents) {
    const caseRecord = casesById.get(document.procurementCaseRecordId);
    if (caseRecord === undefined) continue;
    const classification = firstDocumentReason(
      document,
      caseRecord.ownerRecordId === currentUserRecordId,
    );
    if (classification === null) continue;
    items.push(
      toItem({
        caseRecord,
        ...classification,
        recordType: 'commercialDocument',
        recordId: document.id,
        sourceUpdatedAt: document.updatedAt,
        observedAt,
      }),
    );
  }

  for (const expense of expenses) {
    const caseRecord = casesById.get(expense.procurementCaseRecordId);
    if (
      caseRecord === undefined ||
      caseRecord.ownerRecordId !== currentUserRecordId ||
      expense.approvalStatus !== 'PENDING'
    ) {
      continue;
    }
    items.push(
      toItem({
        caseRecord,
        signal: 'ACTION_REQUIRED',
        reasonCode: 'EXPENSE_REVIEW_REQUIRED',
        recordType: 'expense',
        recordId: expense.id,
        sourceUpdatedAt: expense.updatedAt,
        observedAt,
      }),
    );
  }

  return items.sort((left, right) => {
    const signalOrder =
      SIGNAL_PRIORITY[left.signal] - SIGNAL_PRIORITY[right.signal];
    if (signalOrder !== 0) return signalOrder;

    const leftDueAt = left.actionDueAt ?? '9999-12-31T23:59:59.999Z';
    const rightDueAt = right.actionDueAt ?? '9999-12-31T23:59:59.999Z';
    const dueAtOrder = leftDueAt.localeCompare(rightDueAt);
    if (dueAtOrder !== 0) return dueAtOrder;

    const updatedAtOrder = left.sourceUpdatedAt.localeCompare(
      right.sourceUpdatedAt,
    );
    return updatedAtOrder !== 0
      ? updatedAtOrder
      : left.recordId.localeCompare(right.recordId);
  });
};
