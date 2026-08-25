import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildWorkflowPipelineCards,
  buildWorkflowPipelineColumns,
  buildWorkflowPipelineSummary,
  getNextWorkflowPipelineStage,
  getWorkflowPipelineCaseHref,
  getWorkflowPipelineDocumentHref,
  isAllowedWorkflowPipelineMove,
  selectLatestPipelineEvidence,
} from '../src/workflow-pipeline/workflow-pipeline.model';
import type {
  WorkflowPipelineCaseRecord,
  WorkflowPipelineDocumentRecord,
  WorkflowPipelineResult,
} from '../src/workflow-pipeline/workflow-pipeline.types';

const NOW = new Date('2026-08-25T12:00:00.000Z');

const caseRecord = (
  overrides: Partial<WorkflowPipelineCaseRecord> = {},
): WorkflowPipelineCaseRecord => ({
  id: 'case-1',
  name: 'PC-001',
  stage: 'intake',
  aggregateVersion: 3,
  customerRecordId: 'customer-1',
  projectName: 'Fictional pump package',
  nextActionCode: 'COMPLETE_CASE_DATA',
  actionDueAt: '2026-08-26T12:00:00.000Z',
  blockedReasonCode: null,
  deliveryStatus: 'notStarted',
  deliveryDueAt: null,
  supplierResponseDeadlineAt: null,
  updatedAt: '2026-08-24T12:00:00.000Z',
  ...overrides,
});

const documentRecord = (
  overrides: Partial<WorkflowPipelineDocumentRecord> = {},
): WorkflowPipelineDocumentRecord => ({
  id: 'document-1',
  name: 'QT-001',
  procurementCaseRecordId: 'case-1',
  documentType: 'customerQuote',
  lifecycleStatus: 'FINALIZED',
  complianceStatus: 'APPROVED',
  issueDate: '2026-08-20',
  currencyCode: 'SAR',
  totalAmountMicros: 100_000_000,
  ...overrides,
});

const result = (
  overrides: Partial<WorkflowPipelineResult> = {},
): WorkflowPipelineResult => ({
  cases: [caseRecord()],
  documents: [documentRecord()],
  companies: [{ id: 'customer-1', name: 'MAB Demo Customer' }],
  isPartial: false,
  asOf: NOW.toISOString(),
  ...overrides,
});

test('selects one latest finalized amount-bearing evidence record without summing documents', () => {
  const evidence = selectLatestPipelineEvidence([
    documentRecord({ id: 'draft', lifecycleStatus: 'DRAFT', totalAmountMicros: 999_000_000 }),
    documentRecord({ id: 'older', name: 'QT-OLD', issueDate: '2026-08-19', totalAmountMicros: 80_000_000 }),
    documentRecord({ id: 'latest', name: 'PO-NEW', documentType: 'customerPurchaseOrder', issueDate: '2026-08-24', totalAmountMicros: 125_000_000 }),
    documentRecord({ id: 'no-total', issueDate: '2026-08-25', totalAmountMicros: null }),
  ]);

  assert.deepEqual(evidence, {
    documentId: 'latest',
    reference: 'PO-NEW',
    documentType: 'customerPurchaseOrder',
    issueDate: '2026-08-24',
    currencyCode: 'SAR',
    totalAmountMicros: 125_000_000,
  });
});

test('uses supplier and delivery deadlines for their workflow stages', () => {
  const cards = buildWorkflowPipelineCards(
    result({
      cases: [
        caseRecord({
          id: 'sourcing',
          stage: 'sourcing',
          supplierResponseDeadlineAt: '2026-08-24T12:00:00.000Z',
        }),
        caseRecord({
          id: 'delivery',
          stage: 'delivery',
          deliveryDueAt: '2026-08-23T12:00:00.000Z',
        }),
      ],
      documents: [],
    }),
    NOW,
  );

  assert.equal(cards[0]?.dueAt, '2026-08-24T12:00:00.000Z');
  assert.equal(cards[1]?.dueAt, '2026-08-23T12:00:00.000Z');
  assert.equal(cards[0]?.isOverdue, true);
  assert.equal(cards[1]?.isOverdue, true);
});

test('maps customer, document and compliance evidence onto each card', () => {
  const cards = buildWorkflowPipelineCards(
    result({
      documents: [
        documentRecord(),
        documentRecord({
          id: 'pending',
          lifecycleStatus: 'DRAFT',
          complianceStatus: 'PENDING',
        }),
      ],
    }),
    NOW,
  );

  assert.equal(cards[0]?.customerName, 'MAB Demo Customer');
  assert.equal(cards[0]?.documentCount, 2);
  assert.equal(cards[0]?.finalizedDocumentCount, 1);
  assert.equal(cards[0]?.complianceExceptionCount, 1);
});

test('shows seven active stages by default, filters search and archives closed cases', () => {
  const cards = buildWorkflowPipelineCards(
    result({
      cases: [
        caseRecord(),
        caseRecord({ id: 'closed', name: 'PC-ARCHIVED', stage: 'closed' }),
      ],
      documents: [],
    }),
    NOW,
  );

  const activeColumns = buildWorkflowPipelineColumns({
    cards,
    includeArchived: false,
    searchTerm: 'demo customer',
  });
  assert.equal(activeColumns.length, 7);
  assert.equal(
    activeColumns.reduce((total, column) => total + column.cards.length, 0),
    1,
  );
  assert.equal(activeColumns.some((column) => column.stage === 'closed'), false);

  const allColumns = buildWorkflowPipelineColumns({
    cards,
    includeArchived: true,
    searchTerm: 'archived',
  });
  assert.equal(allColumns.length, 9);
  assert.equal(
    allColumns.find((column) => column.stage === 'closed')?.cards[0]?.caseRecord.id,
    'closed',
  );
});

test('allows only the next audited workflow transition', () => {
  assert.equal(getNextWorkflowPipelineStage('intake'), 'sourcing');
  assert.equal(getNextWorkflowPipelineStage('customer-order'), 'vendor-order');
  assert.equal(getNextWorkflowPipelineStage('invoicing'), 'closed');
  assert.equal(getNextWorkflowPipelineStage('closed'), null);
  assert.equal(getNextWorkflowPipelineStage('cancelled'), null);
  assert.equal(isAllowedWorkflowPipelineMove('intake', 'sourcing'), true);
  assert.equal(isAllowedWorkflowPipelineMove('intake', 'quoted'), false);
  assert.equal(isAllowedWorkflowPipelineMove('sourcing', 'intake'), false);
});

test('sorts overdue and earliest-due cards first within a stage', () => {
  const cards = buildWorkflowPipelineCards(
    result({
      cases: [
        caseRecord({ id: 'future', actionDueAt: '2026-08-30T12:00:00.000Z' }),
        caseRecord({ id: 'overdue-late', actionDueAt: '2026-08-24T12:00:00.000Z' }),
        caseRecord({ id: 'overdue-early', actionDueAt: '2026-08-22T12:00:00.000Z' }),
      ],
      documents: [],
    }),
    NOW,
  );

  const intake = buildWorkflowPipelineColumns({
    cards,
    includeArchived: false,
    searchTerm: '',
  }).find((column) => column.stage === 'intake');
  assert.deepEqual(
    intake?.cards.map((card) => card.caseRecord.id),
    ['overdue-early', 'overdue-late', 'future'],
  );
});

test('summarizes active cases and stored evidence exactly', () => {
  const cards = buildWorkflowPipelineCards(
    result({
      cases: [caseRecord(), caseRecord({ id: 'closed', stage: 'closed' })],
      documents: [
        documentRecord(),
        documentRecord({ id: 'pending', complianceStatus: 'REJECTED' }),
      ],
    }),
    NOW,
  );

  assert.deepEqual(buildWorkflowPipelineSummary(cards), {
    visibleCaseCount: 2,
    activeCaseCount: 1,
    overdueCaseCount: 0,
    complianceExceptionCount: 1,
    finalizedDocumentCount: 2,
    totalDocumentCount: 2,
  });
});

test('builds encoded native case and evidence links', () => {
  assert.equal(
    getWorkflowPipelineCaseHref('case/id'),
    '/object/procurementCase/case%2Fid',
  );
  assert.equal(
    getWorkflowPipelineDocumentHref('doc/id'),
    '/object/commercialDocument/doc%2Fid',
  );
});
