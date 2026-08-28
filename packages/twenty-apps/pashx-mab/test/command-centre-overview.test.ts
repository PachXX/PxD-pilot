import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCommandCentreOverview } from '../src/command-centre/build-command-centre-overview';
import { loadCommandCentreOverview } from '../src/command-centre/load-command-centre-overview';
import type {
  CommandCentreCaseRecord,
  CommandCentreDocumentRecord,
} from '../src/command-centre/command-centre.types';

const AS_OF = '2026-08-25T10:00:00.000Z';

const caseRecord = (
  overrides: Partial<CommandCentreCaseRecord> = {},
): CommandCentreCaseRecord => ({
  id: 'case-1',
  name: 'MAB-META-001',
  customerRecordId: 'customer-1',
  projectName: 'Verified MAB import',
  ownerRecordId: 'member-1',
  stage: null,
  nextActionCode: null,
  actionDueAt: null,
  blockedReasonCode: null,
  deliveryStatus: 'notStarted',
  deliveryDueAt: null,
  supplierResponseDeadlineAt: null,
  updatedAt: '2026-08-24T10:00:00.000Z',
  ...overrides,
});

const documentRecord = (
  overrides: Partial<CommandCentreDocumentRecord> = {},
): CommandCentreDocumentRecord => ({
  id: 'quote-draft',
  name: 'DBMS-QUOTE-001',
  procurementCaseRecordId: 'case-1',
  documentType: 'VENDOR_QUOTE',
  normalizedDocumentType: 'vendorQuote',
  lifecycleStatus: 'DRAFT',
  complianceStatus: 'PENDING',
  supplierRecordId: 'supplier-1',
  issueDate: '2026-08-20',
  currencyCode: 'SAR',
  totalAmountMicros: 127_544_200_000,
  leadTimeDays: null,
  paymentTerms: null,
  validUntil: null,
  updatedAt: '2026-08-24T09:00:00.000Z',
  ...overrides,
});

test('overview preserves missing stages and refuses draft quotation ranking', () => {
  const result = buildCommandCentreOverview({
    cases: [caseRecord()],
    documents: [
      documentRecord(),
      documentRecord({
        id: 'invoice-final',
        name: 'MAB-INV-001',
        documentType: 'CUSTOMER_INVOICE',
        normalizedDocumentType: 'customerInvoice',
        lifecycleStatus: 'FINALIZED',
        complianceStatus: 'CLEARED',
        supplierRecordId: null,
      }),
    ],
    expenses: [],
    companies: [
      {
        id: 'customer-1',
        name: 'Seyana',
        commercialRegistrationNumber: 'CR-1',
        vatRegistrationNumber: 'VAT-1',
      },
      {
        id: 'supplier-1',
        name: 'DBMS',
        commercialRegistrationNumber: 'CR-2',
        vatRegistrationNumber: 'VAT-2',
      },
    ],
    cashMovements: [],
    cashCapabilityAvailable: true,
    commandItems: [],
    approvals: [],
    insights: [],
    partialSources: [],
    asOf: AS_OF,
  });

  assert.equal(result.stageSummary.unrecordedCount, 1);
  assert.equal(result.stageSummary.counts.intake, 0);
  assert.equal(result.cases[0]?.caseRecord.stage, null);
  assert.equal(
    result.cases[0]?.quotation.recommendationStatus,
    'AWAITING_FINALIZED_RESPONSES',
  );
  assert.equal(result.cases[0]?.quotation.draftResponseCount, 1);
  assert.equal(result.cases[0]?.finalizedDocumentCount, 1);
  assert.equal(result.cases[0]?.cash.status, 'NOT_RECORDED');
  assert.equal(result.cases[0]?.customer?.name, 'Seyana');
  assert.deepEqual(
    result.cases[0]?.suppliers.map(({ company }) => company.name),
    ['DBMS'],
  );
  assert.ok(
    result.recordLinks.some(
      ({ objectName, recordId }) =>
        objectName === 'commercialDocument' && recordId === 'quote-draft',
    ),
  );
});

test('verified cash requires a source document in the same case', () => {
  const result = buildCommandCentreOverview({
    cases: [caseRecord()],
    documents: [
      documentRecord({
        id: 'invoice-final',
        normalizedDocumentType: 'customerInvoice',
        lifecycleStatus: 'FINALIZED',
      }),
    ],
    expenses: [],
    companies: [],
    cashMovements: [
      {
        id: 'cash-valid',
        name: 'Bank receipt 1',
        direction: 'INFLOW',
        verificationStatus: 'VERIFIED',
        procurementCaseRecordId: 'case-1',
        sourceDocumentRecordId: 'invoice-final',
        movementDate: '2026-08-24',
        amountMicros: 10_000_000,
        currencyCode: 'SAR',
        bankReference: 'BANK-1',
        evidenceReference: 'EVIDENCE-1',
      },
      {
        id: 'cash-cross-case',
        name: 'Wrong source',
        direction: 'OUTFLOW',
        verificationStatus: 'VERIFIED',
        procurementCaseRecordId: 'case-1',
        sourceDocumentRecordId: 'foreign-document',
        movementDate: '2026-08-24',
        amountMicros: 9_000_000,
        currencyCode: 'SAR',
        bankReference: null,
        evidenceReference: 'EVIDENCE-2',
      },
    ],
    cashCapabilityAvailable: true,
    commandItems: [],
    approvals: [],
    insights: [],
    partialSources: [],
    asOf: AS_OF,
  });

  assert.equal(result.cases[0]?.cash.status, 'VERIFIED');
  if (result.cases[0]?.cash.status !== 'VERIFIED') return;
  assert.equal(result.cases[0].cash.currencies[0]?.inflowMicros, 10_000_000n);
  assert.equal(result.cases[0].cash.currencies[0]?.outflowMicros, 0n);
  assert.deepEqual(
    result.cases[0].cash.movementLinks.map(({ recordId }) => recordId),
    ['cash-valid'],
  );
});

test('bounded loader server-scopes dependants and removes mixed foreign source ids', async () => {
  const selections: Record<string, unknown>[] = [];
  const client = {
    query: (selection: Record<string, unknown>): Promise<unknown> => {
      selections.push(selection);
      if ('procurementCases' in selection) {
        return Promise.resolve({
          procurementCases: {
            pageInfo: { hasNextPage: false },
            edges: [{ node: caseRecord() }],
          },
        });
      }
      if ('commercialDocuments' in selection) {
        return Promise.resolve({
          commercialDocuments: {
            pageInfo: { hasNextPage: false },
            edges: [
              {
                node: {
                  ...documentRecord(),
                  totalAmount: {
                    amountMicros: 127_544_200_000,
                    currencyCode: 'SAR',
                  },
                },
              },
            ],
          },
          expenses: { pageInfo: { hasNextPage: false }, edges: [] },
        });
      }
      if ('cashMovements' in selection) {
        return Promise.reject(new Error('Cannot query field cashMovements'));
      }
      if ('companies' in selection) {
        return Promise.resolve({
          companies: {
            pageInfo: { hasNextPage: false },
            edges: [
              { node: { id: 'customer-1', name: 'Seyana' } },
              { node: { id: 'supplier-1', name: 'DBMS' } },
            ],
          },
        });
      }
      return Promise.resolve({
        approvalRequests: {
          pageInfo: { hasNextPage: false },
          edges: [
            {
              node: {
                id: 'approval-1',
                name: 'Approve case',
                status: 'PENDING',
                requestedActionCode: 'ISSUE_VENDOR_PO',
                requesterRecordId: 'member-1',
                requestedAt: AS_OF,
                sourceRecordIds: ['foreign-id', 'case-1'],
              },
            },
          ],
        },
        operationalInsights: {
          pageInfo: { hasNextPage: false },
          edges: [
            {
              node: {
                id: 'insight-1',
                insightType: 'DATA_QUALITY',
                lifecycleStatus: 'ACTIVE',
                narrative: 'Source-backed gap.',
                sourceRecordIds: ['foreign-id', 'quote-draft'],
                generatorVersion: 'evidence-analyst@1',
                generatedAt: AS_OF,
                confidence: 'HIGH',
              },
            },
          ],
        },
      });
    },
  };

  const result = await loadCommandCentreOverview({
    now: () => new Date(AS_OF),
    limit: 25,
    client,
    identityClient: {
      query: () =>
        Promise.resolve({
          currentUser: { workspaceMember: { id: 'member-1' } },
        }),
    },
  });

  const dependentSelection = selections.find(
    (selection) => 'commercialDocuments' in selection,
  );
  assert.deepEqual(
    (
      dependentSelection?.commercialDocuments as {
        __args: unknown;
      }
    ).__args,
    {
      first: 25,
      filter: { procurementCaseRecordId: { in: ['case-1'] } },
    },
  );
  assert.deepEqual(result.approvals[0]?.sourceRecordIds, ['case-1']);
  assert.deepEqual(result.insights[0]?.sourceRecordIds, ['quote-draft']);
  assert.equal(result.cases[0]?.cash.status, 'UNAVAILABLE');
  assert.equal(result.isPartial, true);
  assert.ok(result.partialSources.includes('evidenceSourceLinks'));
});
