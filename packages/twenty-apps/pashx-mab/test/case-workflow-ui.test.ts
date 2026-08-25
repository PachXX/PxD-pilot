import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  PASHX_CASE_DELIVERY_STATUSES,
  PASHX_PROCUREMENT_CASE_STAGES,
} from 'pashx-mab-contract';

import { loadCaseWorkflow } from '../src/case-workflow/load-case-workflow';
import {
  buildCaseStageRail,
  buildDeliveryState,
  buildInvoiceReadiness,
  buildPriceComparisonRows,
  formatWorkflowAmount,
  formatWorkflowDateTime,
} from '../src/case-workflow/case-workflow.model';
import type {
  CaseWorkflowCaseRecord,
  CaseWorkflowDocumentRecord,
  CaseWorkflowInvoiceMissingReason,
} from '../src/case-workflow/case-workflow.types';
import {
  caseWorkflowCopy,
  toCaseWorkflowLocale,
} from '../src/front-components/case-workflow.copy';
import { caseWorkflowStyles } from '../src/front-components/case-workflow.styles';

const componentSource = readFileSync(
  new URL(
    '../src/front-components/case-workflow.front-component.tsx',
    import.meta.url,
  ),
  'utf8',
);
const pageLayoutSource = readFileSync(
  new URL('../src/page-layouts/case-workflow.page-layout.ts', import.meta.url),
  'utf8',
);
const navigationSource = readFileSync(
  new URL(
    '../src/navigation-menu-items/case-workflow.navigation-menu-item.ts',
    import.meta.url,
  ),
  'utf8',
);

const CASE_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const OTHER_CASE_ID = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';

const caseRecord = (
  overrides: Partial<CaseWorkflowCaseRecord> = {},
): CaseWorkflowCaseRecord => ({
  id: CASE_ID,
  name: 'CL2 case',
  stage: 'intake',
  deliveryStatus: 'notStarted',
  deliveryDueAt: null,
  updatedAt: '2026-08-24T10:00:00.000Z',
  ...overrides,
});

const documentRecord = (
  overrides: Partial<CaseWorkflowDocumentRecord> = {},
): CaseWorkflowDocumentRecord => ({
  id: 'cccccccc-3333-4333-8333-cccccccccccc',
  name: 'DOC-001',
  procurementCaseRecordId: CASE_ID,
  documentType: 'vendorQuote',
  lifecycleStatus: 'DRAFT',
  supplierRecordId: null,
  issueDate: '2026-08-24',
  currencyCode: 'SAR',
  totalAmountMicros: 100_000_000,
  ...overrides,
});

test('stage rail marks the frozen order with one current stage', () => {
  const rail = buildCaseStageRail('quoted');

  assert.deepEqual(
    rail.map((entry) => [entry.stage, entry.state]),
    [
      ['intake', 'complete'],
      ['sourcing', 'complete'],
      ['quoted', 'current'],
      ['customer-order', 'upcoming'],
      ['vendor-order', 'upcoming'],
      ['delivery', 'upcoming'],
      ['invoicing', 'upcoming'],
      ['closed', 'upcoming'],
      ['cancelled', 'upcoming'],
    ],
  );
  assert.equal(rail[2]?.position, 2);
});

test('stage rail closes every active stage for a closed case', () => {
  const rail = buildCaseStageRail('closed');

  assert.equal(rail.find((entry) => entry.stage === 'closed')?.state, 'current');
  assert.equal(rail.find((entry) => entry.stage === 'invoicing')?.state, 'complete');
  assert.equal(rail.find((entry) => entry.stage === 'cancelled')?.state, 'upcoming');
});

test('stage rail marks only the cancelled marker for a cancelled case', () => {
  const rail = buildCaseStageRail('cancelled');

  assert.equal(rail.find((entry) => entry.stage === 'cancelled')?.state, 'cancelled');
  assert.ok(
    rail
      .filter((entry) => entry.stage !== 'cancelled')
      .every((entry) => entry.state === 'upcoming'),
  );
});

test('stage rail handles an unknown stage without a current marker', () => {
  const rail = buildCaseStageRail(null);

  assert.equal(rail.length, PASHX_PROCUREMENT_CASE_STAGES.length);
  assert.equal(rail.some((entry) => entry.state === 'current'), false);
  assert.ok(rail.every((entry) => entry.state === 'upcoming'));
});

test('price comparison ranks finalized quotes before drafts, then by total', () => {
  const rows = buildPriceComparisonRows(
    [
      documentRecord({
        id: 'd-1',
        name: 'HIGH',
        lifecycleStatus: 'DRAFT',
        totalAmountMicros: 300_000_000,
      }),
      documentRecord({
        id: 'd-2',
        name: 'LOW',
        lifecycleStatus: 'FINALIZED',
        totalAmountMicros: 100_000_000,
      }),
      documentRecord({
        id: 'd-3',
        name: 'MID',
        lifecycleStatus: 'FINALIZED',
        totalAmountMicros: 200_000_000,
      }),
      documentRecord({
        id: 'd-4',
        name: 'NONE',
        lifecycleStatus: 'DRAFT',
        totalAmountMicros: null,
      }),
      documentRecord({
        id: 'd-5',
        name: 'OTHER-CASE',
        procurementCaseRecordId: OTHER_CASE_ID,
        lifecycleStatus: 'FINALIZED',
        totalAmountMicros: 1,
      }),
      documentRecord({
        id: 'd-6',
        name: 'NOT-A-QUOTE',
        documentType: 'customerRfq',
      }),
    ],
    CASE_ID,
  );

  assert.deepEqual(
    rows.map((row) => row.documentId),
    ['d-2', 'd-3', 'd-1', 'd-4'],
  );
});

test('delivery state derives from the case and its delivery notes', () => {
  const state = buildDeliveryState(caseRecord({ deliveryStatus: 'partial' }), [
    documentRecord({
      id: 'dn-1',
      documentType: 'deliveryNote',
      lifecycleStatus: 'FINALIZED',
    }),
    documentRecord({
      id: 'dn-2',
      documentType: 'deliveryNote',
      lifecycleStatus: 'DRAFT',
    }),
    documentRecord({ id: 'other', documentType: 'customerRfq' }),
  ]);

  assert.deepEqual(state, {
    status: 'partial',
    dueAt: null,
    deliveryNoteCount: 2,
    finalizedDeliveryNoteCount: 1,
    deliveryNoteDocumentIds: ['dn-1', 'dn-2'],
  });
});

test('invoice readiness counts finalized evidence only', () => {
  const readiness = buildInvoiceReadiness(
    [
      documentRecord({
        id: 'po-1',
        documentType: 'customerPurchaseOrder',
        lifecycleStatus: 'FINALIZED',
      }),
      documentRecord({
        id: 'dn-1',
        documentType: 'deliveryNote',
        lifecycleStatus: 'FINALIZED',
      }),
      documentRecord({
        id: 'inv-1',
        documentType: 'customerInvoice',
        lifecycleStatus: 'DRAFT',
      }),
    ],
    CASE_ID,
  );

  assert.equal(readiness.finalizedCustomerPurchaseOrderCount, 1);
  assert.equal(readiness.finalizedDeliveryNoteCount, 1);
  assert.equal(readiness.customerInvoiceCount, 1);
  assert.equal(readiness.finalizedCustomerInvoiceCount, 0);
  assert.deepEqual(readiness.missingReasons, [
    'missing-finalized-customer-invoice',
  ]);
});

test('invoice readiness reports every missing gate', () => {
  const readiness = buildInvoiceReadiness([], CASE_ID);

  assert.deepEqual(readiness.missingReasons, [
    'missing-finalized-customer-purchase-order',
    'missing-finalized-delivery-note',
    'missing-finalized-customer-invoice',
  ]);
});

test('amount and date formatting stay deterministic and currency explicit', () => {
  assert.equal(formatWorkflowAmount(1_500_000_000, 'SAR', 'en'), '1,500.00 SAR');
  assert.equal(formatWorkflowAmount(null, 'SAR', 'en'), '—');
  assert.equal(
    formatWorkflowDateTime('2026-08-24T10:00:00.000Z', 'en').length > 0,
    true,
  );
  assert.equal(formatWorkflowDateTime(null, 'en'), '—');
  assert.equal(formatWorkflowDateTime('not-a-date', 'en'), '—');
});

test('loader maps stored values to contract vocabulary and flags partial pages', async () => {
  const client = {
    query: async () => ({
      procurementCases: {
        pageInfo: { hasNextPage: false },
        edges: [
          {
            node: {
              id: CASE_ID,
              name: 'CL2 case',
              stage: 'CUSTOMER_ORDER',
              deliveryStatus: 'PARTIAL',
              deliveryDueAt: '2026-08-30T14:00:00.000Z',
              updatedAt: '2026-08-24T10:00:00.000Z',
            },
          },
        ],
      },
      commercialDocuments: {
        pageInfo: { hasNextPage: true },
        edges: [
          {
            node: {
              id: 'd-1',
              name: 'DOC-001',
              procurementCaseRecordId: CASE_ID,
              documentType: 'VENDOR_QUOTE',
              lifecycleStatus: 'FINALIZED',
              supplierRecordId: null,
              issueDate: '2026-08-24',
              currencyCode: 'SAR',
              totalAmount: { amountMicros: 100000000, currencyCode: 'SAR' },
            },
          },
        ],
      },
    }),
  };

  const result = await loadCaseWorkflow({ client });

  assert.equal(result.isPartial, true);
  assert.equal(result.cases[0]?.stage, 'customer-order');
  assert.equal(result.cases[0]?.deliveryStatus, 'partial');
  assert.equal(result.documents[0]?.documentType, 'vendorQuote');
  assert.equal(result.documents[0]?.totalAmountMicros, 100000000);
  assert.equal(result.documents[0]?.currencyCode, 'SAR');
});

test('loader rejects out-of-range limits', async () => {
  await assert.rejects(
    () => loadCaseWorkflow({ limit: 0, client: { query: async () => ({}) } }),
    RangeError,
  );
  await assert.rejects(
    () => loadCaseWorkflow({ limit: 501, client: { query: async () => ({}) } }),
    RangeError,
  );
});

test('copy covers every stage, delivery status, gate and lifecycle in both locales', () => {
  const gates: readonly CaseWorkflowInvoiceMissingReason[] = [
    'missing-finalized-customer-purchase-order',
    'missing-finalized-delivery-note',
    'missing-finalized-customer-invoice',
  ];

  for (const locale of ['en', 'ar'] as const) {
    const copy = caseWorkflowCopy[locale];

    assert.deepEqual(Object.keys(copy), Object.keys(caseWorkflowCopy.en));
    for (const stage of PASHX_PROCUREMENT_CASE_STAGES) {
      assert.equal(typeof copy.stages[stage], 'string');
    }
    for (const status of PASHX_CASE_DELIVERY_STATUSES) {
      assert.equal(typeof copy.deliveryStatuses[status], 'string');
    }
    for (const gate of gates) {
      assert.equal(typeof copy.gateLabels[gate], 'string');
    }
    assert.equal(copy.stageStates.complete.length > 0, true);
    assert.equal(copy.stageStates.current.length > 0, true);
    assert.equal(copy.stageStates.upcoming.length > 0, true);
    assert.equal(copy.stageStates.cancelled.length > 0, true);
  }
});

test('locale resolution defaults to English', () => {
  assert.equal(toCaseWorkflowLocale('ar'), 'ar');
  assert.equal(toCaseWorkflowLocale('en'), 'en');
  assert.equal(toCaseWorkflowLocale(null), 'en');
  assert.equal(toCaseWorkflowLocale('fr'), 'en');
});

test('component stays read-only with native links and honest states', () => {
  assert.ok(componentSource.includes('aria-busy'));
  assert.ok(componentSource.includes('role="alert"'));
  assert.ok(componentSource.includes('target="_top"'));
  assert.ok(componentSource.includes('loadCaseWorkflow'));
  assert.ok(!componentSource.includes('fetch('));
  assert.ok(!componentSource.includes('mutat'));
  assert.ok(caseWorkflowStyles.includes('pxd-case__rail-item--current'));
});

test('page layout is a standalone page with one front-component widget', () => {
  assert.ok(pageLayoutSource.includes('PageLayoutType.STANDALONE_PAGE'));
  assert.ok(pageLayoutSource.includes('FRONT_COMPONENT'));
  assert.ok(pageLayoutSource.includes('caseWorkflowWidget'));
});

test('navigation entry follows the MAB workflow pipeline at position three', () => {
  assert.ok(navigationSource.includes('NavigationMenuItemType.PAGE_LAYOUT'));
  assert.ok(navigationSource.includes('position: 3'));
});
