import {
  PASHX_APPROVAL_STATUSES,
  PASHX_COMMERCIAL_DOCUMENT_TYPES,
  PASHX_PROCUREMENT_CASE_STAGES,
  PASHX_PURCHASE_ORDER_APPROVAL_ACTION_CODE,
  type PashxApprovalStatus,
  type PashxCommercialDocumentType,
  type PashxProcurementCaseStage,
} from 'pashx-mab-contract';
import { CoreApiClient } from 'twenty-client-sdk/core';

import type {
  VendorPurchaseOrderApprovalRecord,
  VendorPurchaseOrderCaseRecord,
  VendorPurchaseOrderCashMovementRecord,
  VendorPurchaseOrderCompanyRecord,
  VendorPurchaseOrderDocumentRecord,
  VendorPurchaseOrderLineRecord,
  VendorPurchaseOrderResult,
} from './vendor-purchase-order.types';

const DEFAULT_QUERY_LIMIT = 200;
const MAX_QUERY_LIMIT = 500;

type QueryClient = Readonly<{
  query: (selection: Record<string, unknown>) => Promise<unknown>;
}>;

type QueryConnection<TNode> = Readonly<{
  edges?: readonly Readonly<{ node: TNode }>[];
  pageInfo?: Readonly<{ hasNextPage: boolean }>;
}>;

type DocumentNode = Readonly<{
  id: string;
  name: string;
  documentType?: string | null;
  lifecycleStatus?: string | null;
  aggregateVersion?: number | null;
  procurementCaseRecordId?: string | null;
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

type CaseNode = Readonly<{
  id: string;
  name: string;
  projectName?: string | null;
  ownerRecordId?: string | null;
  stage?: string | null;
  requiredBy?: string | null;
}>;

type CompanyNode = Readonly<{
  id: string;
  name: string;
  commercialRegistrationNumber?: string | null;
  vatRegistrationNumber?: string | null;
}>;

type LineNode = Readonly<{
  id: string;
  name: string;
  commercialDocumentRecordId: string;
  linePosition?: number | null;
  description?: string | null;
  specification?: string | null;
  quantity?: number | null;
  unit?: string | null;
  unitPriceMicros?: number | null;
  lineTotalMicros?: number | null;
  currencyCode?: string | null;
  sourceFileReference?: string | null;
}>;

type ApprovalNode = Readonly<{
  id: string;
  status?: string | null;
  requestedActionCode?: string | null;
  requesterRecordId?: string | null;
  approverRecordId?: string | null;
  requestedAt?: string | null;
  decidedAt?: string | null;
  decisionNote?: string | null;
  payloadDigest?: string | null;
  sourceRecordIds?: unknown;
}>;

type CashMovementNode = Readonly<{
  id: string;
  direction?: string | null;
  verificationStatus?: string | null;
  amount?: Readonly<{
    amountMicros?: number | null;
    currencyCode?: string | null;
  }> | null;
  movementDate?: string | null;
  sourceDocumentRecordId?: string | null;
  evidenceReference?: string | null;
}>;

type WorkspaceMemberNode = Readonly<{
  id: string;
  name?: Readonly<{
    firstName?: string | null;
    lastName?: string | null;
  }> | null;
}>;

type VendorPurchaseOrderQueryData = Readonly<{
  commercialDocuments?: QueryConnection<DocumentNode>;
  documentLines?: QueryConnection<LineNode>;
  approvalRequests?: QueryConnection<ApprovalNode>;
  cashMovements?: QueryConnection<CashMovementNode>;
  procurementCases?: QueryConnection<CaseNode>;
  companies?: QueryConnection<CompanyNode>;
  workspaceMembers?: QueryConnection<WorkspaceMemberNode>;
}>;

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

const toKebabValue = <T extends string>(
  value: string | null | undefined,
  allowedValues: readonly T[],
): T | null => {
  if (value === null || value === undefined) return null;
  const normalized = value.toLowerCase().replace(/_/g, '-');

  return allowedValues.find((allowed) => allowed === normalized) ?? null;
};

const toUppercaseValue = <T extends string>(
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

const toDocumentRecord = (node: DocumentNode): VendorPurchaseOrderDocumentRecord => ({
  id: node.id,
  name: node.name,
  documentType: toCamelCaseValue<PashxCommercialDocumentType>(
    node.documentType,
    PASHX_COMMERCIAL_DOCUMENT_TYPES,
  ),
  lifecycleStatus: node.lifecycleStatus ?? null,
  aggregateVersion: node.aggregateVersion ?? null,
  procurementCaseRecordId: node.procurementCaseRecordId ?? null,
  supplierRecordId: node.supplierRecordId ?? null,
  issueDate: node.issueDate ?? null,
  currencyCode: node.totalAmount?.currencyCode ?? node.currencyCode ?? null,
  totalAmountMicros: node.totalAmount?.amountMicros ?? null,
  leadTimeDays: node.leadTimeDays ?? null,
  paymentTerms: node.paymentTerms ?? null,
  validUntil: node.validUntil ?? null,
});

const toCaseRecord = (node: CaseNode): VendorPurchaseOrderCaseRecord => ({
  id: node.id,
  name: node.name,
  projectName: node.projectName ?? null,
  ownerRecordId: node.ownerRecordId ?? null,
  stage: toKebabValue<PashxProcurementCaseStage>(
    node.stage,
    PASHX_PROCUREMENT_CASE_STAGES,
  ),
  requiredBy: node.requiredBy ?? null,
});

const toCompanyRecord = (node: CompanyNode): VendorPurchaseOrderCompanyRecord => ({
  id: node.id,
  name: node.name,
  commercialRegistrationNumber: node.commercialRegistrationNumber ?? null,
  vatRegistrationNumber: node.vatRegistrationNumber ?? null,
});

const toLineRecord = (node: LineNode): VendorPurchaseOrderLineRecord => ({
  id: node.id,
  name: node.name,
  commercialDocumentRecordId: node.commercialDocumentRecordId,
  linePosition: node.linePosition ?? null,
  description: node.description ?? null,
  specification: node.specification ?? null,
  quantity: node.quantity ?? null,
  unit: node.unit ?? null,
  unitPriceMicros: node.unitPriceMicros ?? null,
  lineTotalMicros: node.lineTotalMicros ?? null,
  currencyCode: node.currencyCode ?? null,
  sourceFileReference: node.sourceFileReference ?? null,
});

const toApprovalRecord = (
  node: ApprovalNode,
): VendorPurchaseOrderApprovalRecord => ({
  id: node.id,
  status: toUppercaseValue<PashxApprovalStatus>(
    node.status,
    PASHX_APPROVAL_STATUSES,
  ),
  requestedActionCode: node.requestedActionCode ?? null,
  requesterRecordId: node.requesterRecordId ?? null,
  approverRecordId: node.approverRecordId ?? null,
  requestedAt: node.requestedAt ?? null,
  decidedAt: node.decidedAt ?? null,
  decisionNote: node.decisionNote ?? null,
  payloadDigest: node.payloadDigest ?? null,
  sourceRecordIds: toSourceRecordIds(node.sourceRecordIds),
});

const toCashMovementRecord = (
  node: CashMovementNode,
): VendorPurchaseOrderCashMovementRecord => ({
  id: node.id,
  direction: node.direction ?? null,
  verificationStatus: node.verificationStatus ?? null,
  amountMicros: node.amount?.amountMicros ?? null,
  currencyCode: node.amount?.currencyCode ?? null,
  movementDate: node.movementDate ?? null,
  sourceDocumentRecordId: node.sourceDocumentRecordId ?? null,
  evidenceReference: node.evidenceReference ?? null,
});

const toOwnerName = (node: WorkspaceMemberNode): string => {
  const { firstName, lastName } = node.name ?? {};
  return [firstName, lastName].filter((part) => part !== null && part !== undefined && part.trim() !== '').join(' ');
};

const isNonEmptyId = (value: string | null): value is string =>
  value !== null && value.trim() !== '';

export const loadVendorPurchaseOrder = async ({
  poRecordId,
  now = () => new Date(),
  limit = DEFAULT_QUERY_LIMIT,
  client = new CoreApiClient() as QueryClient,
}: {
  poRecordId: string;
  now?: () => Date;
  limit?: number;
  client?: QueryClient;
}): Promise<VendorPurchaseOrderResult> => {
  if (poRecordId.trim() === '') {
    throw new RangeError('Vendor purchase order requires a non-empty record id.');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_QUERY_LIMIT) {
    throw new RangeError(
      `Vendor purchase order limit must be an integer from 1 to ${MAX_QUERY_LIMIT}.`,
    );
  }

  const data = (await client.query({
    commercialDocuments: {
      __args: { first: 1, filter: { id: { eq: poRecordId } } },
      pageInfo: { hasNextPage: true },
      edges: {
        node: {
          id: true,
          name: true,
          documentType: true,
          lifecycleStatus: true,
          aggregateVersion: true,
          procurementCaseRecordId: true,
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
    documentLines: {
      __args: { first: limit, filter: { commercialDocumentRecordId: { eq: poRecordId } } },
      pageInfo: { hasNextPage: true },
      edges: {
        node: {
          id: true,
          name: true,
          commercialDocumentRecordId: true,
          linePosition: true,
          description: true,
          specification: true,
          quantity: true,
          unit: true,
          unitPriceMicros: true,
          lineTotalMicros: true,
          currencyCode: true,
          sourceFileReference: true,
        },
      },
    },
    approvalRequests: {
      __args: {
        first: limit,
        filter: { requestedActionCode: { eq: PASHX_PURCHASE_ORDER_APPROVAL_ACTION_CODE } },
      },
      pageInfo: { hasNextPage: true },
      edges: {
        node: {
          id: true,
          status: true,
          requestedActionCode: true,
          requesterRecordId: true,
          approverRecordId: true,
          requestedAt: true,
          decidedAt: true,
          decisionNote: true,
          payloadDigest: true,
          sourceRecordIds: true,
        },
      },
    },
    cashMovements: {
      __args: { first: limit, filter: { sourceDocumentRecordId: { eq: poRecordId } } },
      pageInfo: { hasNextPage: true },
      edges: {
        node: {
          id: true,
          direction: true,
          verificationStatus: true,
          amount: { amountMicros: true, currencyCode: true },
          movementDate: true,
          sourceDocumentRecordId: true,
          evidenceReference: true,
        },
      },
    },
  })) as VendorPurchaseOrderQueryData;

  const document =
    data.commercialDocuments?.edges?.[0]?.node !== undefined
      ? toDocumentRecord(data.commercialDocuments.edges[0].node)
      : null;

  const lines = (data.documentLines?.edges ?? [])
    .map(({ node }) => toLineRecord(node))
    .filter((line) => line.commercialDocumentRecordId === poRecordId);

  const approvals = (data.approvalRequests?.edges ?? []).map(({ node }) =>
    toApprovalRecord(node),
  );
  const cashMovements = (data.cashMovements?.edges ?? []).map(({ node }) =>
    toCashMovementRecord(node),
  );

  const caseId = document?.procurementCaseRecordId ?? null;
  const supplierId = document?.supplierRecordId ?? null;

  let caseRecord: VendorPurchaseOrderCaseRecord | null = null;
  let supplier: VendorPurchaseOrderCompanyRecord | null = null;
  let caseDocuments: readonly VendorPurchaseOrderDocumentRecord[] = [];
  let ownerName: string | null = null;

  if (caseId !== null || supplierId !== null) {
    const related = (await client.query({
      procurementCases: {
        __args: { first: 1, filter: { id: { eq: caseId ?? '' } } },
        pageInfo: { hasNextPage: true },
        edges: {
          node: {
            id: true,
            name: true,
            projectName: true,
            ownerRecordId: true,
            stage: true,
            requiredBy: true,
          },
        },
      },
      companies: {
        __args: { first: 1, filter: { id: { eq: supplierId ?? '' } } },
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
      commercialDocuments: {
        __args: {
          first: limit,
          filter: { procurementCaseRecordId: { eq: caseId ?? '' } },
        },
        pageInfo: { hasNextPage: true },
        edges: {
          node: {
            id: true,
            name: true,
            documentType: true,
            lifecycleStatus: true,
            aggregateVersion: true,
            procurementCaseRecordId: true,
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
    })) as VendorPurchaseOrderQueryData;

    caseRecord =
      related.procurementCases?.edges?.[0]?.node !== undefined
        ? toCaseRecord(related.procurementCases.edges[0].node)
        : null;
    supplier =
      related.companies?.edges?.[0]?.node !== undefined
        ? toCompanyRecord(related.companies.edges[0].node)
        : null;
    caseDocuments = (related.commercialDocuments?.edges ?? [])
      .map(({ node }) => toDocumentRecord(node))
      .filter(
        (caseDocument) =>
          isNonEmptyId(caseId) &&
          caseDocument.procurementCaseRecordId === caseId,
      );

    const ownerRecordId = caseRecord?.ownerRecordId ?? null;
    if (isNonEmptyId(ownerRecordId)) {
      const members = (await client.query({
        workspaceMembers: {
          __args: { first: 1, filter: { id: { eq: ownerRecordId } } },
          pageInfo: { hasNextPage: true },
          edges: { node: { id: true, name: { firstName: true, lastName: true } } },
        },
      })) as VendorPurchaseOrderQueryData;
      const member = members.workspaceMembers?.edges?.[0]?.node;
      ownerName = member !== undefined ? toOwnerName(member) : null;
    }
  }

  const isPartial = [
    data.commercialDocuments,
    data.documentLines,
    data.approvalRequests,
    data.cashMovements,
  ].some((connection) => connection?.pageInfo?.hasNextPage === true);

  return {
    document,
    case: caseRecord,
    supplier,
    ownerName,
    lines,
    approvals,
    cashMovements,
    caseDocuments,
    isPartial,
    asOf: now().toISOString(),
  };
};
