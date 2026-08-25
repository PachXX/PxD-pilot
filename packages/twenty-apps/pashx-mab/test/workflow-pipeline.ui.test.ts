import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { PASHX_PROCUREMENT_CASE_STAGES } from 'pashx-mab-contract';

import { loadWorkflowPipeline } from '../src/workflow-pipeline/load-workflow-pipeline';
import {
  toWorkflowPipelineLocale,
  workflowPipelineCopy,
} from '../src/front-components/workflow-pipeline.copy';

const componentSource = readFileSync(
  new URL(
    '../src/front-components/workflow-pipeline.front-component.tsx',
    import.meta.url,
  ),
  'utf8',
);
const pageLayoutSource = readFileSync(
  new URL('../src/page-layouts/workflow-pipeline.page-layout.ts', import.meta.url),
  'utf8',
);
const navigationSource = readFileSync(
  new URL(
    '../src/navigation-menu-items/workflow-pipeline.navigation-menu-item.ts',
    import.meta.url,
  ),
  'utf8',
);

type Selection = Readonly<Record<string, unknown>>;

const loadWithSelections = async ({
  cases = { pageInfo: { hasNextPage: false }, edges: [] },
  documents = { pageInfo: { hasNextPage: false }, edges: [] },
  companies = { pageInfo: { hasNextPage: false }, edges: [] },
  limit = 200,
}: {
  cases?: unknown;
  documents?: unknown;
  companies?: unknown;
  limit?: number;
} = {}) => {
  const selections: Selection[] = [];
  const result = await loadWorkflowPipeline({
    limit,
    now: () => new Date('2026-08-25T12:00:00.000Z'),
    client: {
      query: async (selection) => {
        selections.push(selection);
        return 'companies' in selection
          ? { companies }
          : { procurementCases: cases, commercialDocuments: documents };
      },
    },
  });
  return { result, selections };
};

test('loader maps stored enums, scopes customer lookup and filters foreign evidence', async () => {
  const { result, selections } = await loadWithSelections({
    cases: {
      pageInfo: { hasNextPage: false },
      edges: [
        {
          node: {
            id: 'case-1',
            name: 'PC-001',
            stage: 'CUSTOMER_ORDER',
            aggregateVersion: 4,
            customerRecordId: 'company-1',
            projectName: 'Pump package',
            nextActionCode: null,
            actionDueAt: null,
            blockedReasonCode: null,
            deliveryStatus: 'NOT_STARTED',
            deliveryDueAt: null,
            supplierResponseDeadlineAt: null,
            updatedAt: '2026-08-25T10:00:00.000Z',
          },
        },
      ],
    },
    documents: {
      pageInfo: { hasNextPage: false },
      edges: [
        {
          node: {
            id: 'document-1',
            name: 'PO-001',
            procurementCaseRecordId: 'case-1',
            documentType: 'CUSTOMER_PURCHASE_ORDER',
            lifecycleStatus: 'FINALIZED',
            complianceStatus: 'APPROVED',
            issueDate: '2026-08-24',
            currencyCode: 'SAR',
            totalAmount: { amountMicros: 100_000_000, currencyCode: 'SAR' },
          },
        },
        {
          node: {
            id: 'foreign',
            name: 'FOREIGN',
            procurementCaseRecordId: 'case-outside-role',
            documentType: 'VENDOR_QUOTE',
            lifecycleStatus: 'FINALIZED',
            complianceStatus: 'APPROVED',
            issueDate: '2026-08-24',
            currencyCode: 'SAR',
            totalAmount: { amountMicros: 1, currencyCode: 'SAR' },
          },
        },
      ],
    },
    companies: {
      pageInfo: { hasNextPage: false },
      edges: [{ node: { id: 'company-1', name: 'MAB Demo Customer' } }],
    },
  });

  assert.equal(result.cases[0]?.stage, 'customer-order');
  assert.equal(result.cases[0]?.aggregateVersion, 4);
  assert.equal(result.cases[0]?.deliveryStatus, 'notStarted');
  assert.equal(result.documents[0]?.documentType, 'customerPurchaseOrder');
  assert.deepEqual(result.documents.map(({ id }) => id), ['document-1']);
  assert.deepEqual(
    (selections[1]?.companies as { __args: unknown }).__args,
    { first: 200, filter: { id: { in: ['company-1'] } } },
  );
  assert.equal(
    (
      (
        selections[0]?.procurementCases as {
          edges: { node: Record<string, unknown> };
        }
      ).edges.node
    ).aggregateVersion,
    true,
  );
});

test('loader reports bounded partial data and rejects unsafe limits', async () => {
  const { result } = await loadWithSelections({
    cases: { pageInfo: { hasNextPage: true }, edges: [] },
  });
  assert.equal(result.isPartial, true);

  await assert.rejects(() => loadWithSelections({ limit: 0 }), RangeError);
  await assert.rejects(() => loadWithSelections({ limit: 501 }), RangeError);
  await assert.rejects(() => loadWithSelections({ limit: 1.5 }), RangeError);
});

test('English and Arabic pipeline copy cover every stage and share one structure', () => {
  assert.deepEqual(
    Object.keys(workflowPipelineCopy.en).sort(),
    Object.keys(workflowPipelineCopy.ar).sort(),
  );
  for (const locale of ['en', 'ar'] as const) {
    assert.deepEqual(
      Object.keys(workflowPipelineCopy[locale].stages),
      [...PASHX_PROCUREMENT_CASE_STAGES],
    );
    assert.deepEqual(
      Object.keys(workflowPipelineCopy[locale].stageDescriptions),
      [...PASHX_PROCUREMENT_CASE_STAGES],
    );
  }
  assert.match(workflowPipelineCopy.ar.title, /\p{Script=Arabic}/u);
  assert.equal(toWorkflowPipelineLocale('ar-SA'), 'ar');
  assert.equal(toWorkflowPipelineLocale('en-US'), 'en');
  assert.equal(toWorkflowPipelineLocale('de-DE'), 'en');
});

test('component moves only through the audited transition command', () => {
  const requiredPatterns = [
    /dir=\{locale === 'ar' \? 'rtl' : 'ltr'\}/,
    /lang=\{locale\}/,
    /aria-live="polite"/,
    /role="alert"/,
    /aria-pressed=\{includeArchived\}/,
    /target="_top"/,
    /getWorkflowPipelineCaseHref/,
    /getWorkflowPipelineDocumentHref/,
    /mab-indus-solutions-logo\.jpg/,
    /draggable=\{canMove && movingCaseId === null\}/,
    /onDragStart=/,
    /onDrop=/,
    /PashxTransitionCaseRequest/,
    /expectedVersion: caseRecord\.aggregateVersion/,
    /idempotencyKey: transitionAttempt\.current\.idempotencyKey/,
    /\/rest\/pashx-mab\/procurement-cases\/\$\{encodeURIComponent\(caseRecord\.id\)\}\/transitions/,
    /isAllowedWorkflowPipelineMove/,
    /Promise\.race/,
    /copy\.moveTimeout/,
  ];
  requiredPatterns.forEach((pattern) => assert.match(componentSource, pattern));
  assert.doesNotMatch(componentSource, /updateOneProcurementCase/);
  assert.doesNotMatch(componentSource, /stage:\s*toStage/);
  assert.doesNotMatch(componentSource, /dataTransfer/);
});

test('page and navigation wire the dedicated MAB pipeline identifiers', () => {
  assert.match(pageLayoutSource, /workflowPipelineOverviewTab/);
  assert.match(pageLayoutSource, /workflowPipelineWidget/);
  assert.match(pageLayoutSource, /workflowPipeline/);
  assert.match(navigationSource, /name: 'MAB pipeline'/);
  assert.match(navigationSource, /IconLayoutKanban/);
  assert.match(navigationSource, /position: 2/);
});
