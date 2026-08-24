import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PASHX_COMMERCIAL_DOCUMENT_TYPES,
  PASHX_MAB_AGENT_FORBIDDEN_WORKFLOW_ACTIONS,
  PASHX_MAB_CANCELLABLE_STAGES,
  PASHX_MAB_STAGE_TRANSITIONS,
  PASHX_MAB_WORKFLOW_DOCUMENT_RULES,
  PASHX_MAB_WORKFLOW_DOCUMENT_TYPES,
  getPashxMabStageTransition,
  isPashxMabStageTransitionAllowed,
} from '../dist/index.js';

test('the document rules cover the MAB operating workflow without ambiguous RFQs', () => {
  assert.deepEqual(PASHX_MAB_WORKFLOW_DOCUMENT_TYPES, [
    'customerRfq',
    'supplierRfq',
    'vendorQuote',
    'customerQuote',
    'customerPurchaseOrder',
    'vendorPurchaseOrder',
    'deliveryNote',
    'vendorInvoice',
    'customerInvoice',
  ]);
  assert.equal(
    PASHX_MAB_WORKFLOW_DOCUMENT_TYPES.every((documentType) =>
      PASHX_COMMERCIAL_DOCUMENT_TYPES.includes(documentType),
    ),
    true,
  );
  assert.deepEqual(
    Object.keys(PASHX_MAB_WORKFLOW_DOCUMENT_RULES),
    PASHX_MAB_WORKFLOW_DOCUMENT_TYPES,
  );
  assert.equal(
    Object.values(PASHX_MAB_WORKFLOW_DOCUMENT_RULES).every(
      (rule) =>
        rule.sourceAttachmentRequired && rule.finalizationActor === 'human',
    ),
    true,
  );
  assert.deepEqual(PASHX_MAB_WORKFLOW_DOCUMENT_RULES.customerRfq, {
    workflowStep: 1,
    stage: 'intake',
    issuer: 'customer',
    recipient: 'mab',
    requiresSupplier: false,
    requiresTotal: false,
    sourceAttachmentRequired: true,
    finalizationActor: 'human',
  });
  assert.deepEqual(PASHX_MAB_WORKFLOW_DOCUMENT_RULES.vendorInvoice, {
    workflowStep: 'supporting',
    stage: 'delivery',
    issuer: 'supplier',
    recipient: 'mab',
    requiresSupplier: true,
    requiresTotal: true,
    sourceAttachmentRequired: true,
    finalizationActor: 'human',
  });
});

test('the stage graph permits only the seven forward operating transitions', () => {
  assert.equal(PASHX_MAB_STAGE_TRANSITIONS.length, 7);
  assert.equal(isPashxMabStageTransitionAllowed('intake', 'sourcing'), true);
  assert.equal(isPashxMabStageTransitionAllowed('intake', 'quoted'), false);
  assert.equal(isPashxMabStageTransitionAllowed('closed', 'invoicing'), false);
  assert.deepEqual(getPashxMabStageTransition('quoted', 'customer-order'), {
    from: 'quoted',
    to: 'customer-order',
    requiredFinalizedDocuments: ['customerPurchaseOrder'],
    approvalGate: 'client-order-verification',
    actor: 'human',
  });
  assert.equal(getPashxMabStageTransition('cancelled', 'intake'), undefined);
  assert.deepEqual(PASHX_MAB_CANCELLABLE_STAGES, [
    'intake',
    'sourcing',
    'quoted',
    'customer-order',
    'vendor-order',
    'delivery',
    'invoicing',
  ]);
});

test('agent restrictions preserve human approval and financial boundaries', () => {
  assert.deepEqual(PASHX_MAB_AGENT_FORBIDDEN_WORKFLOW_ACTIONS, [
    'approve',
    'finalize-document',
    'record-delivery',
    'post-invoice',
    'change-compliance-state',
  ]);
  assert.equal(
    PASHX_MAB_STAGE_TRANSITIONS.every(({ actor }) => actor === 'human'),
    true,
  );
  assert.equal(
    PASHX_MAB_STAGE_TRANSITIONS.find(
      ({ from, to }) => from === 'customer-order' && to === 'vendor-order',
    )?.approvalGate,
    'internal-procurement-approval',
  );
  assert.equal(
    PASHX_MAB_STAGE_TRANSITIONS.find(
      ({ from, to }) => from === 'invoicing' && to === 'closed',
    )?.approvalGate,
    'finance-posting-approval',
  );
});
