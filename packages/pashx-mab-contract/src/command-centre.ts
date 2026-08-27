import type { PashxProcurementCaseStage } from './domain.js';

export const PASHX_COMMAND_CENTRE_SIGNALS = [
  'COMPLIANCE_EXCEPTION',
  'BLOCKED_DATA',
  'ACTION_REQUIRED',
] as const;
export type PashxCommandCentreSignal =
  (typeof PASHX_COMMAND_CENTRE_SIGNALS)[number];

export const PASHX_COMMAND_CENTRE_REASON_CODES = [
  'CASE_CUSTOMER_MISSING',
  'CASE_PROJECT_MISSING',
  'CASE_OWNER_MISSING',
  'DRAFT_DOCUMENT_SUPPLIER_MISSING',
  'DRAFT_DOCUMENT_ISSUE_DATE_MISSING',
  'DRAFT_DOCUMENT_CURRENCY_MISSING',
  'DRAFT_DOCUMENT_REVIEW_REQUIRED',
  'EXPENSE_REVIEW_REQUIRED',
  'COMPLIANCE_REJECTED',
  'COMPLIANCE_RETRYABLE_FAILURE',
] as const;
export type PashxCommandCentreReasonCode =
  (typeof PASHX_COMMAND_CENTRE_REASON_CODES)[number];

export const PASHX_NEXT_ACTION_CODES = [
  'REVIEW_DRAFT_DOCUMENT',
  'REVIEW_PENDING_EXPENSE',
  'COMPLETE_CASE_DATA',
  'COMPLETE_DOCUMENT_DATA',
  'RESOLVE_COMPLIANCE_EXCEPTION',
] as const;
export type PashxNextActionCode = (typeof PASHX_NEXT_ACTION_CODES)[number];

export const PASHX_BLOCKED_REASON_CODES = [
  'AWAITING_CUSTOMER_INPUT',
  'AWAITING_SUPPLIER_RESPONSE',
  'AWAITING_INTERNAL_DECISION',
  'EXTERNAL_DEPENDENCY',
] as const;
export type PashxBlockedReasonCode =
  (typeof PASHX_BLOCKED_REASON_CODES)[number];

export type PashxCommandCentreRecordType =
  | 'procurementCase'
  | 'commercialDocument'
  | 'expense';

export type PashxCommandCentreItem = Readonly<{
  signal: PashxCommandCentreSignal;
  reasonCode: PashxCommandCentreReasonCode;
  recordType: PashxCommandCentreRecordType;
  recordId: string;
  procurementCaseId: string;
  caseName: string;
  customerRecordId: string | null;
  projectName: string | null;
  ownerRecordId: string | null;
  stage: PashxProcurementCaseStage | null;
  nextActionCode: PashxNextActionCode | null;
  actionDueAt: string | null;
  observedAt: string;
  sourceUpdatedAt: string;
}>;

export type PashxCommandCentreResult = Readonly<{
  items: readonly PashxCommandCentreItem[];
  isPartial: boolean;
  asOf: string;
}>;
