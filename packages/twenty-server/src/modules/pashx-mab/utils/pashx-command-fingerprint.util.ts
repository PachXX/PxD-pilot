import { createHash } from 'node:crypto';
import {
  type PashxCreateVendorPurchaseOrderPayload,
  type PashxCreateVendorPurchaseOrderRequest,
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
