import type { PashxApprovalStatus } from './operational-command-centre.js';

export type PashxRequestApprovalRequest = Readonly<{
  contractVersion: 1;
  approvalRequestRecordId: string;
  idempotencyKey: string;
  name: string;
  requestedActionCode: string;
  payloadDigest: string;
  sourceRecordIds: readonly string[];
  approverRecordId?: string;
}>;

export type PashxDecideApprovalRequest = Readonly<{
  contractVersion: 1;
  idempotencyKey: string;
  expectedStatus: 'PENDING';
  decision: 'APPROVE' | 'REJECT' | 'CANCEL';
  decisionNote: string;
}>;

export type PashxApprovalCommandResult = Readonly<{
  approvalRequestRecordId: string;
  status: PashxApprovalStatus;
  decidedAt: string | null;
}>;

export type PashxApprovalValidationResult<T> =
  | Readonly<{ valid: true; value: T }>
  | Readonly<{ valid: false; fieldPaths: readonly string[] }>;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const bounded = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;

export const validateRequestApproval = (
  input: unknown,
): PashxApprovalValidationResult<PashxRequestApprovalRequest> => {
  if (!isRecord(input)) return { valid: false, fieldPaths: ['$'] };
  const sources = input.sourceRecordIds;
  const checks: readonly [boolean, string][] = [
    [input.contractVersion === 1, 'contractVersion'],
    [
      typeof input.approvalRequestRecordId === 'string' &&
        UUID.test(input.approvalRequestRecordId),
      'approvalRequestRecordId',
    ],
    [bounded(input.idempotencyKey, 200), 'idempotencyKey'],
    [bounded(input.name, 200), 'name'],
    [bounded(input.requestedActionCode, 100), 'requestedActionCode'],
    [
      typeof input.payloadDigest === 'string' &&
        SHA256.test(input.payloadDigest),
      'payloadDigest',
    ],
    [
      Array.isArray(sources) &&
        sources.length > 0 &&
        sources.length <= 50 &&
        sources.every((value) => typeof value === 'string' && UUID.test(value)),
      'sourceRecordIds',
    ],
    [
      input.approverRecordId === undefined ||
        (typeof input.approverRecordId === 'string' &&
          UUID.test(input.approverRecordId)),
      'approverRecordId',
    ],
  ];
  const fieldPaths = checks.filter(([valid]) => !valid).map(([, path]) => path);
  return fieldPaths.length === 0
    ? { valid: true, value: input as PashxRequestApprovalRequest }
    : { valid: false, fieldPaths };
};

export const validateDecideApproval = (
  input: unknown,
): PashxApprovalValidationResult<PashxDecideApprovalRequest> => {
  if (!isRecord(input)) return { valid: false, fieldPaths: ['$'] };
  const checks: readonly [boolean, string][] = [
    [input.contractVersion === 1, 'contractVersion'],
    [bounded(input.idempotencyKey, 200), 'idempotencyKey'],
    [input.expectedStatus === 'PENDING', 'expectedStatus'],
    [
      input.decision === 'APPROVE' ||
        input.decision === 'REJECT' ||
        input.decision === 'CANCEL',
      'decision',
    ],
    [bounded(input.decisionNote, 1000), 'decisionNote'],
  ];
  const fieldPaths = checks.filter(([valid]) => !valid).map(([, path]) => path);
  return fieldPaths.length === 0
    ? { valid: true, value: input as PashxDecideApprovalRequest }
    : { valid: false, fieldPaths };
};

export const approvalStatusForDecision = (
  decision: PashxDecideApprovalRequest['decision'],
): Exclude<PashxApprovalStatus, 'PENDING'> => {
  switch (decision) {
    case 'APPROVE':
      return 'APPROVED';
    case 'REJECT':
      return 'REJECTED';
    case 'CANCEL':
      return 'CANCELLED';
  }
};

export type PashxApprovalDecisionAuthorization = Readonly<{
  requesterRecordId: string;
  approverRecordId: string | null;
  actorRecordId: string;
  decision: PashxDecideApprovalRequest['decision'];
}>;

// D5 assigned-approver enforcement, expressed as a pure contract predicate so
// the enforcing service and its contract test agree without shared runtime
// state. The requester may cancel their own request but may never approve or
// reject it; an assigned approver, when present, is the only other actor who
// may decide.
export const isPurchaseOrderApprovalDecisionAuthorized = ({
  requesterRecordId,
  approverRecordId,
  actorRecordId,
  decision,
}: PashxApprovalDecisionAuthorization): boolean => {
  if (decision === 'CANCEL') {
    return requesterRecordId === actorRecordId;
  }

  if (requesterRecordId === actorRecordId) {
    return false;
  }

  return approverRecordId === null || approverRecordId === actorRecordId;
};
