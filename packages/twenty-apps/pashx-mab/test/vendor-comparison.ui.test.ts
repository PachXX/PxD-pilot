import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  PASHX_PROCUREMENT_CASE_STAGES,
} from 'pashx-mab-contract';

import { loadVendorComparison } from '../src/vendor-comparison/load-vendor-comparison';
import {
  toVendorComparisonLocale,
  vendorComparisonCopy,
} from '../src/front-components/vendor-comparison.copy';
import { vendorComparisonStyles } from '../src/front-components/vendor-comparison.styles';

const componentSource = readFileSync(
  new URL(
    '../src/front-components/vendor-comparison.front-component.tsx',
    import.meta.url,
  ),
  'utf8',
);
const pageLayoutSource = readFileSync(
  new URL('../src/page-layouts/vendor-comparison.page-layout.ts', import.meta.url),
  'utf8',
);
const navigationSource = readFileSync(
  new URL(
    '../src/navigation-menu-items/vendor-comparison.navigation-menu-item.ts',
    import.meta.url,
  ),
  'utf8',
);

const CASE_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const OBSERVED_AT = '2026-09-01T00:00:00.000Z';

type Selection = Readonly<Record<string, unknown>>;

const loadWithSelections = async ({
  caseConnection = { pageInfo: { hasNextPage: false }, edges: [] },
  documentConnection = { pageInfo: { hasNextPage: false }, edges: [] },
  companyConnection = { pageInfo: { hasNextPage: false }, edges: [] },
  limit = 200,
}: {
  caseConnection?: unknown;
  documentConnection?: unknown;
  companyConnection?: unknown;
  limit?: number;
}): Promise<{ result: Awaited<ReturnType<typeof loadVendorComparison>>; selections: Selection[] }> => {
  const selections: Selection[] = [];
  const result = await loadVendorComparison({
    caseId: CASE_ID,
    now: () => new Date(OBSERVED_AT),
    limit,
    client: {
      query: async (selection: Record<string, unknown>) => {
        selections.push(selection);
        if ('companies' in selection) {
          return { companies: companyConnection };
        }
        return {
          procurementCases: caseConnection,
          commercialDocuments: documentConnection,
        };
      },
    },
  });
  return { result, selections };
};

test('loader scopes case, documents and companies with server-side filters', async () => {
  const { selections } = await loadWithSelections({
    caseConnection: {
      pageInfo: { hasNextPage: false },
      edges: [
        {
          node: {
            id: CASE_ID,
            name: 'Case 1',
            stage: 'SOURCING',
            customerRecordId: 'customer-1',
            nextActionCode: 'REVIEW_DRAFT_DOCUMENT',
            actionDueAt: null,
            supplierResponseDeadlineAt: null,
          },
        },
      ],
    },
    documentConnection: {
      pageInfo: { hasNextPage: false },
      edges: [
        {
          node: {
            id: 'q-1',
            name: 'Q-001',
            procurementCaseRecordId: CASE_ID,
            documentType: 'VENDOR_QUOTE',
            lifecycleStatus: 'FINALIZED',
            supplierRecordId: 'supplier-1',
            issueDate: '2026-08-01',
            currencyCode: 'SAR',
            totalAmount: { amountMicros: 100000000, currencyCode: 'SAR' },
            leadTimeDays: 10,
            paymentTerms: 'Net 30',
            validUntil: '2026-12-31',
          },
        },
      ],
    },
  });

  assert.equal(selections.length, 2);
  const firstSelection = selections[0];
  const secondSelection = selections[1];
  assert.ok(firstSelection !== undefined);
  assert.ok(secondSelection !== undefined);
  assert.deepEqual(
    (firstSelection.procurementCases as { __args: unknown }).__args,
    { first: 1, filter: { id: { eq: CASE_ID } } },
  );
  assert.deepEqual(
    (firstSelection.commercialDocuments as { __args: unknown }).__args,
    { first: 200, filter: { procurementCaseRecordId: { eq: CASE_ID } } },
  );
  assert.deepEqual(
    (secondSelection.companies as { __args: unknown }).__args,
    { first: 200, filter: { id: { in: ['supplier-1', 'customer-1'] } } },
  );
});

test('loader skips the company query when no identities are derived', async () => {
  const { selections, result } = await loadWithSelections({
    caseConnection: {
      pageInfo: { hasNextPage: false },
      edges: [
        {
          node: {
            id: CASE_ID,
            name: 'Case 1',
            stage: null,
            customerRecordId: null,
            nextActionCode: null,
            actionDueAt: null,
            supplierResponseDeadlineAt: null,
          },
        },
      ],
    },
    documentConnection: { pageInfo: { hasNextPage: false }, edges: [] },
  });

  assert.equal(selections.length, 1);
  assert.deepEqual(result.companies, []);
});

test('loader never surfaces a document from another case', async () => {
  const { result } = await loadWithSelections({
    caseConnection: {
      pageInfo: { hasNextPage: false },
      edges: [
        {
          node: {
            id: CASE_ID,
            name: 'Case 1',
            stage: 'SOURCING',
            customerRecordId: null,
            nextActionCode: null,
            actionDueAt: null,
            supplierResponseDeadlineAt: null,
          },
        },
      ],
    },
    documentConnection: {
      pageInfo: { hasNextPage: false },
      edges: [
        {
          node: {
            id: 'other-1',
            name: 'OTHER-001',
            procurementCaseRecordId: 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
            documentType: 'VENDOR_QUOTE',
            lifecycleStatus: 'FINALIZED',
            supplierRecordId: 'supplier-x',
            issueDate: '2026-08-01',
            currencyCode: 'SAR',
            totalAmount: { amountMicros: 1, currencyCode: 'SAR' },
            leadTimeDays: null,
            paymentTerms: null,
            validUntil: null,
          },
        },
        {
          node: {
            id: 'mine-1',
            name: 'MINE-001',
            procurementCaseRecordId: CASE_ID,
            documentType: 'VENDOR_QUOTE',
            lifecycleStatus: 'FINALIZED',
            supplierRecordId: 'supplier-1',
            issueDate: '2026-08-01',
            currencyCode: 'SAR',
            totalAmount: { amountMicros: 100000000, currencyCode: 'SAR' },
            leadTimeDays: null,
            paymentTerms: null,
            validUntil: null,
          },
        },
      ],
    },
  });

  assert.deepEqual(
    result.documents.map((document) => document.id),
    ['mine-1'],
  );
});

test('loader maps stored values to contract vocabulary and flags partial pages', async () => {
  const { result } = await loadWithSelections({
    caseConnection: {
      pageInfo: { hasNextPage: false },
      edges: [
        {
          node: {
            id: CASE_ID,
            name: 'Case 1',
            stage: 'CUSTOMER_ORDER',
            customerRecordId: 'customer-1',
            nextActionCode: 'REVIEW_DRAFT_DOCUMENT',
            actionDueAt: '2026-09-10T00:00:00.000Z',
            supplierResponseDeadlineAt: '2026-08-28T00:00:00.000Z',
          },
        },
      ],
    },
    documentConnection: {
      pageInfo: { hasNextPage: true },
      edges: [
        {
          node: {
            id: 'q-1',
            name: 'Q-001',
            procurementCaseRecordId: CASE_ID,
            documentType: 'VENDOR_QUOTE',
            lifecycleStatus: 'FINALIZED',
            supplierRecordId: 'supplier-1',
            issueDate: '2026-08-01',
            currencyCode: 'SAR',
            totalAmount: { amountMicros: 100000000, currencyCode: 'SAR' },
            leadTimeDays: 10,
            paymentTerms: 'Net 30',
            validUntil: '2026-12-31',
          },
        },
      ],
    },
  });

  assert.equal(result.isPartial, true);
  assert.equal(result.case?.stage, 'customer-order');
  assert.equal(result.case?.customerRecordId, 'customer-1');
  assert.equal(result.documents[0]?.documentType, 'vendorQuote');
  assert.equal(result.documents[0]?.totalAmountMicros, 100000000);
  assert.equal(result.documents[0]?.leadTimeDays, 10);
  assert.equal(result.documents[0]?.paymentTerms, 'Net 30');
  assert.equal(result.documents[0]?.validUntil, '2026-12-31');
  assert.equal(result.asOf, OBSERVED_AT);
});

test('loader rejects an empty case id and out-of-range limits', async () => {
  await assert.rejects(
    () => loadVendorComparison({ caseId: '  ', client: { query: async () => ({}) } }),
    RangeError,
  );
  await assert.rejects(
    () => loadVendorComparison({ caseId: CASE_ID, limit: 0, client: { query: async () => ({}) } }),
    RangeError,
  );
  await assert.rejects(
    () => loadVendorComparison({ caseId: CASE_ID, limit: 501, client: { query: async () => ({}) } }),
    RangeError,
  );
});

test('copy covers every stage in both locales and resolves locale deterministically', () => {
  for (const locale of ['en', 'ar'] as const) {
    const copy = vendorComparisonCopy[locale];
    assert.deepEqual(Object.keys(copy), Object.keys(vendorComparisonCopy.en));
    for (const stage of PASHX_PROCUREMENT_CASE_STAGES) {
      assert.equal(typeof copy.stages[stage], 'string');
      assert.ok(copy.stages[stage]!.length > 0);
    }
    assert.equal(copy.formulaSteps.length, 5);
    assert.equal(copy.lifecycleStatuses.FINALIZED.length > 0, true);
  }
  assert.equal(toVendorComparisonLocale('ar'), 'ar');
  assert.equal(toVendorComparisonLocale('en'), 'en');
  assert.equal(toVendorComparisonLocale(null), 'en');
  assert.equal(toVendorComparisonLocale('fr'), 'en');
});

test('component stays read-only with native links and honest states', () => {
  assert.ok(componentSource.includes('aria-busy'));
  assert.ok(componentSource.includes('aria-live="polite"'));
  assert.ok(componentSource.includes('role="alert"'));
  assert.ok(componentSource.includes('role="status"'));
  assert.ok(componentSource.includes('target="_top"'));
  assert.ok(componentSource.includes('loadVendorComparison'));
  assert.ok(componentSource.includes('useSelectedRecordIds'));
  assert.ok(componentSource.includes('th scope="col"'));
  assert.ok(componentSource.includes('<bdi'));
  assert.ok(!componentSource.includes('fetch('));
  assert.ok(!componentSource.includes('mutat'));
  assert.ok(!componentSource.includes('RestApiClient'));
  assert.ok(!componentSource.includes('mutation'));
});

test('page layout is a standalone page with one front-component widget', () => {
  assert.ok(pageLayoutSource.includes('PageLayoutType.STANDALONE_PAGE'));
  assert.ok(pageLayoutSource.includes('FRONT_COMPONENT'));
  assert.ok(pageLayoutSource.includes('vendorComparisonWidget'));
  assert.ok(pageLayoutSource.includes('vendorComparisonOverviewTab'));
});

test('navigation entry follows case workflow at position four', () => {
  assert.ok(navigationSource.includes('NavigationMenuItemType.PAGE_LAYOUT'));
  assert.ok(navigationSource.includes('position: 4'));
  assert.ok(navigationSource.includes("icon: 'IconScale'"));
});

test('styles preserve RTL, focus, target size and reduced-motion foundations', () => {
  assert.ok(vendorComparisonStyles.includes('.pxd-vc[dir="rtl"]'));
  assert.ok(vendorComparisonStyles.includes('.pxd-vc[data-color-scheme="dark"]'));
  assert.ok(vendorComparisonStyles.includes(':focus-visible'));
  assert.ok(vendorComparisonStyles.includes('min-height: 44px'));
  assert.ok(vendorComparisonStyles.includes('prefers-reduced-motion'));
  assert.ok(vendorComparisonStyles.includes('font-size: 16px'));
  assert.ok(vendorComparisonStyles.includes('.pxd-vc__link:visited'));
});
