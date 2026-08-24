import {
  PASHX_APPROVAL_STATUSES,
  PASHX_BLOCKED_REASON_CODES,
  PASHX_INSIGHT_CONFIDENCE_LEVELS,
  PASHX_INSIGHT_LIFECYCLE_STATUSES,
  PASHX_INSIGHT_TYPES,
  PASHX_NEXT_ACTION_CODES,
  PASHX_PROCUREMENT_CASE_STAGES,
  type PashxApprovalQueueItem,
  type PashxApprovalStatus,
  type PashxBlockedReasonCode,
  type PashxEvidenceInsight,
  type PashxInsightConfidence,
  type PashxInsightLifecycleStatus,
  type PashxInsightType,
  type PashxNextActionCode,
  type PashxOperationalCommandCentreResult,
  type PashxProcurementCaseStage,
} from 'pashx-mab-contract';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';

import { classifyCommandCentre } from './classify-command-centre';
import type {
  CommandCentreCaseRecord,
  CommandCentreDocumentRecord,
  CommandCentreExpenseRecord,
} from './command-centre.types';

const DEFAULT_QUERY_LIMIT = 200;
const MAX_QUERY_LIMIT = 500;

type QueryClient = Readonly<{
  query: (selection: Record<string, unknown>) => Promise<unknown>;
}>;

type QueryConnection<TNode> = Readonly<{
  edges?: readonly Readonly<{ node: TNode }>[];
  pageInfo?: Readonly<{ hasNextPage: boolean }>;
}>;

type CaseNode = Readonly<{
  id: string;
  name: string;
  customerRecordId?: string | null;
  projectName?: string | null;
  ownerRecordId?: string | null;
  stage?: string | null;
  nextActionCode?: string | null;
  actionDueAt?: string | null;
  blockedReasonCode?: string | null;
  updatedAt: string;
}>;

type DocumentNode = Readonly<{
  id: string;
  procurementCaseRecordId: string;
  documentType: string;
  lifecycleStatus: string;
  complianceStatus?: string | null;
  supplierRecordId?: string | null;
  issueDate?: string | null;
  currencyCode?: string | null;
  updatedAt: string;
}>;

type ExpenseNode = Readonly<{
  id: string;
  procurementCaseRecordId: string;
  approvalStatus: string;
  updatedAt: string;
}>;

type ApprovalNode = Readonly<{
  id: string;
  name: string;
  status?: string | null;
  requestedActionCode?: string | null;
  requesterRecordId?: string | null;
  approverRecordId?: string | null;
  requestedAt?: string | null;
  sourceRecordIds?: unknown;
}>;

type InsightNode = Readonly<{
  id: string;
  name?: string | null;
  insightType?: string | null;
  lifecycleStatus?: string | null;
  narrative?: string | null;
  sourceRecordIds?: unknown;
  generatorVersion?: string | null;
  generatedAt?: string | null;
  confidence?: string | null;
}>;

type CommandCentreQueryData = Readonly<{
  procurementCases?: QueryConnection<CaseNode>;
  commercialDocuments?: QueryConnection<DocumentNode>;
  expenses?: QueryConnection<ExpenseNode>;
  approvalRequests?: QueryConnection<ApprovalNode>;
  operationalInsights?: QueryConnection<InsightNode>;
}>;

type IdentityQueryData = Readonly<{
  currentUser?: Readonly<{
    workspaceMember?: Readonly<{ id: string }> | null;
  }>;
}>;

const fromManifestValue = <T extends string>(
  value: string | null | undefined,
  allowedValues: readonly T[],
): T | null => {
  if (value === null || value === undefined) return null;
  const normalized = value.toLowerCase().replace(/_/g, '-');
  return allowedValues.find((allowed) => allowed === normalized) ?? null;
};

const fromManifestCode = <T extends string>(
  value: string | null | undefined,
  allowedValues: readonly T[],
): T | null =>
  value !== null &&
  value !== undefined &&
  allowedValues.some((allowed) => allowed === value)
    ? (value as T)
    : null;

const fromManifestUppercaseCode = <T extends string>(
  value: string | null | undefined,
  allowedValues: readonly T[],
): T | null => {
  if (value === null || value === undefined) return null;
  const normalized = value.toUpperCase();
  return allowedValues.find((allowed) => allowed === normalized) ?? null;
};

const toSourceRecordIds = (value: unknown): readonly string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];

const toApprovalQueueItem = (
  node: ApprovalNode,
): PashxApprovalQueueItem | null => {
  const status = fromManifestUppercaseCode<PashxApprovalStatus>(
    node.status,
    PASHX_APPROVAL_STATUSES,
  );
  // Defensive: decided approvals never enter the queue even if a server filter is not honored.
  if (status !== 'PENDING') return null;

  return {
    id: node.id,
    name: node.name ?? '',
    status,
    requestedActionCode: node.requestedActionCode ?? '',
    requesterRecordId: node.requesterRecordId ?? '',
    approverRecordId: node.approverRecordId ?? null,
    requestedAt: node.requestedAt ?? '',
    sourceRecordIds: toSourceRecordIds(node.sourceRecordIds),
  };
};

const toEvidenceInsight = (node: InsightNode): PashxEvidenceInsight | null => {
  const lifecycleStatus =
    fromManifestUppercaseCode<PashxInsightLifecycleStatus>(
      node.lifecycleStatus,
      PASHX_INSIGHT_LIFECYCLE_STATUSES,
    );
  // Defensive: only active stored insights are displayed, never dismissed or superseded ones.
  if (lifecycleStatus !== 'ACTIVE') return null;

  return {
    id: node.id,
    insightType: fromManifestUppercaseCode<PashxInsightType>(
      node.insightType,
      PASHX_INSIGHT_TYPES,
    ),
    narrative: node.narrative ?? '',
    sourceRecordIds: toSourceRecordIds(node.sourceRecordIds),
    generatorVersion: node.generatorVersion ?? '',
    generatedAt: node.generatedAt ?? '',
    confidence: fromManifestUppercaseCode<PashxInsightConfidence>(
      node.confidence,
      PASHX_INSIGHT_CONFIDENCE_LEVELS,
    ),
  };
};

const toCaseRecord = (node: CaseNode): CommandCentreCaseRecord => ({
  id: node.id,
  name: node.name,
  customerRecordId: node.customerRecordId ?? null,
  projectName: node.projectName ?? null,
  ownerRecordId: node.ownerRecordId ?? null,
  stage: fromManifestValue<PashxProcurementCaseStage>(
    node.stage,
    PASHX_PROCUREMENT_CASE_STAGES,
  ),
  nextActionCode: fromManifestCode<PashxNextActionCode>(
    node.nextActionCode,
    PASHX_NEXT_ACTION_CODES,
  ),
  actionDueAt: node.actionDueAt ?? null,
  blockedReasonCode: fromManifestCode<PashxBlockedReasonCode>(
    node.blockedReasonCode,
    PASHX_BLOCKED_REASON_CODES,
  ),
  updatedAt: node.updatedAt,
});

const toDocumentRecord = (
  node: DocumentNode,
): CommandCentreDocumentRecord => ({
  id: node.id,
  procurementCaseRecordId: node.procurementCaseRecordId,
  documentType: node.documentType,
  lifecycleStatus: node.lifecycleStatus,
  complianceStatus: node.complianceStatus ?? null,
  supplierRecordId: node.supplierRecordId ?? null,
  issueDate: node.issueDate ?? null,
  currencyCode: node.currencyCode ?? null,
  updatedAt: node.updatedAt,
});

const toExpenseRecord = (node: ExpenseNode): CommandCentreExpenseRecord => ({
  id: node.id,
  procurementCaseRecordId: node.procurementCaseRecordId,
  approvalStatus: node.approvalStatus,
  updatedAt: node.updatedAt,
});

export const loadCommandCentre = async ({
  now = () => new Date(),
  limit = DEFAULT_QUERY_LIMIT,
  client = new CoreApiClient() as QueryClient,
  identityClient = new MetadataApiClient() as QueryClient,
}: {
  now?: () => Date;
  limit?: number;
  client?: QueryClient;
  identityClient?: QueryClient;
}): Promise<PashxOperationalCommandCentreResult> => {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_QUERY_LIMIT) {
    throw new RangeError(
      `Command Centre limit must be an integer from 1 to ${MAX_QUERY_LIMIT}.`,
    );
  }

  const identity = (await identityClient.query({
    currentUser: { workspaceMember: { id: true } },
  })) as IdentityQueryData;
  const currentUserRecordId = identity.currentUser?.workspaceMember?.id;

  if (currentUserRecordId === undefined) {
    throw new Error(
      'Command Centre cannot resolve the current workspace member identity.',
    );
  }

  const data = (await client.query({
    procurementCases: {
      __args: { first: limit },
      pageInfo: { hasNextPage: true },
      edges: {
        node: {
          id: true,
          name: true,
          customerRecordId: true,
          projectName: true,
          ownerRecordId: true,
          stage: true,
          nextActionCode: true,
          actionDueAt: true,
          blockedReasonCode: true,
          updatedAt: true,
        },
      },
    },
    commercialDocuments: {
      __args: { first: limit },
      pageInfo: { hasNextPage: true },
      edges: {
        node: {
          id: true,
          procurementCaseRecordId: true,
          documentType: true,
          lifecycleStatus: true,
          complianceStatus: true,
          supplierRecordId: true,
          issueDate: true,
          currencyCode: true,
          updatedAt: true,
        },
      },
    },
    expenses: {
      __args: { first: limit },
      pageInfo: { hasNextPage: true },
      edges: {
        node: {
          id: true,
          procurementCaseRecordId: true,
          approvalStatus: true,
          updatedAt: true,
        },
      },
    },
    approvalRequests: {
      __args: { first: limit, filter: { status: { eq: 'PENDING' } } },
      pageInfo: { hasNextPage: true },
      edges: {
        node: {
          id: true,
          name: true,
          status: true,
          requestedActionCode: true,
          requesterRecordId: true,
          approverRecordId: true,
          requestedAt: true,
          sourceRecordIds: true,
        },
      },
    },
    operationalInsights: {
      __args: { first: limit, filter: { lifecycleStatus: { eq: 'ACTIVE' } } },
      pageInfo: { hasNextPage: true },
      edges: {
        node: {
          id: true,
          name: true,
          insightType: true,
          lifecycleStatus: true,
          narrative: true,
          sourceRecordIds: true,
          generatorVersion: true,
          generatedAt: true,
          confidence: true,
        },
      },
    },
  })) as CommandCentreQueryData;

  const asOf = now().toISOString();
  const isPartial = [
    data.procurementCases,
    data.commercialDocuments,
    data.expenses,
    data.approvalRequests,
    data.operationalInsights,
  ].some((connection) => connection?.pageInfo?.hasNextPage === true);

  return {
    commandItems: classifyCommandCentre({
      cases: (data.procurementCases?.edges ?? []).map(({ node }) =>
        toCaseRecord(node),
      ),
      documents: (data.commercialDocuments?.edges ?? []).map(({ node }) =>
        toDocumentRecord(node),
      ),
      expenses: (data.expenses?.edges ?? []).map(({ node }) =>
        toExpenseRecord(node),
      ),
      currentUserRecordId,
      observedAt: asOf,
    }),
    approvals: (data.approvalRequests?.edges ?? [])
      .map(({ node }) => toApprovalQueueItem(node))
      .filter(
        (approval): approval is PashxApprovalQueueItem => approval !== null,
      ),
    insights: (data.operationalInsights?.edges ?? [])
      .map(({ node }) => toEvidenceInsight(node))
      .filter((insight): insight is PashxEvidenceInsight => insight !== null),
    isPartial,
    asOf,
  };
};
