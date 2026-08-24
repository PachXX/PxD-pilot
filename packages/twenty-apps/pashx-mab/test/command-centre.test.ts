import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyCommandCentre } from '../src/command-centre/classify-command-centre';
import { loadCommandCentre } from '../src/command-centre/load-command-centre';
import type {
  CommandCentreCaseRecord,
  CommandCentreDocumentRecord,
  CommandCentreExpenseRecord,
} from '../src/command-centre/command-centre.types';

const UPDATED_AT = '2026-08-20T10:00:00.000Z';
const OBSERVED_AT = '2026-08-21T08:00:00.000Z';

const caseRecord = (
  overrides: Partial<CommandCentreCaseRecord> = {},
): CommandCentreCaseRecord => ({
  id: 'case-1',
  name: 'Al Shuwayer chain',
  customerRecordId: 'customer-1',
  projectName: 'Fabrication shop',
  ownerRecordId: 'member-1',
  stage: 'vendor-order',
  nextActionCode: 'REVIEW_DRAFT_DOCUMENT',
  actionDueAt: null,
  blockedReasonCode: null,
  updatedAt: UPDATED_AT,
  ...overrides,
});

const documentRecord = (
  overrides: Partial<CommandCentreDocumentRecord> = {},
): CommandCentreDocumentRecord => ({
  id: 'document-1',
  procurementCaseRecordId: 'case-1',
  documentType: 'VENDOR_PURCHASE_ORDER',
  lifecycleStatus: 'DRAFT',
  complianceStatus: 'NOT_REQUIRED',
  supplierRecordId: 'supplier-1',
  issueDate: '2026-08-20',
  currencyCode: 'SAR',
  updatedAt: UPDATED_AT,
  ...overrides,
});

const expenseRecord = (
  overrides: Partial<CommandCentreExpenseRecord> = {},
): CommandCentreExpenseRecord => ({
  id: 'expense-1',
  procurementCaseRecordId: 'case-1',
  approvalStatus: 'PENDING',
  updatedAt: UPDATED_AT,
  ...overrides,
});

const approvalNode = (
  overrides: Readonly<Record<string, unknown>> = {},
) => ({
  id: 'approval-1',
  name: 'Issue vendor PO for case-1',
  status: 'PENDING',
  requestedActionCode: 'ISSUE_VENDOR_PO',
  requesterRecordId: 'member-1',
  approverRecordId: 'member-2',
  requestedAt: '2026-08-21T07:00:00.000Z',
  sourceRecordIds: ['case-1', 'document-1'],
  ...overrides,
});

const insightNode = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  id: 'insight-1',
  name: 'Delivery date drift',
  insightType: 'OBSERVATION',
  lifecycleStatus: 'ACTIVE',
  narrative: 'Vendor order delivery window shifted.',
  sourceRecordIds: ['case-1', 42, 'document-1'],
  generatorVersion: 'evidence-analyst@0.2.9',
  generatedAt: '2026-08-24T09:00:00.000Z',
  confidence: 'HIGH',
  ...overrides,
});

const loadWithConnections = async ({
  connections = {},
  identity = { currentUser: { workspaceMember: { id: 'member-1' } } },
  limit = 25,
}: {
  connections?: Readonly<Record<string, unknown>>;
  identity?: Readonly<Record<string, unknown>>;
  limit?: number;
}) => {
  let selection: Record<string, unknown> | undefined;
  const result = await loadCommandCentre({
    now: () => new Date(OBSERVED_AT),
    limit,
    identityClient: { query: () => Promise.resolve(identity) },
    client: {
      query: (nextSelection) => {
        selection = nextSelection;
        return Promise.resolve(connections);
      },
    },
  });
  return { result, selection };
};

test('classifies owned complete drafts and pending expenses as actions', () => {
  const items = classifyCommandCentre({
    cases: [caseRecord()],
    documents: [documentRecord()],
    expenses: [expenseRecord()],
    currentUserRecordId: 'member-1',
    observedAt: OBSERVED_AT,
  });

  assert.deepEqual(
    items.map(({ signal, reasonCode, recordId }) => ({
      signal,
      reasonCode,
      recordId,
    })),
    [
      {
        signal: 'ACTION_REQUIRED',
        reasonCode: 'DRAFT_DOCUMENT_REVIEW_REQUIRED',
        recordId: 'document-1',
      },
      {
        signal: 'ACTION_REQUIRED',
        reasonCode: 'EXPENSE_REVIEW_REQUIRED',
        recordId: 'expense-1',
      },
    ],
  );
});

test('does not expose another owner action', () => {
  const items = classifyCommandCentre({
    cases: [caseRecord({ ownerRecordId: 'member-2' })],
    documents: [documentRecord()],
    expenses: [expenseRecord()],
    currentUserRecordId: 'member-1',
    observedAt: OBSERVED_AT,
  });

  assert.deepEqual(items, []);
});

test('chooses one deterministic missing-case reason', () => {
  const items = classifyCommandCentre({
    cases: [
      caseRecord({
        customerRecordId: null,
        projectName: null,
        ownerRecordId: null,
      }),
    ],
    documents: [],
    expenses: [],
    currentUserRecordId: 'member-1',
    observedAt: OBSERVED_AT,
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.reasonCode, 'CASE_CUSTOMER_MISSING');
});

test('compliance exceptions outrank missing document data', () => {
  const items = classifyCommandCentre({
    cases: [caseRecord()],
    documents: [
      documentRecord({
        complianceStatus: 'REJECTED',
        supplierRecordId: null,
        issueDate: null,
        currencyCode: null,
      }),
    ],
    expenses: [],
    currentUserRecordId: 'member-1',
    observedAt: OBSERVED_AT,
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.signal, 'COMPLIANCE_EXCEPTION');
  assert.equal(items[0]?.reasonCode, 'COMPLIANCE_REJECTED');
});

test('uses stable signal, due-date, update-time, and id ordering', () => {
  const items = classifyCommandCentre({
    cases: [
      caseRecord({ id: 'case-blocked', customerRecordId: null }),
      caseRecord({ id: 'case-later', actionDueAt: '2026-08-25T00:00:00.000Z' }),
      caseRecord({ id: 'case-earlier', actionDueAt: '2026-08-22T00:00:00.000Z' }),
    ],
    documents: [
      documentRecord({ id: 'doc-later', procurementCaseRecordId: 'case-later' }),
      documentRecord({ id: 'doc-earlier', procurementCaseRecordId: 'case-earlier' }),
    ],
    expenses: [],
    currentUserRecordId: 'member-1',
    observedAt: OBSERVED_AT,
  });

  assert.deepEqual(
    items.map(({ recordId }) => recordId),
    ['case-blocked', 'doc-earlier', 'doc-later'],
  );
});

test('returns a bounded partial result and normalizes manifest stage values', async () => {
  const { result, selection } = await loadWithConnections({
    connections: {
      procurementCases: {
        pageInfo: { hasNextPage: false },
        edges: [
          {
            node: {
              ...caseRecord(),
              stage: 'VENDOR_ORDER',
            },
          },
        ],
      },
      commercialDocuments: {
        pageInfo: { hasNextPage: true },
        edges: [{ node: documentRecord() }],
      },
      expenses: {
        pageInfo: { hasNextPage: false },
        edges: [],
      },
    },
  });

  assert.equal(result.isPartial, true);
  assert.equal(result.asOf, OBSERVED_AT);
  assert.equal(result.commandItems[0]?.stage, 'vendor-order');
  assert.deepEqual(
    (selection?.procurementCases as { __args: unknown }).__args,
    { first: 25 },
  );
});

test('queries only pending approvals and active insights with server-side filters', async () => {
  const { result, selection } = await loadWithConnections({
    connections: {
      procurementCases: {
        pageInfo: { hasNextPage: false },
        edges: [{ node: caseRecord() }],
      },
      commercialDocuments: {
        pageInfo: { hasNextPage: false },
        edges: [{ node: documentRecord() }],
      },
      expenses: { pageInfo: { hasNextPage: false }, edges: [] },
      approvalRequests: {
        pageInfo: { hasNextPage: false },
        edges: [{ node: approvalNode() }],
      },
      operationalInsights: {
        pageInfo: { hasNextPage: false },
        edges: [{ node: insightNode() }],
      },
    },
  });

  assert.deepEqual(
    (selection?.approvalRequests as { __args: unknown }).__args,
    { first: 25, filter: { status: { eq: 'PENDING' } } },
  );
  assert.deepEqual(
    (selection?.operationalInsights as { __args: unknown }).__args,
    { first: 25, filter: { lifecycleStatus: { eq: 'ACTIVE' } } },
  );
  assert.deepEqual(result.approvals, [
    {
      id: 'approval-1',
      name: 'Issue vendor PO for case-1',
      status: 'PENDING',
      requestedActionCode: 'ISSUE_VENDOR_PO',
      requesterRecordId: 'member-1',
      approverRecordId: 'member-2',
      requestedAt: '2026-08-21T07:00:00.000Z',
      sourceRecordIds: ['case-1', 'document-1'],
    },
  ]);
  assert.deepEqual(result.insights, [
    {
      id: 'insight-1',
      insightType: 'OBSERVATION',
      narrative: 'Vendor order delivery window shifted.',
      sourceRecordIds: ['case-1', 'document-1'],
      generatorVersion: 'evidence-analyst@0.2.9',
      generatedAt: '2026-08-24T09:00:00.000Z',
      confidence: 'HIGH',
    },
  ]);
});

test('defensively excludes decided approvals even when the server filter is not honored', async () => {
  const { result } = await loadWithConnections({
    connections: {
      approvalRequests: {
        pageInfo: { hasNextPage: false },
        edges: [
          { node: approvalNode({ id: 'pending-1' }) },
          { node: approvalNode({ id: 'decided-1', status: 'APPROVED' }) },
          { node: approvalNode({ id: 'lower-1', status: 'pending' }) },
          { node: approvalNode({ id: 'unknown-1', status: 'NOT_A_STATUS' }) },
        ],
      },
    },
  });

  assert.deepEqual(
    result.approvals.map(({ id }) => id),
    ['pending-1', 'lower-1'],
  );
  assert.equal(
    result.approvals.every(({ status }) => status === 'PENDING'),
    true,
  );
});

test('defensively excludes non-active insights and normalizes unknown values to null', async () => {
  const { result } = await loadWithConnections({
    connections: {
      operationalInsights: {
        pageInfo: { hasNextPage: false },
        edges: [
          { node: insightNode() },
          {
            node: insightNode({
              id: 'dismissed-1',
              lifecycleStatus: 'DISMISSED',
            }),
          },
          {
            node: insightNode({
              id: 'odd-1',
              insightType: 'SENTIMENT',
              confidence: 'CERTAIN',
              lifecycleStatus: 'active',
              sourceRecordIds: 'case-1',
            }),
          },
        ],
      },
    },
  });

  assert.deepEqual(
    result.insights.map(({ id }) => id),
    ['insight-1', 'odd-1'],
  );
  const odd = result.insights.find(({ id }) => id === 'odd-1');
  assert.equal(odd?.insightType, null);
  assert.equal(odd?.confidence, null);
  assert.deepEqual(odd?.sourceRecordIds, []);
});

test('isPartial covers the approval and insight connections too', async () => {
  const { result } = await loadWithConnections({
    connections: {
      procurementCases: {
        pageInfo: { hasNextPage: false },
        edges: [],
      },
      commercialDocuments: {
        pageInfo: { hasNextPage: false },
        edges: [],
      },
      expenses: { pageInfo: { hasNextPage: false }, edges: [] },
      approvalRequests: {
        pageInfo: { hasNextPage: false },
        edges: [],
      },
      operationalInsights: {
        pageInfo: { hasNextPage: true },
        edges: [],
      },
    },
  });

  assert.equal(result.isPartial, true);
  assert.deepEqual(result.commandItems, []);
  assert.deepEqual(result.approvals, []);
  assert.deepEqual(result.insights, []);
});

test('rejects unbounded query limits at the boundary', async () => {
  await assert.rejects(
    loadCommandCentre({
      limit: 501,
      client: { query: () => Promise.resolve({}) },
      identityClient: { query: () => Promise.resolve({}) },
    }),
    /integer from 1 to 500/,
  );
});

test('fails closed when the authenticated workspace member is unavailable', async () => {
  await assert.rejects(
    loadCommandCentre({
      client: { query: () => Promise.resolve({}) },
      identityClient: {
        query: () => Promise.resolve({ currentUser: { workspaceMember: null } }),
      },
    }),
    /cannot resolve the current workspace member identity/,
  );
});
