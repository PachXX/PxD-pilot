import { CoreApiClient } from 'twenty-client-sdk/core';

import { aggregateOperationalProfitability } from './aggregate-operational-profitability';
import { aggregateVerifiedCashFlow } from './aggregate-verified-cash-flow';
import {
  type CashMovementDirection,
  type CashMovementRecord,
  type CashMovementVerificationStatus,
  type OperationalProfitabilityResult,
  type ProfitabilityCaseDimension,
  type ProfitabilityComplianceStatus,
  type ProfitabilityExpenseApprovalStatus,
  type ProfitabilityFilters,
  type ProfitabilityLifecycleStatus,
  type ProfitabilitySourceRecord,
} from './operational-profitability.types';

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
}>;

type CompanyNode = Readonly<{
  id: string;
  name: string;
  customerId?: string | null;
  vendorId?: string | null;
  commercialRegistrationNumber?: string | null;
}>;

type CommercialDocumentNode = Readonly<{
  id: string;
  name: string;
  documentType: string;
  lifecycleStatus: ProfitabilityLifecycleStatus;
  complianceStatus: ProfitabilityComplianceStatus;
  procurementCaseRecordId: string;
  issueDate: string | null;
  totalAmount?: CurrencyValue | null;
  supplierRecordId?: string | null;
}>;

type ExpenseNode = Readonly<{
  id: string;
  name: string;
  approvalStatus: ProfitabilityExpenseApprovalStatus;
  procurementCaseRecordId: string;
  incurredDate: string | null;
  amount?: CurrencyValue | null;
}>;

type CashMovementNode = Readonly<{
  id: string;
  name: string;
  direction: CashMovementDirection;
  verificationStatus: CashMovementVerificationStatus;
  procurementCaseRecordId: string;
  sourceDocumentRecordId?: string | null;
  movementDate: string | null;
  amount?: CurrencyValue | null;
  bankReference?: string | null;
  evidenceReference?: string | null;
}>;

type QueryConnection<TNode> = Readonly<{
  edges?: readonly Readonly<{ node: TNode }>[];
  pageInfo?: Readonly<{ hasNextPage: boolean }>;
}>;

type ProfitabilityQueryData = Readonly<{
  procurementCases?: QueryConnection<CaseNode>;
  commercialDocuments?: QueryConnection<CommercialDocumentNode>;
  expenses?: QueryConnection<ExpenseNode>;
  cashMovements?: QueryConnection<CashMovementNode>;
  companies?: QueryConnection<CompanyNode>;
}>;

const toCaseDimension = (
  node: CaseNode,
  vendorRecordIds: readonly string[],
): ProfitabilityCaseDimension => ({
  caseRecordId: node.id,
  caseName: node.name,
  customerRecordId: node.customerRecordId ?? null,
  projectName: node.projectName ?? null,
  ownerRecordId: node.ownerRecordId ?? null,
  vendorRecordIds,
});

export const loadOperationalProfitability = async ({
  filters,
  now = () => new Date(),
}: {
  filters: ProfitabilityFilters;
  now?: () => Date;
}): Promise<OperationalProfitabilityResult> => {
  const data = (await new CoreApiClient().query({
    procurementCases: {
      __args: { first: 1000 },
      pageInfo: { hasNextPage: true },
      edges: {
        node: {
          id: true,
          name: true,
          customerRecordId: true,
          projectName: true,
          ownerRecordId: true,
        },
      },
    },
    commercialDocuments: {
      __args: { first: 1000 },
      pageInfo: { hasNextPage: true },
      edges: {
        node: {
          id: true,
          name: true,
          documentType: true,
          lifecycleStatus: true,
          complianceStatus: true,
          procurementCaseRecordId: true,
          issueDate: true,
          totalAmount: { amountMicros: true, currencyCode: true },
          supplierRecordId: true,
        },
      },
    },
    expenses: {
      __args: { first: 1000 },
      pageInfo: { hasNextPage: true },
      edges: {
        node: {
          id: true,
          name: true,
          approvalStatus: true,
          procurementCaseRecordId: true,
          incurredDate: true,
          amount: { amountMicros: true, currencyCode: true },
        },
      },
    },
    cashMovements: {
      __args: { first: 1000 },
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
    companies: {
      __args: { first: 1000 },
      pageInfo: { hasNextPage: true },
      edges: {
        node: {
          id: true,
          name: true,
          customerId: true,
          vendorId: true,
          commercialRegistrationNumber: true,
        },
      },
    },
  })) as ProfitabilityQueryData;

  if (
    data.procurementCases?.pageInfo?.hasNextPage === true ||
    data.commercialDocuments?.pageInfo?.hasNextPage === true ||
    data.expenses?.pageInfo?.hasNextPage === true ||
    data.cashMovements?.pageInfo?.hasNextPage === true ||
    data.companies?.pageInfo?.hasNextPage === true
  ) {
    throw new Error(
      'Operational profitability exceeded the bounded 1,000-record query limit.',
    );
  }

  const documentNodes = (data.commercialDocuments?.edges ?? []).map(
    ({ node }) => node,
  );
  const vendorIdsByCase = new Map<string, Set<string>>();

  for (const document of documentNodes) {
    if (
      document.documentType !== 'VENDOR_PURCHASE_ORDER' ||
      document.lifecycleStatus !== 'FINALIZED' ||
      document.supplierRecordId === null ||
      document.supplierRecordId === undefined
    ) {
      continue;
    }

    const vendorIds =
      vendorIdsByCase.get(document.procurementCaseRecordId) ?? new Set<string>();
    vendorIds.add(document.supplierRecordId);
    vendorIdsByCase.set(document.procurementCaseRecordId, vendorIds);
  }

  const caseDimensions = new Map(
    (data.procurementCases?.edges ?? []).map(({ node }) => [
      node.id,
      toCaseDimension(node, [...(vendorIdsByCase.get(node.id) ?? [])].sort()),
    ]),
  );
  const documentRecords: ProfitabilitySourceRecord[] = documentNodes.map((node) => ({
    sourceType: 'DOCUMENT',
    recordId: node.id,
    recordName: node.name,
    documentType: node.documentType,
    lifecycleStatus: node.lifecycleStatus,
    complianceStatus: node.complianceStatus,
    occurredOn: node.issueDate,
    amountMicros: node.totalAmount?.amountMicros ?? null,
    currencyCode: node.totalAmount?.currencyCode ?? null,
    caseDimension: caseDimensions.get(node.procurementCaseRecordId) ?? null,
  }));
  const expenseRecords: ProfitabilitySourceRecord[] = (
    data.expenses?.edges ?? []
  ).map(({ node }) => ({
    sourceType: 'EXPENSE',
    recordId: node.id,
    recordName: node.name,
    approvalStatus: node.approvalStatus,
    occurredOn: node.incurredDate,
    amountMicros: node.amount?.amountMicros ?? null,
    currencyCode: node.amount?.currencyCode ?? null,
    caseDimension: caseDimensions.get(node.procurementCaseRecordId) ?? null,
  }));

  const cashMovementRecords: CashMovementRecord[] = (
    data.cashMovements?.edges ?? []
  ).map(({ node }) => ({
    recordId: node.id,
    recordName: node.name,
    direction: node.direction,
    verificationStatus: node.verificationStatus,
    occurredOn: node.movementDate,
    amountMicros: node.amount?.amountMicros ?? null,
    currencyCode: node.amount?.currencyCode ?? null,
    sourceDocumentRecordId: node.sourceDocumentRecordId ?? null,
    bankReference: node.bankReference ?? null,
    evidenceReference: node.evidenceReference ?? null,
    caseDimension: caseDimensions.get(node.procurementCaseRecordId) ?? null,
  }));

  const profitability = aggregateOperationalProfitability({
    records: [...documentRecords, ...expenseRecords],
    filters,
    asOf: now().toISOString(),
  });

  const companiesById = new Map(
    (data.companies?.edges ?? []).map(({ node }) => [node.id, node]),
  );
  const purchaseOrdersByEntity = (
    documentType: 'CUSTOMER_PURCHASE_ORDER' | 'VENDOR_PURCHASE_ORDER',
    getEntityId: (document: CommercialDocumentNode) => string | null,
  ) => {
    const references = new Map<string, Set<string>>();
    for (const document of documentNodes) {
      if (
        document.documentType !== documentType ||
        document.lifecycleStatus !== 'FINALIZED'
      ) {
        continue;
      }
      const entityId = getEntityId(document);
      if (entityId === null) continue;
      const values = references.get(entityId) ?? new Set<string>();
      values.add(document.name);
      references.set(entityId, values);
    }
    return references;
  };
  const customerIdByCase = new Map(
    (data.procurementCases?.edges ?? []).map(({ node }) => [
      node.id,
      node.customerRecordId ?? null,
    ]),
  );
  const vendorPurchaseOrders = purchaseOrdersByEntity(
    'VENDOR_PURCHASE_ORDER',
    (document) => document.supplierRecordId ?? null,
  );
  const customerPurchaseOrders = purchaseOrdersByEntity(
    'CUSTOMER_PURCHASE_ORDER',
    (document) => customerIdByCase.get(document.procurementCaseRecordId) ?? null,
  );
  const toFilterOptions = (
    references: Map<string, Set<string>>,
    identityField: 'customerId' | 'vendorId',
  ) =>
    [...references.entries()]
      .map(([recordId, purchaseOrderReferences]) => {
        const company = companiesById.get(recordId);
        return {
          recordId,
          name: company?.name ?? recordId,
          businessId: company?.[identityField] ?? null,
          purchaseOrderReferences: [...purchaseOrderReferences].sort(),
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name));

  return {
    ...profitability,
    cashFlow: aggregateVerifiedCashFlow({
      records: cashMovementRecords,
      filters,
    }),
    filterOptions: {
      vendors: toFilterOptions(vendorPurchaseOrders, 'vendorId'),
      customers: toFilterOptions(customerPurchaseOrders, 'customerId'),
    },
  };
};
