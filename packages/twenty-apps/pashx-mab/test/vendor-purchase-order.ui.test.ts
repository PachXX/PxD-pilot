import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { PASHX_PROCUREMENT_CASE_STAGES } from 'pashx-mab-contract';

import { loadVendorPurchaseOrder } from '../src/vendor-purchase-order/load-vendor-purchase-order';
import {
  toVendorPurchaseOrderLocale,
  vendorPurchaseOrderCopy,
} from '../src/front-components/vendor-purchase-order.copy';
import { vendorPurchaseOrderStyles } from '../src/front-components/vendor-purchase-order.styles';

const componentSource = readFileSync(
  new URL(
    '../src/front-components/vendor-purchase-order.front-component.tsx',
    import.meta.url,
  ),
  'utf8',
);
const pageLayoutSource = readFileSync(
  new URL(
    '../src/page-layouts/vendor-purchase-order.page-layout.ts',
    import.meta.url,
  ),
  'utf8',
);
const navigationSource = readFileSync(
  new URL(
    '../src/navigation-menu-items/vendor-purchase-order.navigation-menu-item.ts',
    import.meta.url,
  ),
  'utf8',
);

const PO_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const CASE_ID = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const SUPPLIER_ID = 'cccccccc-3333-4333-8333-cccccccccccc';
const OWNER_ID = 'dddddddd-4444-4444-8444-dddddddddddd';
const OBSERVED_AT = '2026-09-01T00:00:00.000Z';

type Selection = Readonly<Record<string, unknown>>;

const loadWithSelections = async ({
  documentConnection = { pageInfo: { hasNextPage: false }, edges: [] },
  lineConnection = { pageInfo: { hasNextPage: false }, edges: [] },
  approvalConnection = { pageInfo: { hasNextPage: false }, edges: [] },
  cashConnection = { pageInfo: { hasNextPage: false }, edges: [] },
  caseConnection = { pageInfo: { hasNextPage: false }, edges: [] },
  companyConnection = { pageInfo: { hasNextPage: false }, edges: [] },
  memberConnection = { pageInfo: { hasNextPage: false }, edges: [] },
  caseDocumentConnection = { pageInfo: { hasNextPage: false }, edges: [] },
  limit = 200,
}: {
  documentConnection?: unknown;
  lineConnection?: unknown;
  approvalConnection?: unknown;
  cashConnection?: unknown;
  caseConnection?: unknown;
  companyConnection?: unknown;
  memberConnection?: unknown;
  caseDocumentConnection?: unknown;
  limit?: number;
}): Promise<{ result: Awaited<ReturnType<typeof loadVendorPurchaseOrder>>; selections: Selection[] }> => {
  const selections: Selection[] = [];
  const result = await loadVendorPurchaseOrder({
    poRecordId: PO_ID,
    now: () => new Date(OBSERVED_AT),
    limit,
    client: {
      query: async (selection: Record<string, unknown>) => {
        selections.push(selection);
        if ('workspaceMembers' in selection) {
          return { workspaceMembers: memberConnection };
        }
        if ('procurementCases' in selection) {
          return {
            procurementCases: caseConnection,
            companies: companyConnection,
            commercialDocuments: caseDocumentConnection,
          };
        }
        return {
          commercialDocuments: documentConnection,
          documentLines: lineConnection,
          approvalRequests: approvalConnection,
          cashMovements: cashConnection,
        };
      },
    },
  });
  return { result, selections };
};

const documentNode = {
  id: PO_ID,
  name: 'MAB-PO-2026-0001',
  documentType: 'VENDOR_PURCHASE_ORDER',
  lifecycleStatus: 'DRAFT',
  aggregateVersion: 3,
  procurementCaseRecordId: CASE_ID,
  supplierRecordId: SUPPLIER_ID,
  issueDate: '2026-08-01',
  currencyCode: 'SAR',
  totalAmount: { amountMicros: 127544200000, currencyCode: 'SAR' },
  leadTimeDays: 10,
  paymentTerms: '100% advance',
  validUntil: null,
};

test('loader scopes the PO, lines, approvals and payments server-side', async () => {
  const { selections } = await loadWithSelections({
    documentConnection: {
      pageInfo: { hasNextPage: false },
      edges: [{ node: documentNode }],
    },
  });

  assert.equal(selections.length, 2);
  const first = selections[0];
  const second = selections[1];
  assert.ok(first !== undefined);
  assert.ok(second !== undefined);
  assert.deepEqual(
    (first.commercialDocuments as { __args: unknown }).__args,
    { first: 1, filter: { id: { eq: PO_ID } } },
  );
  assert.deepEqual(
    (first.documentLines as { __args: unknown }).__args,
    { first: 200, filter: { commercialDocumentRecordId: { eq: PO_ID } } },
  );
  assert.deepEqual(
    (first.approvalRequests as { __args: unknown }).__args,
    { first: 200, filter: { requestedActionCode: { eq: 'purchaseOrder.approval' } } },
  );
  assert.deepEqual(
    (first.cashMovements as { __args: unknown }).__args,
    { first: 200, filter: { sourceDocumentRecordId: { eq: PO_ID } } },
  );
  assert.deepEqual(
    (second.procurementCases as { __args: unknown }).__args,
    { first: 1, filter: { id: { eq: CASE_ID } } },
  );
  assert.deepEqual(
    (second.companies as { __args: unknown }).__args,
    { first: 1, filter: { id: { eq: SUPPLIER_ID } } },
  );
});

test('loader never surfaces a line from another document', async () => {
  const { result } = await loadWithSelections({
    documentConnection: {
      pageInfo: { hasNextPage: false },
      edges: [{ node: documentNode }],
    },
    lineConnection: {
      pageInfo: { hasNextPage: false },
      edges: [
        {
          node: {
            id: 'other-line',
            name: 'Other',
            commercialDocumentRecordId: 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee',
          linePosition: 1,
          },
        },
        {
          node: {
            id: 'mine-line',
            name: 'Mine',
            commercialDocumentRecordId: PO_ID,
          linePosition: 1,
            quantity: 2,
            unitPriceMicros: 10_000_000,
            lineTotalMicros: 20_000_000,
            currencyCode: 'SAR',
          },
        },
      ],
    },
  });

  assert.deepEqual(
    result.lines.map((line) => line.id),
    ['mine-line'],
  );
});

test('loader maps stored values to contract vocabulary and resolves the owner', async () => {
  const { result, selections } = await loadWithSelections({
    documentConnection: {
      pageInfo: { hasNextPage: false },
      edges: [{ node: documentNode }],
    },
    caseConnection: {
      pageInfo: { hasNextPage: false },
      edges: [
        {
          node: {
            id: CASE_ID,
            name: 'PC-001',
            projectName: 'Pump package',
            ownerRecordId: OWNER_ID,
            stage: 'VENDOR_ORDER',
            requiredBy: '2026-09-15',
          },
        },
      ],
    },
    companyConnection: {
      pageInfo: { hasNextPage: false },
      edges: [
        {
          node: {
            id: SUPPLIER_ID,
            name: 'Demo Supplier',
            commercialRegistrationNumber: '1010000001',
            vatRegistrationNumber: '300000000000003',
          },
        },
      ],
    },
    memberConnection: {
      pageInfo: { hasNextPage: false },
      edges: [
        {
          node: {
            id: OWNER_ID,
            name: { firstName: 'Demo', lastName: 'Owner' },
          },
        },
      ],
    },
  });

  assert.equal(selections.length, 3);
  assert.equal(result.document?.documentType, 'vendorPurchaseOrder');
  assert.equal(result.document?.totalAmountMicros, 127544200000);
  assert.equal(result.case?.stage, 'vendor-order');
  assert.equal(result.case?.requiredBy, '2026-09-15');
  assert.equal(result.supplier?.commercialRegistrationNumber, '1010000001');
  assert.equal(result.ownerName, 'Demo Owner');
  assert.equal(result.asOf, OBSERVED_AT);
});

test('loader rejects an empty record id and out-of-range limits', async () => {
  await assert.rejects(
    () => loadVendorPurchaseOrder({ poRecordId: '  ', client: { query: async () => ({}) } }),
    RangeError,
  );
  await assert.rejects(
    () => loadVendorPurchaseOrder({ poRecordId: PO_ID, limit: 0, client: { query: async () => ({}) } }),
    RangeError,
  );
  await assert.rejects(
    () => loadVendorPurchaseOrder({ poRecordId: PO_ID, limit: 501, client: { query: async () => ({}) } }),
    RangeError,
  );
});

test('copy covers every stage in both locales and resolves locale deterministically', () => {
  for (const locale of ['en', 'ar'] as const) {
    const copy = vendorPurchaseOrderCopy[locale];
    assert.deepEqual(Object.keys(copy), Object.keys(vendorPurchaseOrderCopy.en));
    for (const stage of PASHX_PROCUREMENT_CASE_STAGES) {
      assert.equal(typeof copy.stages[stage], 'string');
      assert.ok(copy.stages[stage]!.length > 0);
    }
    assert.equal(copy.formulaSteps.length, 6);
    assert.equal(Object.keys(copy.stepLabels).length, 7);
    assert.equal(copy.evidenceKinds.verifiedPayment.length > 0, true);
  }
  assert.equal(toVendorPurchaseOrderLocale('ar'), 'ar');
  assert.equal(toVendorPurchaseOrderLocale('en'), 'en');
  assert.equal(toVendorPurchaseOrderLocale(null), 'en');
  assert.equal(toVendorPurchaseOrderLocale('fr'), 'en');
});

test('component stays source-backed with native links, honest states and no mockup values', () => {
  assert.ok(componentSource.includes('aria-busy'));
  assert.ok(componentSource.includes('aria-live="polite"'));
  assert.ok(componentSource.includes('role="alert"'));
  assert.ok(componentSource.includes('role="status"'));
  assert.ok(componentSource.includes('target="_top"'));
  assert.ok(componentSource.includes('loadVendorPurchaseOrder'));
  assert.ok(componentSource.includes('useSelectedRecordIds'));
  assert.ok(componentSource.includes('th scope="col"'));
  assert.ok(componentSource.includes('<bdi'));
  assert.ok(componentSource.includes('RestApiClient'));
  assert.ok(componentSource.includes('buildPurchaseOrderApprovalPayloadDigest'));
  assert.ok(componentSource.includes('PASHX_PURCHASE_ORDER_APPROVAL_ACTION_CODE'));
  assert.ok(!componentSource.includes('fetch('));
  assert.ok(!componentSource.includes('Al Noor'));
  assert.ok(!componentSource.includes('Omar'));
  assert.ok(!componentSource.includes('mutation'));
});

test('approval request reuses a deterministic identity for safe timeout retries', () => {
  assert.ok(componentSource.includes('buildPurchaseOrderApprovalIdempotencyKey'));
  assert.ok(componentSource.includes('buildPurchaseOrderApprovalRequestRecordId'));
  // The request record id and idempotency key must be deterministic, not fresh
  // random uuids, so a timeout retry resends the byte-identical request.
  assert.ok(
    componentSource.includes(
      'approvalRequestRecordId: buildPurchaseOrderApprovalRequestRecordId(digest)',
    ),
  );
  assert.ok(
    componentSource.includes(
      'idempotencyKey: buildPurchaseOrderApprovalIdempotencyKey(document.id)',
    ),
  );
  assert.ok(
    !componentSource.includes('approvalRequestRecordId: createUuid()'),
  );
});

test('approval actions are role-gated with a read-only no-permission state', () => {
  assert.ok(componentSource.includes('resolveApprovalCapabilities'));
  assert.ok(componentSource.includes('approvalCapabilities.canRequest'));
  assert.ok(componentSource.includes('approvalCapabilities.canDecide'));
  assert.ok(componentSource.includes('copy.readOnlyApproval'));
  // Capability keys come from the contract via the model, never hardcoded here.
  assert.ok(!componentSource.includes('pashx.approval.request'));
  assert.ok(!componentSource.includes('pashx.approval.decide'));
});

test('page layout is a standalone page with one front-component widget', () => {
  assert.ok(pageLayoutSource.includes('PageLayoutType.STANDALONE_PAGE'));
  assert.ok(pageLayoutSource.includes('FRONT_COMPONENT'));
  assert.ok(pageLayoutSource.includes('vendorPurchaseOrderWidget'));
  assert.ok(pageLayoutSource.includes('vendorPurchaseOrderOverviewTab'));
});

test('navigation entry follows vendor comparison at position five', () => {
  assert.ok(navigationSource.includes('NavigationMenuItemType.PAGE_LAYOUT'));
  assert.ok(navigationSource.includes('position: 5'));
  assert.ok(navigationSource.includes("icon: 'IconFileInvoice'"));
});

test('styles preserve RTL, focus, target size and reduced-motion foundations', () => {
  assert.ok(vendorPurchaseOrderStyles.includes('.pxd-vpo[dir="rtl"]'));
  assert.ok(vendorPurchaseOrderStyles.includes('.pxd-vpo[data-color-scheme="dark"]'));
  assert.ok(vendorPurchaseOrderStyles.includes(':focus-visible'));
  assert.ok(vendorPurchaseOrderStyles.includes('min-height: 44px'));
  assert.ok(vendorPurchaseOrderStyles.includes('prefers-reduced-motion'));
  assert.ok(vendorPurchaseOrderStyles.includes('font-size: 16px'));
  assert.ok(vendorPurchaseOrderStyles.includes('.pxd-vpo__link:visited'));
  assert.ok(vendorPurchaseOrderStyles.includes('.pxd-vpo__table'));
});
