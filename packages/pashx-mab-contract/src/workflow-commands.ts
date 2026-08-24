import {
  type PashxCaseDeliveryStatus,
  type PashxCommercialDocumentType,
  type PashxProcurementCaseStage,
  PASHX_PROCUREMENT_CASE_STAGES,
} from './domain.js';

import { type PashxMabContractVersion } from './version.js';

// The single allowlisted action code for requesting a case-transition approval.
// A transition approval is satisfied only when an APPROVED request carries
// exactly this code, the canonical transition digest, and the case in its
// source records.
export const PASHX_CASE_TRANSITION_ACTION_CODE = 'case.transition';

export type PashxTransitionCaseRequest = Readonly<{
  contractVersion: PashxMabContractVersion;
  procurementCaseRecordId: string;
  idempotencyKey: string;
  expectedVersion: number;
  payload: Readonly<{
    fromStage: PashxProcurementCaseStage;
    toStage: PashxProcurementCaseStage;
  }>;
}>;

export type PashxTransitionCaseResult = Readonly<{
  procurementCaseRecordId: string;
  fromStage: PashxProcurementCaseStage;
  toStage: PashxProcurementCaseStage;
  aggregateVersion: number;
}>;

export type PashxFinalizeDocumentRequest = Readonly<{
  contractVersion: PashxMabContractVersion;
  commercialDocumentRecordId: string;
  idempotencyKey: string;
  expectedVersion: number;
}>;

export type PashxFinalizeDocumentResult = Readonly<{
  commercialDocumentRecordId: string;
  procurementCaseRecordId: string | null;
  documentType: PashxCommercialDocumentType;
  lifecycleStatus: 'finalized';
  aggregateVersion: number;
}>;

export type PashxCancelDocumentRequest = PashxFinalizeDocumentRequest;

export type PashxCancelDocumentResult = Readonly<{
  commercialDocumentRecordId: string;
  procurementCaseRecordId: string | null;
  documentType: PashxCommercialDocumentType;
  lifecycleStatus: 'cancelled';
  aggregateVersion: number;
}>;

export type PashxRecordDeliveryRequest = Readonly<{
  contractVersion: PashxMabContractVersion;
  procurementCaseRecordId: string;
  idempotencyKey: string;
  expectedVersion: number;
  payload: Readonly<{
    deliveryNoteRecordId: string;
    deliveryStatus: Extract<PashxCaseDeliveryStatus, 'partial' | 'full'>;
    dueAt: string;
  }>;
}>;

export type PashxRecordDeliveryResult = Readonly<{
  procurementCaseRecordId: string;
  deliveryNoteRecordId: string;
  deliveryStatus: 'partial' | 'full';
  deliveryDueAt: string;
  aggregateVersion: number;
}>;

export type PashxWorkflowValidationResult<T> =
  | Readonly<{ valid: true; value: T }>
  | Readonly<{ valid: false; fieldPaths: readonly string[] }>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_UTC_DATETIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyBoundedText = (value: unknown, maximumLength: number): boolean =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.length <= maximumLength;

const isUuid = (value: unknown): boolean =>
  typeof value === 'string' && UUID_PATTERN.test(value);

const isValidExpectedVersion = (value: unknown): boolean =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

const isIsoUtcDateTime = (value: unknown): boolean =>
  typeof value === 'string' &&
  ISO_UTC_DATETIME_PATTERN.test(value) &&
  !Number.isNaN(Date.parse(value));

const isProcurementCaseStage = (
  value: unknown,
): value is PashxProcurementCaseStage =>
  typeof value === 'string' &&
  (PASHX_PROCUREMENT_CASE_STAGES as readonly string[]).includes(value);

const runChecks = <T>(
  input: unknown,
  checks: readonly [valid: boolean, fieldPath: string][],
): PashxWorkflowValidationResult<T> => {
  if (!isRecord(input)) {
    return { valid: false, fieldPaths: ['$'] };
  }

  const fieldPaths = checks
    .filter(([valid]) => !valid)
    .map(([, fieldPath]) => fieldPath);

  return fieldPaths.length === 0
    ? { valid: true, value: input as T }
    : { valid: false, fieldPaths };
};

export const validateTransitionCaseRequest = (
  input: unknown,
): PashxWorkflowValidationResult<PashxTransitionCaseRequest> => {
  const payload = isRecord(input) ? input.payload : undefined;
  const payloadChecks: readonly [boolean, string][] = isRecord(payload)
    ? [
        [isProcurementCaseStage(payload.fromStage), 'payload.fromStage'],
        [isProcurementCaseStage(payload.toStage), 'payload.toStage'],
      ]
    : [];

  return runChecks<PashxTransitionCaseRequest>(input, [
    [isRecord(input) && input.contractVersion === 1, 'contractVersion'],
    [
      isRecord(input) && isUuid(input.procurementCaseRecordId),
      'procurementCaseRecordId',
    ],
    [
      isRecord(input) && isNonEmptyBoundedText(input.idempotencyKey, 200),
      'idempotencyKey',
    ],
    [
      isRecord(input) && isValidExpectedVersion(input.expectedVersion),
      'expectedVersion',
    ],
    [isRecord(payload), 'payload'],
    ...payloadChecks,
  ]);
};

export const validateFinalizeDocumentRequest = (
  input: unknown,
): PashxWorkflowValidationResult<PashxFinalizeDocumentRequest> =>
  runChecks<PashxFinalizeDocumentRequest>(input, [
    [isRecord(input) && input.contractVersion === 1, 'contractVersion'],
    [
      isRecord(input) && isUuid(input.commercialDocumentRecordId),
      'commercialDocumentRecordId',
    ],
    [
      isRecord(input) && isNonEmptyBoundedText(input.idempotencyKey, 200),
      'idempotencyKey',
    ],
    [
      isRecord(input) && isValidExpectedVersion(input.expectedVersion),
      'expectedVersion',
    ],
  ]);

export const validateCancelDocumentRequest = validateFinalizeDocumentRequest;

export const validateRecordDeliveryRequest = (
  input: unknown,
): PashxWorkflowValidationResult<PashxRecordDeliveryRequest> => {
  const payload = isRecord(input) ? input.payload : undefined;
  const payloadChecks: readonly [boolean, string][] = isRecord(payload)
    ? [
        [isUuid(payload.deliveryNoteRecordId), 'payload.deliveryNoteRecordId'],
        [
          payload.deliveryStatus === 'partial' ||
            payload.deliveryStatus === 'full',
          'payload.deliveryStatus',
        ],
        [isIsoUtcDateTime(payload.dueAt), 'payload.dueAt'],
      ]
    : [];

  return runChecks<PashxRecordDeliveryRequest>(input, [
    [isRecord(input) && input.contractVersion === 1, 'contractVersion'],
    [
      isRecord(input) && isUuid(input.procurementCaseRecordId),
      'procurementCaseRecordId',
    ],
    [
      isRecord(input) && isNonEmptyBoundedText(input.idempotencyKey, 200),
      'idempotencyKey',
    ],
    [
      isRecord(input) && isValidExpectedVersion(input.expectedVersion),
      'expectedVersion',
    ],
    [isRecord(payload), 'payload'],
    ...payloadChecks,
  ]);
};
