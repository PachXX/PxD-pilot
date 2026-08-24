import { type PashxMabContractVersion } from './version.js';

import { type PashxCommercialDocumentType } from './domain.js';

export const PASHX_COMMAND_NAMES = [
  'case.create',
  'case.update',
  'case.transition',
  'document.create',
  'document.update',
  'document.finalize',
  'document.cancel',
  'delivery.record',
  'correction.create',
  'compliance.queue',
  'approval.request',
  'approval.approve',
  'approval.reject',
  'approval.cancel',
] as const;

export type PashxCommandName = (typeof PASHX_COMMAND_NAMES)[number];

export type PashxCommandEnvelope<
  CommandName extends PashxCommandName = PashxCommandName,
  Payload = unknown,
> = Readonly<{
  contractVersion: PashxMabContractVersion;
  commandName: CommandName;
  workspaceId: string;
  actorId: string;
  aggregateId: string;
  idempotencyKey: string;
  expectedVersion: number;
  payload: Payload;
}>;

export type PashxCommandSuccess<Result = unknown> = Readonly<{
  ok: true;
  replayed: boolean;
  aggregateId: string;
  aggregateVersion: number;
  correlationId: string;
  result: Result;
}>;

/**
 * The public HTTP shape for the first MAB write vertical. Authentication owns
 * workspaceId and actorId, so neither value is accepted from the browser.
 */
export type PashxCreateVendorPurchaseOrderRequest = Readonly<{
  contractVersion: PashxMabContractVersion;
  commercialDocumentRecordId: string;
  idempotencyKey: string;
  expectedVersion: number;
  payload: PashxCreateVendorPurchaseOrderPayload;
}>;

export type PashxCreateVendorPurchaseOrderPayload = Readonly<{
  procurementCaseRecordId: string;
  supplierRecordId: string;
  issueDate: string;
  currency: string;
  vendorReference?: string;
}>;

export type PashxVendorPurchaseOrderResult = Readonly<{
  commercialDocumentRecordId: string;
  procurementCaseRecordId: string;
  documentType: Extract<PashxCommercialDocumentType, 'vendorPurchaseOrder'>;
  documentNumber: string;
  lifecycleStatus: 'draft';
  aggregateVersion: number;
}>;

export type PashxRequestValidationResult =
  | Readonly<{ valid: true; value: PashxCreateVendorPurchaseOrderRequest }>
  | Readonly<{ valid: false; fieldPaths: readonly string[] }>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_CURRENCY_PATTERN = /^[A-Z]{3}$/;

const isNonEmptyBoundedText = (value: string, maximumLength: number): boolean =>
  value.trim().length > 0 && value.length <= maximumLength;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isIsoDate = (value: string): boolean => {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    ISO_DATE_PATTERN.test(value) &&
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

export const validateCreateVendorPurchaseOrderRequest = (
  input: unknown,
): PashxRequestValidationResult => {
  if (!isRecord(input)) {
    return { valid: false, fieldPaths: ['$'] };
  }

  const payload = input.payload;

  if (!isRecord(payload)) {
    return { valid: false, fieldPaths: ['payload'] };
  }

  const checks: readonly Readonly<[valid: boolean, fieldPath: string]>[] = [
    [input.contractVersion === 1, 'contractVersion'],
    [
      typeof input.commercialDocumentRecordId === 'string' &&
        UUID_PATTERN.test(input.commercialDocumentRecordId),
      'commercialDocumentRecordId',
    ],
    [
      typeof input.idempotencyKey === 'string' &&
        isNonEmptyBoundedText(input.idempotencyKey, 200),
      'idempotencyKey',
    ],
    [
      typeof input.expectedVersion === 'number' &&
        isValidExpectedVersion(input.expectedVersion),
      'expectedVersion',
    ],
    [
      typeof payload.procurementCaseRecordId === 'string' &&
        UUID_PATTERN.test(payload.procurementCaseRecordId),
      'payload.procurementCaseRecordId',
    ],
    [
      typeof payload.supplierRecordId === 'string' &&
        UUID_PATTERN.test(payload.supplierRecordId),
      'payload.supplierRecordId',
    ],
    [
      typeof payload.issueDate === 'string' && isIsoDate(payload.issueDate),
      'payload.issueDate',
    ],
    [
      typeof payload.currency === 'string' &&
        ISO_CURRENCY_PATTERN.test(payload.currency),
      'payload.currency',
    ],
    [
      payload.vendorReference === undefined ||
        (typeof payload.vendorReference === 'string' &&
          isNonEmptyBoundedText(payload.vendorReference, 200)),
      'payload.vendorReference',
    ],
  ];
  const fieldPaths = checks
    .filter(([valid]) => !valid)
    .map(([, fieldPath]) => fieldPath);

  return fieldPaths.length === 0
    ? { valid: true, value: input as PashxCreateVendorPurchaseOrderRequest }
    : { valid: false, fieldPaths };
};

const pashxCommandNameSet = new Set<PashxCommandName>(PASHX_COMMAND_NAMES);

export const isPashxCommandName = (value: string): value is PashxCommandName =>
  pashxCommandNameSet.has(value as PashxCommandName);

export const isValidExpectedVersion = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= 0;
