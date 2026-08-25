import {
  PASHX_COMMERCIAL_DOCUMENT_TYPES,
  PASHX_PROCUREMENT_CASE_STAGES,
  type PashxCommercialDocumentType,
  type PashxProcurementCaseStage,
} from 'pashx-mab-contract';
import { CoreApiClient } from 'twenty-client-sdk/core';

import type {
  VendorComparisonCaseRecord,
  VendorComparisonCompanyRecord,
  VendorComparisonDocumentRecord,
  VendorComparisonResult,
} from './vendor-comparison.types';

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
  nextActionCode?: string | null;
  actionDueAt?: string | null;
  supplierResponseDeadlineAt?: string | null;
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
  leadTimeDays?: number | null;
  paymentTerms?: string | null;
  validUntil?: string | null;
}>;

type CompanyNode = Readonly<{
  id: string;
  name: string;
  commercialRegistrationNumber?: string | null;
  vatRegistrationNumber?: string | null;
}>;

type VendorComparisonQueryData = Readonly<{
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

const toCaseRecord = (node: CaseNode): VendorComparisonCaseRecord => ({
  id: node.id,
  name: node.name,
  stage: toKebabValue<PashxProcurementCaseStage>(
    node.stage,
    PASHX_PROCUREMENT_CASE_STAGES,
  ),
  customerRecordId: node.customerRecordId ?? null,
  nextActionCode: node.nextActionCode ?? null,
  actionDueAt: node.actionDueAt ?? null,
  supplierResponseDeadlineAt: node.supplierResponseDeadlineAt ?? null,
});

const toDocumentRecord = (
  node: DocumentNode,
): VendorComparisonDocumentRecord => ({
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
  currencyCode: node.totalAmount?.currencyCode ?? node.currencyCode ?? null,
  totalAmountMicros: node.totalAmount?.amountMicros ?? null,
  leadTimeDays: node.leadTimeDays ?? null,
  paymentTerms: node.paymentTerms ?? null,
  validUntil: node.validUntil ?? null,
});

const toCompanyRecord = (node: CompanyNode): VendorComparisonCompanyRecord => ({
  id: node.id,
  name: node.name,
  commercialRegistrationNumber: node.commercialRegistrationNumber ?? null,
  vatRegistrationNumber: node.vatRegistrationNumber ?? null,
});

const isNonEmptyId = (value: string | null): value is string =>
  value !== null && value.trim() !== '';

// The read-model answers one case and never joins across cases or workspaces.
// Phase 1 reads the case by id eq and phase 2 reads only its commercial
// documents by procurementCaseRecordId eq, both server-side. Phase 3 resolves
// the supplier and customer identities derived from those two phases by id IN,
// so the UI never fabricates a company from an unrelated record.
export const loadVendorComparison = async ({
  caseId,
  now = () => new Date(),
  limit = DEFAULT_QUERY_LIMIT,
  client = new CoreApiClient() as QueryClient,
}: {
  caseId: string;
  now?: () => Date;
  limit?: number;
  client?: QueryClient;
}): Promise<VendorComparisonResult> => {
  if (caseId.trim() === '') {
    throw new RangeError('Vendor comparison requires a non-empty case id.');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_QUERY_LIMIT) {
    throw new RangeError(
      `Vendor comparison limit must be an integer from 1 to ${MAX_QUERY_LIMIT}.`,
    );
  }

  const data = (await client.query({
    procurementCases: {
      __args: { first: 1, filter: { id: { eq: caseId } } },
      pageInfo: { hasNextPage: true },
      edges: {
        node: {
          id: true,
          name: true,
          stage: true,
          customerRecordId: true,
          nextActionCode: true,
          actionDueAt: true,
          supplierResponseDeadlineAt: true,
        },
      },
    },
    commercialDocuments: {
      __args: { first: limit, filter: { procurementCaseRecordId: { eq: caseId } } },
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
          leadTimeDays: true,
          paymentTerms: true,
          validUntil: true,
        },
      },
    },
  })) as VendorComparisonQueryData;

  const caseRecord =
    data.procurementCases?.edges?.[0]?.node !== undefined
      ? toCaseRecord(data.procurementCases.edges[0].node)
      : null;
  // Defensive re-scope: even if the server filter is not honored, a document
  // from another case must never enter this case's comparison.
  const documents = (data.commercialDocuments?.edges ?? [])
    .map(({ node }) => toDocumentRecord(node))
    .filter((document) => document.procurementCaseRecordId === caseId);

  const companyIds = [
    ...documents.map((document) => document.supplierRecordId),
    caseRecord?.customerRecordId ?? null,
  ].filter(isNonEmptyId);
  const uniqueCompanyIds = [...new Set(companyIds)];

  let companies: readonly VendorComparisonCompanyRecord[] = [];
  let companiesHasNextPage = false;
  if (uniqueCompanyIds.length > 0) {
    const companyData = (await client.query({
      companies: {
        __args: { first: limit, filter: { id: { in: uniqueCompanyIds } } },
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
    })) as VendorComparisonQueryData;
    companies = (companyData.companies?.edges ?? []).map(({ node }) =>
      toCompanyRecord(node),
    );
    companiesHasNextPage = companyData.companies?.pageInfo?.hasNextPage === true;
  }

  const isPartial =
    data.commercialDocuments?.pageInfo?.hasNextPage === true ||
    companiesHasNextPage;

  return {
    case: caseRecord,
    documents,
    companies,
    isPartial,
    asOf: now().toISOString(),
  };
};
