/**
 * WF2 harness — request builders for the workflow command endpoints.
 *
 * Every scenario drives the same public endpoints as the CL2 harness: raw SQL seeds the
 * fixtures, the REST boundary performs the commands, and assertions read rows directly.
 */
import { randomUUID } from 'node:crypto';

import { PASHX_MAB_CONTRACT_VERSION } from 'pashx-mab-contract';
import { makeRestAPIRequest } from 'test/integration/rest/utils/make-rest-api-request.util';

// Admin Jane's workspace member record id in the seeded Apple workspace, taken from the seeded
// access token payload. Transition approvals are requested for this approver and decided with
// the same admin bearer, so the decide command's assigned-approver check passes.
export const APPLE_ADMIN_WORKSPACE_MEMBER_ID =
  '20202020-463f-435b-828c-107e007a2711';

export const caseTransitionPath = (procurementCaseRecordId: string): string =>
  `/pashx-mab/procurement-cases/${procurementCaseRecordId}/transitions`;

export const deliveryPath = (procurementCaseRecordId: string): string =>
  `/pashx-mab/procurement-cases/${procurementCaseRecordId}/delivery`;

export const supplierRfqsPath = (procurementCaseRecordId: string): string =>
  `/pashx-mab/procurement-cases/${procurementCaseRecordId}/supplier-rfqs`;

export const finalizeDocumentPath = (
  commercialDocumentRecordId: string,
): string =>
  `/pashx-mab/commercial-documents/${commercialDocumentRecordId}/finalize`;

export const cancelDocumentPath = (
  commercialDocumentRecordId: string,
): string =>
  `/pashx-mab/commercial-documents/${commercialDocumentRecordId}/cancel`;

export const PASHX_APPROVAL_REQUESTS_PATH = '/pashx-mab/approval-requests';

const DATE_TIME_NOW = new Date().toISOString();

export const buildCaseTransitionRequest = ({
  procurementCaseRecordId,
  expectedVersion,
  fromStage,
  toStage,
  idempotencyKey,
}: {
  procurementCaseRecordId: string;
  expectedVersion: number;
  fromStage: string;
  toStage: string;
  idempotencyKey?: string;
}) => ({
  contractVersion: PASHX_MAB_CONTRACT_VERSION,
  procurementCaseRecordId,
  idempotencyKey: idempotencyKey ?? randomUUID(),
  expectedVersion,
  payload: { fromStage, toStage },
});

export const postCaseTransition = ({
  procurementCaseRecordId,
  body,
  bearer,
}: {
  procurementCaseRecordId: string;
  body: unknown;
  bearer?: string;
}) =>
  makeRestAPIRequest({
    method: 'post',
    path: caseTransitionPath(procurementCaseRecordId),
    bearer: bearer ?? APPLE_JANE_ADMIN_ACCESS_TOKEN,
    body,
  });

export const buildFinalizeDocumentRequest = (
  commercialDocumentRecordId: string,
  overrides: { idempotencyKey?: string; expectedVersion: number },
) => ({
  contractVersion: PASHX_MAB_CONTRACT_VERSION,
  commercialDocumentRecordId,
  idempotencyKey: overrides.idempotencyKey ?? randomUUID(),
  expectedVersion: overrides.expectedVersion,
});

export const buildCancelDocumentRequest = buildFinalizeDocumentRequest;

export const postFinalizeDocument = ({
  commercialDocumentRecordId,
  body,
  bearer,
}: {
  commercialDocumentRecordId: string;
  body: unknown;
  bearer?: string;
}) =>
  makeRestAPIRequest({
    method: 'post',
    path: finalizeDocumentPath(commercialDocumentRecordId),
    bearer: bearer ?? APPLE_JANE_ADMIN_ACCESS_TOKEN,
    body,
  });

export const postCancelDocument = ({
  commercialDocumentRecordId,
  body,
  bearer,
}: {
  commercialDocumentRecordId: string;
  body: unknown;
  bearer?: string;
}) =>
  makeRestAPIRequest({
    method: 'post',
    path: cancelDocumentPath(commercialDocumentRecordId),
    bearer: bearer ?? APPLE_JANE_ADMIN_ACCESS_TOKEN,
    body,
  });

export const buildDeliveryRequest = ({
  procurementCaseRecordId,
  expectedVersion,
  deliveryNoteRecordId,
  deliveryStatus,
  dueAt,
  idempotencyKey,
}: {
  procurementCaseRecordId: string;
  expectedVersion: number;
  deliveryNoteRecordId: string;
  deliveryStatus: 'partial' | 'full';
  dueAt?: string;
  idempotencyKey?: string;
}) => ({
  contractVersion: PASHX_MAB_CONTRACT_VERSION,
  procurementCaseRecordId,
  idempotencyKey: idempotencyKey ?? randomUUID(),
  expectedVersion,
  payload: {
    deliveryNoteRecordId,
    deliveryStatus,
    dueAt: dueAt ?? DATE_TIME_NOW,
  },
});

export const postDeliveryRecord = ({
  procurementCaseRecordId,
  body,
  bearer,
}: {
  procurementCaseRecordId: string;
  body: unknown;
  bearer?: string;
}) =>
  makeRestAPIRequest({
    method: 'post',
    path: deliveryPath(procurementCaseRecordId),
    bearer: bearer ?? APPLE_JANE_ADMIN_ACCESS_TOKEN,
    body,
  });

export const buildRequestApproval = ({
  approvalRequestRecordId,
  name,
  requestedActionCode,
  payloadDigest,
  sourceRecordIds,
  approverRecordId,
  idempotencyKey,
}: {
  approvalRequestRecordId: string;
  name: string;
  requestedActionCode: string;
  payloadDigest: string;
  sourceRecordIds: string[];
  approverRecordId?: string;
  idempotencyKey?: string;
}) => ({
  contractVersion: PASHX_MAB_CONTRACT_VERSION,
  approvalRequestRecordId,
  idempotencyKey: idempotencyKey ?? randomUUID(),
  name,
  requestedActionCode,
  payloadDigest,
  sourceRecordIds,
  ...(approverRecordId === undefined ? {} : { approverRecordId }),
});

export const postRequestApproval = ({
  body,
  bearer,
}: {
  body: unknown;
  bearer?: string;
}) =>
  makeRestAPIRequest({
    method: 'post',
    path: PASHX_APPROVAL_REQUESTS_PATH,
    bearer: bearer ?? APPLE_JANE_ADMIN_ACCESS_TOKEN,
    body,
  });

export const buildDecideApproval = ({
  decision,
  decisionNote,
  idempotencyKey,
}: {
  decision: 'APPROVE' | 'REJECT' | 'CANCEL';
  decisionNote?: string;
  idempotencyKey?: string;
}) => ({
  contractVersion: PASHX_MAB_CONTRACT_VERSION,
  idempotencyKey: idempotencyKey ?? randomUUID(),
  expectedStatus: 'PENDING',
  decision,
  decisionNote: decisionNote ?? `${decision} after evidence review`,
});

export const postDecideApproval = ({
  approvalRequestRecordId,
  body,
  bearer,
}: {
  approvalRequestRecordId: string;
  body: unknown;
  bearer?: string;
}) =>
  makeRestAPIRequest({
    method: 'post',
    path: `${PASHX_APPROVAL_REQUESTS_PATH}/${approvalRequestRecordId}/decisions`,
    bearer: bearer ?? APPLE_JANE_ADMIN_ACCESS_TOKEN,
    body,
  });

export const buildSupplierRfqsRequest = ({
  procurementCaseRecordId,
  expectedVersion,
  dueAt,
  vendorRows,
  idempotencyKey,
}: {
  procurementCaseRecordId: string;
  expectedVersion: number;
  dueAt?: string;
  vendorRows: ReadonlyArray<{
    supplierRfqRecordId: string;
    supplierRecordId: string;
    vendorReference?: string;
  }>;
  idempotencyKey?: string;
}) => ({
  contractVersion: PASHX_MAB_CONTRACT_VERSION,
  procurementCaseRecordId,
  idempotencyKey: idempotencyKey ?? randomUUID(),
  expectedVersion,
  payload: {
    dueAt: dueAt ?? DATE_TIME_NOW,
    vendorRows: vendorRows.map((row) => ({
      supplierRfqRecordId: row.supplierRfqRecordId,
      supplierRecordId: row.supplierRecordId,
      ...(row.vendorReference === undefined
        ? {}
        : { vendorReference: row.vendorReference }),
    })),
  },
});

export const postSupplierRfqs = ({
  procurementCaseRecordId,
  body,
  bearer,
}: {
  procurementCaseRecordId: string;
  body: unknown;
  bearer?: string;
}) =>
  makeRestAPIRequest({
    method: 'post',
    path: supplierRfqsPath(procurementCaseRecordId),
    bearer: bearer ?? APPLE_JANE_ADMIN_ACCESS_TOKEN,
    body,
  });
