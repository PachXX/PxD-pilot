import {
  PASHX_CASE_DELIVERY_STATUSES,
  PASHX_COMMERCIAL_DOCUMENT_TYPES,
  PASHX_PROCUREMENT_CASE_STAGES,
  type PashxCaseDeliveryStatus,
  type PashxCommercialDocumentType,
  type PashxProcurementCaseStage,
} from 'pashx-mab-contract';
import { CoreApiClient } from 'twenty-client-sdk/core';

import type {
  WorkflowPipelineCaseRecord,
  WorkflowPipelineCompanyRecord,
  WorkflowPipelineDocumentRecord,
  WorkflowPipelineResult,
} from './workflow-pipeline.types';

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
  stage?: string | null;
  customerRecordId?: string | null;
  projectName?: string | null;
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
  issueDate?: string | null;
  currencyCode?: string | null;
  totalAmount?: Readonly<{
    amountMicros?: number | null;
    currencyCode?: string | null;
  }> | null;
}>;

type CompanyNode = Readonly<{ id: string; name: string }>;

type WorkflowPipelineQueryData = Readonly<{
  procurementCases?: QueryConnection<CaseNode>;
  commercialDocuments?: QueryConnection<DocumentNode>;
  companies?: QueryConnection<CompanyNode>;
}>;

const toKebabValue = <T extends string>(
  value: string | null | undefined,
  allowedValues: readonly T[],
): T | null => {
  if (value === null || value === undefined) return null;
  const normalized = value.toLowerCase().replace(/_/g, '-');
  return allowedValues.find((allowed) => allowed === normalized) ?? null;
};

const toCamelCaseValue = <T extends string>(
  value: string | null | undefined,
  allowedValues: readonly T[],
): T | null => {
  if (value === null || value === undefined) return null;
  const normalized = value
    .toLowerCase()
    .replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
  return allowedValues.find((allowed) => allowed === normalized) ?? null;
};

const toCaseRecord = (node: CaseNode): WorkflowPipelineCaseRecord => ({
  id: node.id,
  name: node.name,
  stage: toKebabValue<PashxProcurementCaseStage>(
    node.stage,
    PASHX_PROCUREMENT_CASE_STAGES,
  ),
  customerRecordId: node.customerRecordId ?? null,
  projectName: node.projectName ?? null,
  nextActionCode: node.nextActionCode ?? null,
  actionDueAt: node.actionDueAt ?? null,
  blockedReasonCode: node.blockedReasonCode ?? null,
  deliveryStatus: toCamelCaseValue<PashxCaseDeliveryStatus>(
    node.deliveryStatus,
    PASHX_CASE_DELIVERY_STATUSES,
  ),
  deliveryDueAt: node.deliveryDueAt ?? null,
  supplierResponseDeadlineAt: node.supplierResponseDeadlineAt ?? null,
  updatedAt: node.updatedAt,
});

const toDocumentRecord = (
  node: DocumentNode,
): WorkflowPipelineDocumentRecord => ({
  id: node.id,
  name: node.name,
  procurementCaseRecordId: node.procurementCaseRecordId,
  documentType: toCamelCaseValue<PashxCommercialDocumentType>(
    node.documentType,
    PASHX_COMMERCIAL_DOCUMENT_TYPES,
  ),
  lifecycleStatus: node.lifecycleStatus ?? null,
  complianceStatus: node.complianceStatus ?? null,
  issueDate: node.issueDate ?? null,
  currencyCode: node.totalAmount?.currencyCode ?? node.currencyCode ?? null,
  totalAmountMicros: node.totalAmount?.amountMicros ?? null,
});

const toCompanyRecord = (node: CompanyNode): WorkflowPipelineCompanyRecord => ({
  id: node.id,
  name: node.name,
});

export const loadWorkflowPipeline = async ({
  now = () => new Date(),
  limit = DEFAULT_QUERY_LIMIT,
  client = new CoreApiClient() as QueryClient,
}: {
  now?: () => Date;
  limit?: number;
  client?: QueryClient;
} = {}): Promise<WorkflowPipelineResult> => {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_QUERY_LIMIT) {
    throw new RangeError(
      `Workflow pipeline limit must be an integer from 1 to ${MAX_QUERY_LIMIT}.`,
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
          stage: true,
          customerRecordId: true,
          projectName: true,
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
    commercialDocuments: {
      __args: { first: limit },
      pageInfo: { hasNextPage: true },
      edges: {
        node: {
          id: true,
          name: true,
          procurementCaseRecordId: true,
          documentType: true,
          lifecycleStatus: true,
          complianceStatus: true,
          issueDate: true,
          currencyCode: true,
          totalAmount: { amountMicros: true, currencyCode: true },
        },
      },
    },
  })) as WorkflowPipelineQueryData;

  const cases = (data.procurementCases?.edges ?? []).map(({ node }) =>
    toCaseRecord(node),
  );
  const caseIds = new Set(cases.map((caseRecord) => caseRecord.id));
  const documents = (data.commercialDocuments?.edges ?? [])
    .map(({ node }) => toDocumentRecord(node))
    .filter((document) => caseIds.has(document.procurementCaseRecordId));
  const customerIds = [
    ...new Set(
      cases
        .map((caseRecord) => caseRecord.customerRecordId)
        .filter((id): id is string => id !== null && id.trim() !== ''),
    ),
  ];

  let companies: readonly WorkflowPipelineCompanyRecord[] = [];
  let companiesHasNextPage = false;
  if (customerIds.length > 0) {
    const companyData = (await client.query({
      companies: {
        __args: { first: limit, filter: { id: { in: customerIds } } },
        pageInfo: { hasNextPage: true },
        edges: { node: { id: true, name: true } },
      },
    })) as WorkflowPipelineQueryData;
    companies = (companyData.companies?.edges ?? []).map(({ node }) =>
      toCompanyRecord(node),
    );
    companiesHasNextPage = companyData.companies?.pageInfo?.hasNextPage === true;
  }

  return {
    cases,
    documents,
    companies,
    isPartial:
      data.procurementCases?.pageInfo?.hasNextPage === true ||
      data.commercialDocuments?.pageInfo?.hasNextPage === true ||
      companiesHasNextPage,
    asOf: now().toISOString(),
  };
};
