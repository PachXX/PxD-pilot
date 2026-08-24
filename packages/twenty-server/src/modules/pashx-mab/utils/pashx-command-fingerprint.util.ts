import { createHash } from 'node:crypto';
import {
  type PashxDecideApprovalRequest,
  type PashxCreateVendorPurchaseOrderPayload,
  type PashxCreateVendorPurchaseOrderRequest,
  type PashxRequestApprovalRequest,
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
