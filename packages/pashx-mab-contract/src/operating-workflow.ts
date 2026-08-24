import type {
  PashxCommercialDocumentType,
  PashxProcurementCaseStage,
} from './domain.js';

export const PASHX_MAB_WORKFLOW_DOCUMENT_TYPES = [
  'customerRfq',
  'supplierRfq',
  'vendorQuote',
  'customerQuote',
  'customerPurchaseOrder',
  'vendorPurchaseOrder',
  'deliveryNote',
  'vendorInvoice',
  'customerInvoice',
] as const satisfies readonly PashxCommercialDocumentType[];

export type PashxMabWorkflowDocumentType =
  (typeof PASHX_MAB_WORKFLOW_DOCUMENT_TYPES)[number];

export type PashxMabWorkflowParty = 'customer' | 'mab' | 'supplier';

export type PashxMabWorkflowApprovalGate =
  | 'none'
  | 'client-order-verification'
  | 'internal-procurement-approval'
  | 'finance-posting-approval';

export type PashxMabWorkflowDocumentRule = Readonly<{
  workflowStep: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'supporting';
  stage: PashxProcurementCaseStage;
  issuer: PashxMabWorkflowParty;
  recipient: PashxMabWorkflowParty;
  requiresSupplier: boolean;
  requiresTotal: boolean;
  sourceAttachmentRequired: true;
  finalizationActor: 'human';
}>;

export const PASHX_MAB_WORKFLOW_DOCUMENT_RULES = Object.freeze({
  customerRfq: {
    workflowStep: 1,
    stage: 'intake',
    issuer: 'customer',
    recipient: 'mab',
    requiresSupplier: false,
    requiresTotal: false,
    sourceAttachmentRequired: true,
    finalizationActor: 'human',
  },
  supplierRfq: {
    workflowStep: 2,
    stage: 'sourcing',
    issuer: 'mab',
    recipient: 'supplier',
    requiresSupplier: true,
    requiresTotal: false,
    sourceAttachmentRequired: true,
    finalizationActor: 'human',
  },
  vendorQuote: {
    workflowStep: 2,
    stage: 'sourcing',
    issuer: 'supplier',
    recipient: 'mab',
    requiresSupplier: true,
    requiresTotal: true,
    sourceAttachmentRequired: true,
    finalizationActor: 'human',
  },
  customerQuote: {
    workflowStep: 3,
    stage: 'quoted',
    issuer: 'mab',
    recipient: 'customer',
    requiresSupplier: false,
    requiresTotal: true,
    sourceAttachmentRequired: true,
    finalizationActor: 'human',
  },
  customerPurchaseOrder: {
    workflowStep: 4,
    stage: 'customer-order',
    issuer: 'customer',
    recipient: 'mab',
    requiresSupplier: false,
    requiresTotal: true,
    sourceAttachmentRequired: true,
    finalizationActor: 'human',
  },
  vendorPurchaseOrder: {
    workflowStep: 5,
    stage: 'vendor-order',
    issuer: 'mab',
    recipient: 'supplier',
    requiresSupplier: true,
    requiresTotal: true,
    sourceAttachmentRequired: true,
    finalizationActor: 'human',
  },
  deliveryNote: {
    workflowStep: 6,
    stage: 'delivery',
    issuer: 'mab',
    recipient: 'customer',
    requiresSupplier: false,
    requiresTotal: false,
    sourceAttachmentRequired: true,
    finalizationActor: 'human',
  },
  vendorInvoice: {
    workflowStep: 'supporting',
    stage: 'delivery',
    issuer: 'supplier',
    recipient: 'mab',
    requiresSupplier: true,
    requiresTotal: true,
    sourceAttachmentRequired: true,
    finalizationActor: 'human',
  },
  customerInvoice: {
    workflowStep: 7,
    stage: 'invoicing',
    issuer: 'mab',
    recipient: 'customer',
    requiresSupplier: false,
    requiresTotal: true,
    sourceAttachmentRequired: true,
    finalizationActor: 'human',
  },
} satisfies Record<PashxMabWorkflowDocumentType, PashxMabWorkflowDocumentRule>);

export type PashxMabStageTransitionRule = Readonly<{
  from: PashxProcurementCaseStage;
  to: PashxProcurementCaseStage;
  requiredFinalizedDocuments: readonly PashxMabWorkflowDocumentType[];
  approvalGate: PashxMabWorkflowApprovalGate;
  actor: 'human';
}>;

export const PASHX_MAB_STAGE_TRANSITIONS = Object.freeze([
  {
    from: 'intake',
    to: 'sourcing',
    requiredFinalizedDocuments: ['customerRfq'],
    approvalGate: 'none',
    actor: 'human',
  },
  {
    from: 'sourcing',
    to: 'quoted',
    requiredFinalizedDocuments: ['vendorQuote', 'customerQuote'],
    approvalGate: 'none',
    actor: 'human',
  },
  {
    from: 'quoted',
    to: 'customer-order',
    requiredFinalizedDocuments: ['customerPurchaseOrder'],
    approvalGate: 'client-order-verification',
    actor: 'human',
  },
  {
    from: 'customer-order',
    to: 'vendor-order',
    requiredFinalizedDocuments: ['vendorPurchaseOrder'],
    approvalGate: 'internal-procurement-approval',
    actor: 'human',
  },
  {
    from: 'vendor-order',
    to: 'delivery',
    requiredFinalizedDocuments: ['vendorPurchaseOrder'],
    approvalGate: 'none',
    actor: 'human',
  },
  {
    from: 'delivery',
    to: 'invoicing',
    requiredFinalizedDocuments: ['deliveryNote'],
    approvalGate: 'none',
    actor: 'human',
  },
  {
    from: 'invoicing',
    to: 'closed',
    requiredFinalizedDocuments: ['customerInvoice'],
    approvalGate: 'finance-posting-approval',
    actor: 'human',
  },
] as const satisfies readonly PashxMabStageTransitionRule[]);

export const PASHX_MAB_CANCELLABLE_STAGES = [
  'intake',
  'sourcing',
  'quoted',
  'customer-order',
  'vendor-order',
  'delivery',
  'invoicing',
] as const satisfies readonly PashxProcurementCaseStage[];

export const PASHX_MAB_AGENT_FORBIDDEN_WORKFLOW_ACTIONS = [
  'approve',
  'finalize-document',
  'record-delivery',
  'post-invoice',
  'change-compliance-state',
] as const;

export const getPashxMabStageTransition = (
  from: PashxProcurementCaseStage,
  to: PashxProcurementCaseStage,
): PashxMabStageTransitionRule | undefined =>
  PASHX_MAB_STAGE_TRANSITIONS.find(
    (transition) => transition.from === from && transition.to === to,
  );

export const isPashxMabStageTransitionAllowed = (
  from: PashxProcurementCaseStage,
  to: PashxProcurementCaseStage,
): boolean => getPashxMabStageTransition(from, to) !== undefined;
