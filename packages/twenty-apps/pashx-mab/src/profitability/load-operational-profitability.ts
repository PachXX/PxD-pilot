import { CoreApiClient } from 'twenty-client-sdk/core';

import { aggregateOperationalProfitability } from './aggregate-operational-profitability';
import {
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

type CommercialDocumentNode = Readonly<{
  id: string;
  name: string;
  documentType: string;
  lifecycleStatus: ProfitabilityLifecycleStatus;
  complianceStatus: ProfitabilityComplianceStatus;
  procurementCaseRecordId: string;
  issueDate: string | null;
  totalAmount?: CurrencyValue | null;
}>;

type ExpenseNode = Readonly<{
  id: string;
  name: string;
  approvalStatus: ProfitabilityExpenseApprovalStatus;
  procurementCaseRecordId: string;
  incurredDate: string | null;
  amount?: CurrencyValue | null;
}>;

type QueryConnection<TNode> = Readonly<{
  edges?: readonly Readonly<{ node: TNode }>[];
  pageInfo?: Readonly<{ hasNextPage: boolean }>;
}>;

type ProfitabilityQueryData = Readonly<{
  procurementCases?: QueryConnection<CaseNode>;
  commercialDocuments?: QueryConnection<CommercialDocumentNode>;
  expenses?: QueryConnection<ExpenseNode>;
}>;

const toCaseDimension = (node: CaseNode): ProfitabilityCaseDimension => ({
  caseRecordId: node.id,
  caseName: node.name,
  customerRecordId: node.customerRecordId ?? null,
  projectName: node.projectName ?? null,
  ownerRecordId: node.ownerRecordId ?? null,
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
  })) as ProfitabilityQueryData;

  if (
    data.procurementCases?.pageInfo?.hasNextPage === true ||
    data.commercialDocuments?.pageInfo?.hasNextPage === true ||
    data.expenses?.pageInfo?.hasNextPage === true
  ) {
    throw new Error(
      'Operational profitability exceeded the bounded 1,000-record query limit.',
    );
  }

  const caseDimensions = new Map(
    (data.procurementCases?.edges ?? []).map(({ node }) => [
      node.id,
      toCaseDimension(node),
    ]),
  );
  const documentRecords: ProfitabilitySourceRecord[] = (
    data.commercialDocuments?.edges ?? []
  ).map(({ node }) => ({
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

  return aggregateOperationalProfitability({
    records: [...documentRecords, ...expenseRecords],
    filters,
    asOf: now().toISOString(),
  });
};
