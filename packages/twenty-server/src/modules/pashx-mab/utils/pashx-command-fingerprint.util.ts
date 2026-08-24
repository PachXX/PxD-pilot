import { createHash } from 'node:crypto';
import {
  type PashxDecideApprovalRequest,
  type PashxCreateVendorPurchaseOrderPayload,
  type PashxCreateVendorPurchaseOrderRequest,
  type PashxFinalizeDocumentRequest,
  type PashxProcurementCaseStage,
  type PashxRecordDeliveryRequest,
  type PashxRequestApprovalRequest,
  type PashxTransitionCaseRequest,
} from 'pashx-mab-contract';

export const createVendorPurchaseOrderFingerprint = (
  request: PashxCreateVendorPurchaseOrderRequest,
): string => {
  const payload = {
    currency: request.payload.currency,
    issueDate: request.payload.issueDate,
    procurementCaseRecordId: request.payload.procurementCaseRecordId,
    supplierRecordId: request.payload.supplierRecordId,
    vendorReference: request.payload.vendorReference ?? null,
  } satisfies Record<keyof PashxCreateVendorPurchaseOrderPayload, unknown>;
  const fingerprintedRequest = {
    commercialDocumentRecordId: request.commercialDocumentRecordId,
    contractVersion: request.contractVersion,
    expectedVersion: request.expectedVersion,
    payload,
  } satisfies Record<
    Exclude<keyof PashxCreateVendorPurchaseOrderRequest, 'idempotencyKey'>,
    unknown
  >;

  return createHash('sha256')
    .update(JSON.stringify(fingerprintedRequest))
    .digest('hex');
};

const sha256Json = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

export const createRequestApprovalFingerprint = (
  request: PashxRequestApprovalRequest,
): string =>
  sha256Json({
    approvalRequestRecordId: request.approvalRequestRecordId,
    approverRecordId: request.approverRecordId ?? null,
    contractVersion: request.contractVersion,
    name: request.name,
    payloadDigest: request.payloadDigest,
    requestedActionCode: request.requestedActionCode,
    sourceRecordIds: request.sourceRecordIds,
  });

export const createDecideApprovalFingerprint = (
  approvalRequestRecordId: string,
  request: PashxDecideApprovalRequest,
): string =>
  sha256Json({
    approvalRequestRecordId,
    contractVersion: request.contractVersion,
    decision: request.decision,
    decisionNote: request.decisionNote,
    expectedStatus: request.expectedStatus,
  });

export const createCaseTransitionFingerprint = (
  request: PashxTransitionCaseRequest,
): string =>
  sha256Json({
    contractVersion: request.contractVersion,
    procurementCaseRecordId: request.procurementCaseRecordId,
    expectedVersion: request.expectedVersion,
    payload: {
      fromStage: request.payload.fromStage,
      toStage: request.payload.toStage,
    },
  });

export const createDocumentLifecycleFingerprint = (
  request: PashxFinalizeDocumentRequest,
): string =>
  sha256Json({
    contractVersion: request.contractVersion,
    commercialDocumentRecordId: request.commercialDocumentRecordId,
    expectedVersion: request.expectedVersion,
  });

export const createRecordDeliveryFingerprint = (
  request: PashxRecordDeliveryRequest,
): string =>
  sha256Json({
    contractVersion: request.contractVersion,
    procurementCaseRecordId: request.procurementCaseRecordId,
    expectedVersion: request.expectedVersion,
    payload: {
      deliveryNoteRecordId: request.payload.deliveryNoteRecordId,
      deliveryStatus: request.payload.deliveryStatus,
      dueAt: request.payload.dueAt,
    },
  });

// The canonical digest a case-transition approval must carry. Key order is
// fixed here so requesters and the enforcing service agree without shared
// runtime state. `expectedVersion` is included so an approval cannot be
// replayed against a newer case version. Lives server-side (not in the
// contract) because it needs node:crypto, which the browser app bundle cannot
// resolve — the same boundary the other command fingerprints already respect.
export const createCaseTransitionApprovalDigest = ({
  procurementCaseRecordId,
  fromStage,
  toStage,
  expectedVersion,
}: {
  procurementCaseRecordId: string;
  fromStage: PashxProcurementCaseStage;
  toStage: PashxProcurementCaseStage;
  expectedVersion: number;
}): string =>
  sha256Json({
    procurementCaseRecordId,
    fromStage,
    toStage,
    expectedVersion,
  });
