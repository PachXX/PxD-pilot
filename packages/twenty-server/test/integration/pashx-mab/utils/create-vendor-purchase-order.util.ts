/**
 * CL2 harness — request builder for the Vendor PO command.
 *
 * Every scenario drives the same public endpoint. Centralising the request shape here means a
 * contract change surfaces as one compile error rather than seven silently-stale test bodies.
 */
import { randomUUID } from 'node:crypto';

import { PASHX_MAB_CONTRACT_VERSION } from 'pashx-mab-contract';
import { makeRestAPIRequest } from 'test/integration/rest/utils/make-rest-api-request.util';
import { PASHX_VENDOR_PO_PATH } from 'test/integration/pashx-mab/utils/pashx-mab-test-context.util';

export type VendorPurchaseOrderOverrides = {
  commercialDocumentRecordId?: string;
  idempotencyKey?: string;
  expectedVersion?: number;
  procurementCaseRecordId: string;
  supplierRecordId: string;
  issueDate?: string;
  currency?: string;
  vendorReference?: string;
};

export const buildVendorPurchaseOrderRequest = (
  overrides: VendorPurchaseOrderOverrides,
) => ({
  contractVersion: PASHX_MAB_CONTRACT_VERSION,
  commercialDocumentRecordId:
    overrides.commercialDocumentRecordId ?? randomUUID(),
  idempotencyKey: overrides.idempotencyKey ?? randomUUID(),
  expectedVersion: overrides.expectedVersion ?? 0,
  payload: {
    procurementCaseRecordId: overrides.procurementCaseRecordId,
    supplierRecordId: overrides.supplierRecordId,
    issueDate: overrides.issueDate ?? '2026-08-07',
    currency: overrides.currency ?? 'SAR',
    ...(overrides.vendorReference === undefined
      ? {}
      : { vendorReference: overrides.vendorReference }),
  },
});

/**
 * `bearer` defaults to the admin token because most scenarios are about transaction behaviour,
 * not authorization. The permission-layer scenario passes other tokens explicitly.
 */
export const postVendorPurchaseOrder = ({
  body,
  bearer,
}: {
  body: unknown;
  bearer?: string;
}) =>
  makeRestAPIRequest({
    method: 'post',
    path: PASHX_VENDOR_PO_PATH,
    bearer: bearer ?? APPLE_JANE_ADMIN_ACCESS_TOKEN,
    body,
  });
