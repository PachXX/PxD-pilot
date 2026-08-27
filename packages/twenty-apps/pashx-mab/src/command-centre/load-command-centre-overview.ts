import {
  PASHX_APPROVAL_STATUSES,
  PASHX_BLOCKED_REASON_CODES,
  PASHX_CASE_DELIVERY_STATUSES,
  PASHX_COMMERCIAL_DOCUMENT_TYPES,
  PASHX_INSIGHT_CONFIDENCE_LEVELS,
  PASHX_INSIGHT_LIFECYCLE_STATUSES,
  PASHX_INSIGHT_TYPES,
  PASHX_NEXT_ACTION_CODES,
  PASHX_PROCUREMENT_CASE_STAGES,
  type PashxApprovalQueueItem,
  type PashxApprovalStatus,
  type PashxBlockedReasonCode,
  type PashxCaseDeliveryStatus,
  type PashxCommercialDocumentType,
  type PashxEvidenceInsight,
  type PashxInsightConfidence,
  type PashxInsightLifecycleStatus,
  type PashxInsightType,
  type PashxNextActionCode,
  type PashxProcurementCaseStage,
} from 'pashx-mab-contract';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';

import type {
  CashMovementDirection,
  CashMovementVerificationStatus,
} from '../profitability/operational-profitability.types';
import { buildCommandCentreOverview } from './build-command-centre-overview';
import { classifyCommandCentre } from './classify-command-centre';
import type {
  CommandCentreCaseRecord,
  CommandCentreCashMovementRecord,
  CommandCentreCompanyRecord,
  CommandCentreDocumentRecord,
  CommandCentreExpenseRecord,
  CommandCentreOverviewResult,
  CommandCentrePartialSource,
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

type CurrencyValue = Readonly<{
  amountMicros?: number | null;
  currencyCode?: string | null;
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
  deliveryStatus?: string | null;
  deliveryDueAt?: string | null;
  supplierResponseDeadlineAt?: string | null;
  updatedAt: string;
}>;

type DocumentNode = Readonly<{
  id: string;
  name: string;
  procurementCaseRecordId: string;
  documentType?: string | null;
  lifecycleStatus?: string | null;
  complianceStatus?: string | null;
  supplierRecordId?: string | null;
  issueDate?: string | null;
  currencyCode?: string | null;
  totalAmount?: CurrencyValue | null;
  leadTimeDays?: number | null;
  paymentTerms?: string | null;
  validUntil?: string | null;
  updatedAt: string;
}>;

type ExpenseNode = Readonly<{
  id: string;
  procurementCaseRecordId: string;
  approvalStatus: string;
  updatedAt: string;
}>;

type CompanyNode = Readonly<{
  id: string;
  name: string;
  commercialRegistrationNumber?: string | null;
  vatRegistrationNumber?: string | null;
}>;

type CashMovementNode = Readonly<{
  id: string;
  name: string;
  direction?: string | null;
  verificationStatus?: string | null;
  procurementCaseRecordId: string;
  sourceDocumentRecordId?: string | null;
  movementDate?: string | null;
  amount?: CurrencyValue | null;
  bankReference?: string | null;
  evidenceReference?: string | null;
}>;

type ApprovalNode = Readonly<{
  id: string;
  name?: string | null;
  status?: string | null;
  requestedActionCode?: string | null;
  requesterRecordId?: string | null;
  approverRecordId?: string | null;
  requestedAt?: string | null;
  sourceRecordIds?: unknown;
}>;

type InsightNode = Readonly<{
  id: string;
  insightType?: string | null;
  lifecycleStatus?: string | null;
  narrative?: string | null;
  sourceRecordIds?: unknown;
  generatorVersion?: string | null;
  generatedAt?: string | null;
  confidence?: string | null;
}>;

type IdentityQueryData = Readonly<{
  currentUser?: Readonly<{
    workspaceMember?: Readonly<{ id: string }> | null;
  }>;
}>;

type OverviewQueryData = Readonly<{
  procurementCases?: QueryConnection<CaseNode>;
  commercialDocuments?: QueryConnection<DocumentNode>;
  expenses?: QueryConnection<ExpenseNode>;
  companies?: QueryConnection<CompanyNode>;
  cashMovements?: QueryConnection<CashMovementNode>;
  approvalRequests?: QueryConnection<ApprovalNode>;
  operationalInsights?: QueryConnection<InsightNode>;
}>;

export class CommandCentrePermissionError extends Error {
  constructor() {
    super('Command Centre access is unavailable for this workspace member.');
    this.name = 'CommandCentrePermissionError';
  }
}

export const isCommandCentrePermissionError = (error: unknown): boolean =>
  error instanceof CommandCentrePermissionError ||
  (error instanceof Error &&
    /forbidden|permission|unauthori[sz]ed|access denied/i.test(error.message));

const toUpperValue = <T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
): T | null => {
  if (value === null || value === undefined) return null;
  const normalized = value.toUpperCase();
  return allowed.find((entry) => entry === normalized) ?? null;
};

const toKebabValue = <T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
): T | null => {
  if (value === null || value === undefined) return null;
  const normalized = value.toLowerCase().replace(/_/g, '-');
  return allowed.find((entry) => entry === normalized) ?? null;
};

const toCamelValue = <T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
): T | null => {
  if (value === null || value === undefined) return null;
  const normalized = value
    .toLowerCase()
    .replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
  return allowed.find((entry) => entry === normalized) ?? null;
};

const toExactValue = <T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
): T | null =>
  value !== null &&
  value !== undefined &&
  allowed.some((entry) => entry === value)
    ? (value as T)
    : null;

const toSourceRecordIds = (value: unknown): readonly string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];

const toCaseRecord = (node: CaseNode): CommandCentreCaseRecord => ({
  id: node.id,
  name: node.name,
  customerRecordId: node.customerRecordId ?? null,
  projectName: node.projectName ?? null,
  ownerRecordId: node.ownerRecordId ?? null,
  stage: toKebabValue<PashxProcurementCaseStage>(
    node.stage,
    PASHX_PROCUREMENT_CASE_STAGES,
  ),
  nextActionCode: toExactValue<PashxNextActionCode>(
    node.nextActionCode,
    PASHX_NEXT_ACTION_CODES,
  ),
  actionDueAt: node.actionDueAt ?? null,
  blockedReasonCode: toExactValue<PashxBlockedReasonCode>(
    node.blockedReasonCode,
    PASHX_BLOCKED_REASON_CODES,
  ),
  deliveryStatus: toCamelValue<PashxCaseDeliveryStatus>(
    node.deliveryStatus,
    PASHX_CASE_DELIVERY_STATUSES,
  ),
  deliveryDueAt: node.deliveryDueAt ?? null,
  supplierResponseDeadlineAt: node.supplierResponseDeadlineAt ?? null,
  updatedAt: node.updatedAt,
});

const toDocumentRecord = (node: DocumentNode): CommandCentreDocumentRecord => ({
  id: node.id,
  name: node.name,
  procurementCaseRecordId: node.procurementCaseRecordId,
  documentType: node.documentType ?? '',
  normalizedDocumentType: toCamelValue<PashxCommercialDocumentType>(
    node.documentType,
    PASHX_COMMERCIAL_DOCUMENT_TYPES,
  ),
  lifecycleStatus: node.lifecycleStatus ?? '',
  complianceStatus: node.complianceStatus ?? null,
  supplierRecordId: node.supplierRecordId ?? null,
  issueDate: node.issueDate ?? null,
  currencyCode: node.totalAmount?.currencyCode ?? node.currencyCode ?? null,
  totalAmountMicros: node.totalAmount?.amountMicros ?? null,
  leadTimeDays: node.leadTimeDays ?? null,
  paymentTerms: node.paymentTerms ?? null,
  validUntil: node.validUntil ?? null,
  updatedAt: node.updatedAt,
});

const toExpenseRecord = (node: ExpenseNode): CommandCentreExpenseRecord => ({
  id: node.id,
  procurementCaseRecordId: node.procurementCaseRecordId,
  approvalStatus: node.approvalStatus,
  updatedAt: node.updatedAt,
});

const toCompanyRecord = (node: CompanyNode): CommandCentreCompanyRecord => ({
  id: node.id,
  name: node.name,
  commercialRegistrationNumber: node.commercialRegistrationNumber ?? null,
  vatRegistrationNumber: node.vatRegistrationNumber ?? null,
});

const toCashMovementRecord = (
  node: CashMovementNode,
): CommandCentreCashMovementRecord | null => {
  const direction = toUpperValue<CashMovementDirection>(node.direction, [
    'INFLOW',
    'OUTFLOW',
  ]);
  const verificationStatus = toUpperValue<CashMovementVerificationStatus>(
    node.verificationStatus,
    ['PENDING', 'VERIFIED', 'REJECTED'],
  );
  if (direction === null || verificationStatus === null) return null;

  return {
    id: node.id,
    name: node.name,
    direction,
    verificationStatus,
    procurementCaseRecordId: node.procurementCaseRecordId,
    sourceDocumentRecordId: node.sourceDocumentRecordId ?? null,
    movementDate: node.movementDate ?? null,
    amountMicros: node.amount?.amountMicros ?? null,
    currencyCode: node.amount?.currencyCode ?? null,
    bankReference: node.bankReference ?? null,
    evidenceReference: node.evidenceReference ?? null,
  };
};

const toApproval = (node: ApprovalNode): PashxApprovalQueueItem | null => {
  const status = toUpperValue<PashxApprovalStatus>(
    node.status,
    PASHX_APPROVAL_STATUSES,
  );
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

const toInsight = (node: InsightNode): PashxEvidenceInsight | null => {
  const lifecycleStatus = toUpperValue<PashxInsightLifecycleStatus>(
    node.lifecycleStatus,
    PASHX_INSIGHT_LIFECYCLE_STATUSES,
  );
  if (lifecycleStatus !== 'ACTIVE') return null;
  return {
    id: node.id,
    insightType: toUpperValue<PashxInsightType>(
      node.insightType,
      PASHX_INSIGHT_TYPES,
    ),
    narrative: node.narrative ?? '',
    sourceRecordIds: toSourceRecordIds(node.sourceRecordIds),
    generatorVersion: node.generatorVersion ?? '',
    generatedAt: node.generatedAt ?? '',
    confidence: toUpperValue<PashxInsightConfidence>(
      node.confidence,
      PASHX_INSIGHT_CONFIDENCE_LEVELS,
    ),
  };
};

const hasNextPage = <T>(connection: QueryConnection<T> | undefined): boolean =>
  connection?.pageInfo?.hasNextPage === true;

const hasScopedSource = (
  sourceRecordIds: readonly string[],
  scopedRecordIds: ReadonlySet<string>,
): boolean => sourceRecordIds.some((recordId) => scopedRecordIds.has(recordId));

const queryCashMovements = async ({
  client,
  caseIds,
  limit,
}: {
  client: QueryClient;
  caseIds: readonly string[];
  limit: number;
}): Promise<
  Readonly<{
    capabilityAvailable: boolean;
    records: readonly CommandCentreCashMovementRecord[];
    hasNextPage: boolean;
    readError: boolean;
  }>
> => {
  if (caseIds.length === 0) {
    return {
      capabilityAvailable: true,
      records: [],
      hasNextPage: false,
      readError: false,
    };
  }
  try {
    const data = (await client.query({
      cashMovements: {
        __args: {
          first: limit,
          filter: { procurementCaseRecordId: { in: caseIds } },
        },
        pageInfo: { hasNextPage: true },
        edges: {
          node: {
            id: true,
            name: true,
            direction: true,
            verificationStatus: true,
            procurementCaseRecordId: true,
            sourceDocumentRecordId: true,
            movementDate: true,
            amount: { amountMicros: true, currencyCode: true },
            bankReference: true,
            evidenceReference: true,
          },
        },
      },
    })) as OverviewQueryData;
    const caseIdSet = new Set(caseIds);
    return {
      capabilityAvailable: true,
      records: (data.cashMovements?.edges ?? [])
        .map(({ node }) => toCashMovementRecord(node))
        .filter(
          (record): record is CommandCentreCashMovementRecord =>
            record !== null && caseIdSet.has(record.procurementCaseRecordId),
        ),
      hasNextPage: hasNextPage(data.cashMovements),
      readError: false,
    };
  } catch (error) {
    const capabilityMissing =
      error instanceof Error &&
      /cannot query field|unknown field|cashmovements.*not found/i.test(
        error.message,
      );
    return {
      capabilityAvailable: false,
      records: [],
      hasNextPage: false,
      readError: !capabilityMissing,
    };
  }
};

export const loadCommandCentreOverview = async ({
  now = () => new Date(),
  limit = DEFAULT_QUERY_LIMIT,
  client = new CoreApiClient() as QueryClient,
  identityClient = new MetadataApiClient() as QueryClient,
}: {
  now?: () => Date;
  limit?: number;
  client?: QueryClient;
  identityClient?: QueryClient;
} = {}): Promise<CommandCentreOverviewResult> => {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_QUERY_LIMIT) {
    throw new RangeError(
      `Command Centre limit must be an integer from 1 to ${MAX_QUERY_LIMIT}.`,
    );
  }

  const identity = (await identityClient.query({
    currentUser: { workspaceMember: { id: true } },
  })) as IdentityQueryData;
  const currentUserRecordId = identity.currentUser?.workspaceMember?.id;
  if (currentUserRecordId === undefined)
    throw new CommandCentrePermissionError();

  const caseData = (await client.query({
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
          deliveryStatus: true,
          deliveryDueAt: true,
          supplierResponseDeadlineAt: true,
          updatedAt: true,
        },
      },
    },
  })) as OverviewQueryData;
  const cases = (caseData.procurementCases?.edges ?? []).map(({ node }) =>
    toCaseRecord(node),
  );
  const caseIds = cases.map(({ id }) => id);
  const caseIdSet = new Set(caseIds);
  const partialSources: CommandCentrePartialSource[] = [];
  if (hasNextPage(caseData.procurementCases)) partialSources.push('cases');

  let documents: readonly CommandCentreDocumentRecord[] = [];
  let expenses: readonly CommandCentreExpenseRecord[] = [];
  if (caseIds.length > 0) {
    const dependentData = (await client.query({
      commercialDocuments: {
        __args: {
          first: limit,
          filter: { procurementCaseRecordId: { in: caseIds } },
        },
        pageInfo: { hasNextPage: true },
        edges: {
          node: {
            id: true,
            name: true,
            procurementCaseRecordId: true,
            documentType: true,
            lifecycleStatus: true,
            complianceStatus: true,
            supplierRecordId: true,
            issueDate: true,
            currencyCode: true,
            totalAmount: { amountMicros: true, currencyCode: true },
            leadTimeDays: true,
            paymentTerms: true,
            validUntil: true,
            updatedAt: true,
          },
        },
      },
      expenses: {
        __args: {
          first: limit,
          filter: { procurementCaseRecordId: { in: caseIds } },
        },
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
    })) as OverviewQueryData;
    documents = (dependentData.commercialDocuments?.edges ?? [])
      .map(({ node }) => toDocumentRecord(node))
      .filter(({ procurementCaseRecordId }) =>
        caseIdSet.has(procurementCaseRecordId),
      );
    expenses = (dependentData.expenses?.edges ?? [])
      .map(({ node }) => toExpenseRecord(node))
      .filter(({ procurementCaseRecordId }) =>
        caseIdSet.has(procurementCaseRecordId),
      );
    if (hasNextPage(dependentData.commercialDocuments)) {
      partialSources.push('documents');
    }
    if (hasNextPage(dependentData.expenses)) partialSources.push('expenses');
  }

  const cash = await queryCashMovements({ client, caseIds, limit });
  if (cash.hasNextPage) partialSources.push('cash');
  if (cash.readError) partialSources.push('cash');

  const companyIds = [
    ...new Set(
      [
        ...cases.map(({ customerRecordId }) => customerRecordId),
        ...documents.map(({ supplierRecordId }) => supplierRecordId),
      ].filter((id): id is string => id !== null && id.trim() !== ''),
    ),
  ];
  let companies: readonly CommandCentreCompanyRecord[] = [];
  if (companyIds.length > 0) {
    try {
      const companyData = (await client.query({
        companies: {
          __args: { first: limit, filter: { id: { in: companyIds } } },
          pageInfo: { hasNextPage: true },
          edges: {
            node: {
              id: true,
              name: true,
              commercialRegistrationNumber: true,
              vatRegistrationNumber: true,
            },
          },
        },
      })) as OverviewQueryData;
      const companyIdSet = new Set(companyIds);
      companies = (companyData.companies?.edges ?? [])
        .map(({ node }) => toCompanyRecord(node))
        .filter(({ id }) => companyIdSet.has(id));
      if (hasNextPage(companyData.companies)) partialSources.push('companies');
    } catch {
      partialSources.push('companies');
    }
  }

  let approvals: readonly PashxApprovalQueueItem[] = [];
  let insights: readonly PashxEvidenceInsight[] = [];
  try {
    const evidenceData = (await client.query({
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
    })) as OverviewQueryData;
    const scopedRecordIds = new Set([
      ...caseIds,
      ...documents.map(({ id }) => id),
      ...expenses.map(({ id }) => id),
      ...cash.records.map(({ id }) => id),
    ]);
    const scopedApprovals = (evidenceData.approvalRequests?.edges ?? [])
      .map(({ node }) => toApproval(node))
      .filter(
        (approval): approval is PashxApprovalQueueItem =>
          approval !== null &&
          hasScopedSource(approval.sourceRecordIds, scopedRecordIds),
      );
    const scopedInsights = (evidenceData.operationalInsights?.edges ?? [])
      .map(({ node }) => toInsight(node))
      .filter(
        (insight): insight is PashxEvidenceInsight =>
          insight !== null &&
          hasScopedSource(insight.sourceRecordIds, scopedRecordIds),
      );
    if (
      [...scopedApprovals, ...scopedInsights].some((record) =>
        record.sourceRecordIds.some(
          (recordId) => !scopedRecordIds.has(recordId),
        ),
      )
    ) {
      partialSources.push('evidenceSourceLinks');
    }
    approvals = scopedApprovals.map((approval) => ({
      ...approval,
      sourceRecordIds: approval.sourceRecordIds.filter((recordId) =>
        scopedRecordIds.has(recordId),
      ),
    }));
    insights = scopedInsights.map((insight) => ({
      ...insight,
      sourceRecordIds: insight.sourceRecordIds.filter((recordId) =>
        scopedRecordIds.has(recordId),
      ),
    }));
    if (hasNextPage(evidenceData.approvalRequests)) {
      partialSources.push('approvals');
    }
    if (hasNextPage(evidenceData.operationalInsights)) {
      partialSources.push('insights');
    }
  } catch {
    partialSources.push('approvals', 'insights');
  }

  const asOf = now().toISOString();
  const commandItems = classifyCommandCentre({
    cases,
    documents,
    expenses,
    currentUserRecordId,
    observedAt: asOf,
  });

  return buildCommandCentreOverview({
    cases,
    documents,
    expenses,
    companies,
    cashMovements: cash.records,
    cashCapabilityAvailable: cash.capabilityAvailable,
    commandItems,
    approvals,
    insights,
    partialSources,
    asOf,
  });
};
