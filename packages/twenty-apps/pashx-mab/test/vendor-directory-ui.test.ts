import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type { RfqEligibleCase } from '../src/vendor-directory/vendor-directory.types';
import {
  buildRfqEligibleCases,
  buildVendorDirectoryRows,
  filterVendorDirectoryRows,
  getCaseRecordHref,
  getCompanyRecordHref,
  loadVendorDirectory,
} from '../src/vendor-directory/load-vendor-directory';
import type {
  VendorDirectoryCaseRecord,
  VendorDirectoryDocumentRecord,
  VendorDirectoryVendorRecord,
} from '../src/vendor-directory/vendor-directory.types';
import {
  toVendorDirectoryLocale,
  vendorDirectoryCopy,
} from '../src/front-components/vendor-directory.copy';
import { vendorDirectoryStyles } from '../src/front-components/vendor-directory.styles';

const componentSource = readFileSync(
  new URL(
    '../src/front-components/vendor-directory.front-component.tsx',
    import.meta.url,
  ),
  'utf8',
);
const pageLayoutSource = readFileSync(
  new URL(
    '../src/page-layouts/vendor-directory.page-layout.ts',
    import.meta.url,
  ),
  'utf8',
);
const navigationSource = readFileSync(
  new URL(
    '../src/navigation-menu-items/vendor-directory.navigation-menu-item.ts',
    import.meta.url,
  ),
  'utf8',
);

const CASE_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const OTHER_CASE_ID = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const SUPPLIER_ID = 'cccccccc-3333-4333-8333-cccccccccccc';
const CUSTOMER_ID = 'dddddddd-4444-4444-8444-dddddddddddd';

const vendor = (
  overrides: Partial<VendorDirectoryVendorRecord> = {},
): VendorDirectoryVendorRecord => ({
  id: SUPPLIER_ID,
  name: 'Al Shuweir',
  vendorId: '101',
  commercialRegistrationNumber: 'CR-101',
  vatRegistrationNumber: 'VAT-202',
  ...overrides,
});

const caseRecord = (
  overrides: Partial<VendorDirectoryCaseRecord> = {},
): VendorDirectoryCaseRecord => ({
  id: CASE_ID,
  name: 'Case A',
  stage: 'intake',
  aggregateVersion: 2,
  ...overrides,
});

const documentRecord = (
  overrides: Partial<VendorDirectoryDocumentRecord> = {},
): VendorDirectoryDocumentRecord => ({
  id: 'eeeeeeee-5555-4555-8555-eeeeeeeeeeee',
  name: 'DOC-1',
  procurementCaseRecordId: CASE_ID,
  documentType: 'SUPPLIER_RFQ',
  lifecycleStatus: 'DRAFT',
  supplierRecordId: SUPPLIER_ID,
  ...overrides,
});

test('eligible cases are intake/sourcing cases that carry a client RFQ', () => {
  const cases: readonly VendorDirectoryCaseRecord[] = [
    caseRecord({ id: CASE_ID, stage: 'intake' }),
    caseRecord({ id: OTHER_CASE_ID, stage: 'sourcing', name: 'Case B' }),
    caseRecord({ id: 'c-3', stage: 'quoted' }),
    caseRecord({ id: 'c-4', stage: 'intake', name: 'Case D' }),
  ];
  const documents: readonly VendorDirectoryDocumentRecord[] = [
    documentRecord({
      documentType: 'CUSTOMER_RFQ',
      lifecycleStatus: 'FINALIZED',
      supplierRecordId: null,
    }),
    documentRecord({
      id: 'doc-2',
      procurementCaseRecordId: 'c-4',
      documentType: 'CUSTOMER_RFQ',
      supplierRecordId: null,
    }),
  ];

  const eligible = buildRfqEligibleCases(cases, documents) as RfqEligibleCase[];

  // Both intake cases carry a client RFQ; the sourcing case without one stays out.
  assert.deepEqual(
    eligible.map((entry) => entry.id),
    [CASE_ID, 'c-4'],
  );
  assert.equal(eligible[0]?.stage, 'intake');
  assert.equal(eligible[1]?.aggregateVersion, 2);
});

test('directory rows count open RFQs, quotes and active cases per supplier', () => {
  const rows = buildVendorDirectoryRows({
    vendors: [vendor(), vendor({ id: CUSTOMER_ID, name: 'Customer Co' })],
    cases: [caseRecord({ name: 'Case A' })],
    documents: [
      documentRecord({ id: 'rfq-1', lifecycleStatus: 'DRAFT' }),
      documentRecord({
        id: 'rfq-2',
        lifecycleStatus: 'FINALIZED',
      }),
      documentRecord({
        id: 'quote-1',
        documentType: 'VENDOR_QUOTE',
        lifecycleStatus: 'FINALIZED',
      }),
      documentRecord({
        id: 'other-case-rfq',
        procurementCaseRecordId: OTHER_CASE_ID,
        lifecycleStatus: 'DRAFT',
      }),
    ],
    isPartial: false,
    asOf: '2026-08-25T00:00:00.000Z',
  });

  assert.equal(rows.length, 2);
  const supplierRow = rows[0];

  // Open supplier RFQs span cases: rfq-1 (Case A) and the draft on the other case.
  assert.equal(supplierRow?.openSupplierRfqCount, 2);
  assert.equal(supplierRow?.finalizedSupplierRfqCount, 1);
  assert.equal(supplierRow?.vendorQuoteCount, 1);
  assert.deepEqual(supplierRow?.activeCaseNames, ['Case A']);
});

test('row with no activity shows honest empty counts', () => {
  const rows = buildVendorDirectoryRows({
    vendors: [vendor()],
    cases: [],
    documents: [],
    isPartial: false,
    asOf: '2026-08-25T00:00:00.000Z',
  });

  assert.equal(rows[0]?.openSupplierRfqCount, 0);
  assert.equal(rows[0]?.vendorQuoteCount, 0);
  assert.deepEqual(rows[0]?.activeCaseNames, []);
});

test('directory search matches supplier name, CR and VAT without changing rows', () => {
  const rows = buildVendorDirectoryRows({
    vendors: [
      vendor(),
      vendor({
        id: CUSTOMER_ID,
        name: 'Gulf Cables',
        vendorId: '107',
        commercialRegistrationNumber: '2059007788',
        vatRegistrationNumber: '310987654300003',
      }),
    ],
    cases: [],
    documents: [],
    isPartial: false,
    asOf: '2026-08-25T00:00:00.000Z',
  });

  assert.deepEqual(filterVendorDirectoryRows(rows, ' shuweir '), [rows[0]]);
  assert.deepEqual(filterVendorDirectoryRows(rows, '2059007788'), [rows[1]]);
  assert.deepEqual(filterVendorDirectoryRows(rows, '310987654300003'), [rows[1]]);
  assert.deepEqual(filterVendorDirectoryRows(rows, '107'), [rows[1]]);
  assert.equal(filterVendorDirectoryRows(rows, '').length, 2);
});

test('loader maps stored values and filters companies by supplier role', async () => {
  const client = {
    query: async () => ({
      companies: {
        pageInfo: { hasNextPage: false },
        edges: [
          {
            node: {
              id: SUPPLIER_ID,
              name: 'Al Shuweir',
              vendorId: '101',
              commercialRegistrationNumber: 'CR-101',
              vatRegistrationNumber: 'VAT-202',
              mabBusinessRoles: ['SUPPLIER'],
            },
          },
          {
            node: {
              id: CUSTOMER_ID,
              name: 'Customer Co',
              mabBusinessRoles: ['CUSTOMER'],
            },
          },
        ],
      },
      procurementCases: {
        pageInfo: { hasNextPage: false },
        edges: [
          {
            node: {
              id: CASE_ID,
              name: 'Case A',
              stage: 'INTAKE',
              aggregateVersion: 2,
            },
          },
        ],
      },
      commercialDocuments: {
        pageInfo: { hasNextPage: true },
        edges: [
          {
            node: {
              id: 'rfq-1',
              name: 'MAB-SRFQ-2026-0001',
              procurementCaseRecordId: CASE_ID,
              documentType: 'SUPPLIER_RFQ',
              lifecycleStatus: 'DRAFT',
              supplierRecordId: SUPPLIER_ID,
            },
          },
        ],
      },
    }),
  };

  const result = await loadVendorDirectory({ client });

  assert.equal(result.isPartial, true);
  assert.deepEqual(
    result.vendors.map((entry) => entry.id),
    [SUPPLIER_ID],
  );
  assert.equal(result.vendors[0]?.commercialRegistrationNumber, 'CR-101');
  assert.equal(result.cases[0]?.stage, 'intake');
  assert.equal(result.documents[0]?.documentType, 'SUPPLIER_RFQ');
});

test('loader rejects out-of-range limits', async () => {
  await assert.rejects(
    () =>
      loadVendorDirectory({ limit: 0, client: { query: async () => ({}) } }),
    RangeError,
  );
});

test('record hrefs use the native object routes', () => {
  assert.equal(getCompanyRecordHref(SUPPLIER_ID), `/object/company/${SUPPLIER_ID}`);
  assert.equal(getCaseRecordHref(CASE_ID), `/object/procurementCase/${CASE_ID}`);
});

test('copy covers both locales with matching keys', () => {
  for (const locale of ['en', 'ar'] as const) {
    const copy = vendorDirectoryCopy[locale];

    assert.deepEqual(Object.keys(copy), Object.keys(vendorDirectoryCopy.en));
    for (const stage of [
      'intake',
      'sourcing',
      'quoted',
      'customer-order',
      'vendor-order',
      'delivery',
      'invoicing',
      'closed',
      'cancelled',
    ]) {
      assert.equal(typeof copy.stages[stage as never], 'string');
    }
    assert.equal(copy.submitRfq.length > 0, true);
    assert.equal(copy.noOutboundBoundary.length > 0, true);
  }
});

test('locale resolution defaults to English', () => {
  assert.equal(toVendorDirectoryLocale('ar'), 'ar');
  assert.equal(toVendorDirectoryLocale('en'), 'en');
  assert.equal(toVendorDirectoryLocale(null), 'en');
});

test('component requests RFQs through the REST command boundary only', () => {
  assert.ok(componentSource.includes('supplier-rfqs'));
  assert.ok(componentSource.includes('RestApiClient'));
  assert.ok(componentSource.includes('getPashxCommandErrorMessage'));
  assert.ok(componentSource.includes('target="_top"'));
  assert.ok(componentSource.includes('role="alert"'));
  assert.ok(componentSource.includes('type="search"'));
  assert.ok(componentSource.includes('filterVendorDirectoryRows'));
  assert.ok(!componentSource.includes('fetch('));
  assert.ok(vendorDirectoryStyles.includes('pxd-vendor__table'));
});

test('page layout is a standalone page and navigation sits at position six', () => {
  assert.ok(pageLayoutSource.includes('PageLayoutType.STANDALONE_PAGE'));
  assert.ok(pageLayoutSource.includes('FRONT_COMPONENT'));
  assert.ok(navigationSource.includes('NavigationMenuItemType.PAGE_LAYOUT'));
  assert.ok(navigationSource.includes('position: 6'));
});
