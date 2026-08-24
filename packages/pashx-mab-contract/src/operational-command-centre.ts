import type { PashxCommandCentreItem } from './command-centre.js';

export const PASHX_OPERATIONAL_WORK_SIGNALS = [
  'COMPLIANCE_EXCEPTION',
  'APPROVAL_REQUIRED',
  'BLOCKED_DATA',
  'ACTION_REQUIRED',
] as const;
export type PashxOperationalWorkSignal =
  (typeof PASHX_OPERATIONAL_WORK_SIGNALS)[number];

export const PASHX_APPROVAL_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;
export type PashxApprovalStatus = (typeof PASHX_APPROVAL_STATUSES)[number];

export const PASHX_INSIGHT_TYPES = [
  'OBSERVATION',
  'SUGGESTION',
  'DATA_QUALITY',
] as const;
export type PashxInsightType = (typeof PASHX_INSIGHT_TYPES)[number];

export const PASHX_INSIGHT_LIFECYCLE_STATUSES = [
  'ACTIVE',
  'DISMISSED',
  'SUPERSEDED',
] as const;
export type PashxInsightLifecycleStatus =
  (typeof PASHX_INSIGHT_LIFECYCLE_STATUSES)[number];

export const PASHX_INSIGHT_CONFIDENCE_LEVELS = [
  'LOW',
  'MEDIUM',
  'HIGH',
] as const;
export type PashxInsightConfidence =
  (typeof PASHX_INSIGHT_CONFIDENCE_LEVELS)[number];

export type PashxApprovalQueueItem = Readonly<{
  id: string;
  name: string;
  status: PashxApprovalStatus;
  requestedActionCode: string;
  requesterRecordId: string;
  approverRecordId: string | null;
  requestedAt: string;
  sourceRecordIds: readonly string[];
}>;

export type PashxOperationalWorkItem =
  | Readonly<{
      signal: Exclude<PashxOperationalWorkSignal, 'APPROVAL_REQUIRED'>;
      source: 'COMMAND_CENTRE';
      item: PashxCommandCentreItem;
    }>
  | Readonly<{
      signal: 'APPROVAL_REQUIRED';
      source: 'APPROVAL_REQUEST';
      item: PashxApprovalQueueItem;
    }>;

export type PashxEvidenceInsight = Readonly<{
  id: string;
  // Unknown stored values normalize to null; the read model never invents a category.
  insightType: PashxInsightType | null;
  narrative: string;
  sourceRecordIds: readonly string[];
  generatorVersion: string;
  generatedAt: string;
  confidence: PashxInsightConfidence | null;
}>;

// Bounded operational read model for the four-signal Command Centre page.
export type PashxOperationalCommandCentreResult = Readonly<{
  commandItems: readonly PashxCommandCentreItem[];
  approvals: readonly PashxApprovalQueueItem[];
  insights: readonly PashxEvidenceInsight[];
  isPartial: boolean;
  asOf: string;
}>;

export type PashxEmailIntakeCandidate = Readonly<{
  messageId: string;
  receivedAt: string;
  sender: string;
  subject: string;
  proposedTaskType: string | null;
  sourceRecordIds: readonly string[];
  reviewStatus: 'PENDING_REVIEW' | 'ACCEPTED' | 'DISMISSED';
}>;
