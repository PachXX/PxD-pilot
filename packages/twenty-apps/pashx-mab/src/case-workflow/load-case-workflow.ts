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
  CaseWorkflowCaseRecord,
  CaseWorkflowDocumentRecord,
  CaseWorkflowResult,
} from './case-workflow.types';

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
  deliveryStatus?: string | null;
  deliveryDueAt?: string | null;
  updatedAt: string;
}>;

type DocumentNode = Readonly<{
  id: string;
  name: string;
  procurementCaseRecordId: string;
  documentType?: string | null;
  lifecycleStatus?: string | null;
  supplierRecordId?: string | null;
  issueDate?: string | null;
  currencyCode?: string | null;
  totalAmount?: Readonly<{
    amountMicros?: number | null;
    currencyCode?: string | null;
  }> | null;
}>;

type CaseWorkflowQueryData = Readonly<{
  procurementCases?: QueryConnection<CaseNode>;
  commercialDocuments?: QueryConnection<DocumentNode>;
}>;

// Stored select values are UPPER_SNAKE. Contract vocabulary mixes spellings:
// stages are kebab-case ('customer-order') while delivery statuses and document
// types are camelCase ('notStarted', 'vendorQuote'), so each field maps through
// the matching normalizer.
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
  const normalized = value.toLowerCase().replace(/_([a-z])/g, (_match, letter: string) =>
    letter.toUpperCase(),
  );

  return allowedValues.find((allowed) => allowed === normalized) ?? null;
};

const toCaseRecord = (node: CaseNode): CaseWorkflowCaseRecord => ({
  id: node.id,
  name: node.name,
  stage: toKebabValue<PashxProcurementCaseStage>(
    node.stage,
    PASHX_PROCUREMENT_CASE_STAGES,
  ),
  deliveryStatus: toCamelCaseValue<PashxCaseDeliveryStatus>(
    node.deliveryStatus,
    PASHX_CASE_DELIVERY_STATUSES,
  ),
  deliveryDueAt: node.deliveryDueAt ?? null,
  updatedAt: node.updatedAt,
});

const toDocumentRecord = (node: DocumentNode): CaseWorkflowDocumentRecord => ({
  id: node.id,
  name: node.name,
  procurementCaseRecordId: node.procurementCaseRecordId,
  documentType: toCamelCaseValue<PashxCommercialDocumentType>(
    node.documentType,
    PASHX_COMMERCIAL_DOCUMENT_TYPES,
  ),
  lifecycleStatus: node.lifecycleStatus ?? null,
  supplierRecordId: node.supplierRecordId ?? null,
  issueDate: node.issueDate ?? null,
  // The CURRENCY composite carries the authoritative currency for the total.
  currencyCode: node.totalAmount?.currencyCode ?? node.currencyCode ?? null,
  totalAmountMicros: node.totalAmount?.amountMicros ?? null,
});

export const loadCaseWorkflow = async ({
  now = () => new Date(),
  limit = DEFAULT_QUERY_LIMIT,
  client = new CoreApiClient() as QueryClient,
}: {
  now?: () => Date;
  limit?: number;
  client?: QueryClient;
} = {}): Promise<CaseWorkflowResult> => {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_QUERY_LIMIT) {
    throw new RangeError(
      `Case workflow limit must be an integer from 1 to ${MAX_QUERY_LIMIT}.`,
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
          deliveryStatus: true,
          deliveryDueAt: true,
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
          supplierRecordId: true,
          issueDate: true,
          currencyCode: true,
          totalAmount: { amountMicros: true, currencyCode: true },
        },
      },
    },
  })) as CaseWorkflowQueryData;

  const asOf = now().toISOString();
  const isPartial = [data.procurementCases, data.commercialDocuments].some(
    (connection) => connection?.pageInfo?.hasNextPage === true,
  );

  return {
    cases: (data.procurementCases?.edges ?? []).map(({ node }) =>
      toCaseRecord(node),
    ),
    documents: (data.commercialDocuments?.edges ?? []).map(({ node }) =>
      toDocumentRecord(node),
    ),
    isPartial,
    asOf,
  };
};
