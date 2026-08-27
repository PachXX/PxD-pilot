import {
  PASHX_PROCUREMENT_CASE_STAGES,
  type PashxProcurementCaseStage,
} from 'pashx-mab-contract';
import { CoreApiClient } from 'twenty-client-sdk/core';

import type {
  RfqEligibleCase,
  VendorDirectoryCaseRecord,
  VendorDirectoryDocumentRecord,
  VendorDirectoryResult,
  VendorDirectoryRow,
  VendorDirectoryVendorRecord,
} from './vendor-directory.types';

const DEFAULT_QUERY_LIMIT = 200;
const MAX_QUERY_LIMIT = 500;

type QueryClient = Readonly<{
  query: (selection: Record<string, unknown>) => Promise<unknown>;
}>;

type QueryConnection<TNode> = Readonly<{
  edges?: readonly Readonly<{ node: TNode }>[];
  pageInfo?: Readonly<{ hasNextPage: boolean }>;
}>;

type CompanyNode = Readonly<{
  id: string;
  name: string;
  commercialRegistrationNumber?: string | null;
  vatRegistrationNumber?: string | null;
  mabBusinessRoles?: unknown;
}>;

type CaseNode = Readonly<{
  id: string;
  name: string;
  stage?: string | null;
  aggregateVersion: number;
}>;

type DocumentNode = Readonly<{
  id: string;
  name: string;
  procurementCaseRecordId: string;
  documentType?: string | null;
  lifecycleStatus?: string | null;
  supplierRecordId?: string | null;
}>;

type VendorDirectoryQueryData = Readonly<{
  companies?: QueryConnection<CompanyNode>;
  procurementCases?: QueryConnection<CaseNode>;
  commercialDocuments?: QueryConnection<DocumentNode>;
}>;

const toKebabValue = <T extends string>(
  value: string | null | undefined,
  allowedValues: readonly T[],
): T | null => {
  if (value === null || value === undefined) return null;
  const normalized = value.toLowerCase().replace(/_/g, '-');

  return allowedValues.find((allowed) => allowed === normalized) ?? null;
};

const hasSupplierRole = (value: unknown): boolean =>
  Array.isArray(value) && value.includes('SUPPLIER');

const toVendorRecord = (node: CompanyNode): VendorDirectoryVendorRecord => ({
  id: node.id,
  name: node.name,
  commercialRegistrationNumber: node.commercialRegistrationNumber ?? null,
  vatRegistrationNumber: node.vatRegistrationNumber ?? null,
});

const toCaseRecord = (node: CaseNode): VendorDirectoryCaseRecord => ({
  id: node.id,
  name: node.name,
  stage: toKebabValue<PashxProcurementCaseStage>(
    node.stage,
    PASHX_PROCUREMENT_CASE_STAGES,
  ),
  aggregateVersion: node.aggregateVersion,
});

const toDocumentRecord = (
  node: DocumentNode,
): VendorDirectoryDocumentRecord => ({
  id: node.id,
  name: node.name,
  procurementCaseRecordId: node.procurementCaseRecordId,
  documentType: node.documentType ?? null,
  lifecycleStatus: node.lifecycleStatus ?? null,
  supplierRecordId: node.supplierRecordId ?? null,
});

export const loadVendorDirectory = async ({
  now = () => new Date(),
  limit = DEFAULT_QUERY_LIMIT,
  client = new CoreApiClient() as QueryClient,
}: {
  now?: () => Date;
  limit?: number;
  client?: QueryClient;
} = {}): Promise<VendorDirectoryResult> => {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_QUERY_LIMIT) {
    throw new RangeError(
      `Vendor directory limit must be an integer from 1 to ${MAX_QUERY_LIMIT}.`,
    );
  }

  const data = (await client.query({
    companies: {
      __args: { first: limit },
      pageInfo: { hasNextPage: true },
      edges: {
        node: {
          id: true,
          name: true,
          commercialRegistrationNumber: true,
          vatRegistrationNumber: true,
          mabBusinessRoles: true,
        },
      },
    },
    procurementCases: {
      __args: { first: limit },
      pageInfo: { hasNextPage: true },
      edges: {
        node: {
          id: true,
          name: true,
          stage: true,
          aggregateVersion: true,
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
        },
      },
    },
  })) as VendorDirectoryQueryData;

  const asOf = now().toISOString();
  const isPartial = [data.companies, data.procurementCases, data.commercialDocuments].some(
    (connection) => connection?.pageInfo?.hasNextPage === true,
  );

  return {
    vendors: (data.companies?.edges ?? [])
      .map(({ node }) => node)
      .filter((node) => hasSupplierRole(node.mabBusinessRoles))
      .map(toVendorRecord),
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

// RFQ-eligible cases are exactly the intake/sourcing cases that carry a client RFQ — the client
// requirement a supplier RFQ request must answer.
export const buildRfqEligibleCases = (
  cases: readonly VendorDirectoryCaseRecord[],
  documents: readonly VendorDirectoryDocumentRecord[],
): readonly RfqEligibleCase[] => {
  const caseIdsWithClientRfq = new Set(
    documents
      .filter(
        (document) =>
          document.documentType === 'CUSTOMER_RFQ' &&
          document.procurementCaseRecordId !== '',
      )
      .map((document) => document.procurementCaseRecordId),
  );

  return cases
    .filter(
      (caseRecord) =>
        (caseRecord.stage === 'intake' || caseRecord.stage === 'sourcing') &&
        caseIdsWithClientRfq.has(caseRecord.id),
    )
    .map((caseRecord) => ({
      id: caseRecord.id,
      name: caseRecord.name,
      stage: caseRecord.stage as PashxProcurementCaseStage,
      aggregateVersion: caseRecord.aggregateVersion,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
};

export const buildVendorDirectoryRows = (
  result: VendorDirectoryResult,
): readonly VendorDirectoryRow[] =>
  result.vendors.map((vendor) => {
    const supplierRfqs = result.documents.filter(
      (document) =>
        document.supplierRecordId === vendor.id &&
        document.documentType === 'SUPPLIER_RFQ',
    );
    const vendorQuotes = result.documents.filter(
      (document) =>
        document.supplierRecordId === vendor.id &&
        document.documentType === 'VENDOR_QUOTE',
    );
    const activeCaseIds = new Set(
      supplierRfqs
        .filter((document) => document.lifecycleStatus === 'DRAFT')
        .map((document) => document.procurementCaseRecordId),
    );

    return {
      vendor,
      openSupplierRfqCount: supplierRfqs.filter(
        (document) => document.lifecycleStatus === 'DRAFT',
      ).length,
      finalizedSupplierRfqCount: supplierRfqs.filter(
        (document) => document.lifecycleStatus === 'FINALIZED',
      ).length,
      vendorQuoteCount: vendorQuotes.length,
      activeCaseNames: result.cases
        .filter((caseRecord) => activeCaseIds.has(caseRecord.id))
        .map((caseRecord) => caseRecord.name)
        .sort((left, right) => left.localeCompare(right)),
    };
  });

export const getCompanyRecordHref = (companyRecordId: string): string =>
  `/object/company/${companyRecordId}`;

export const getCaseRecordHref = (caseRecordId: string): string =>
  `/object/procurementCase/${caseRecordId}`;
