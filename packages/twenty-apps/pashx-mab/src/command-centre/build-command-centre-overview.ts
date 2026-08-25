import {
  PASHX_PROCUREMENT_CASE_STAGES,
  type PashxApprovalQueueItem,
  type PashxEvidenceInsight,
  type PashxOperationalWorkItem,
  type PashxProcurementCaseStage,
} from 'pashx-mab-contract';

import { aggregateVerifiedCashFlow } from '../profitability/aggregate-verified-cash-flow';
import type { CashMovementRecord } from '../profitability/operational-profitability.types';
import {
  buildVendorComparisonRecommendation,
  buildVendorComparisonSummary,
  selectFinalizedVendorQuotes,
} from '../vendor-comparison/vendor-comparison.model';
import type {
  VendorComparisonCaseRecord,
  VendorComparisonDocumentRecord,
} from '../vendor-comparison/vendor-comparison.types';
import type {
  CommandCentreCaseRecord,
  CommandCentreCashMovementRecord,
  CommandCentreCashState,
  CommandCentreCompanyRecord,
  CommandCentreDocumentRecord,
  CommandCentreExpenseRecord,
  CommandCentreNativeLink,
  CommandCentreOverviewResult,
  CommandCentrePartialSource,
  CommandCentreQuotationState,
  CommandCentreStageSummary,
} from './command-centre.types';
import { buildOperationalWorkQueue } from './build-operational-work-queue';

export const COMMAND_CENTRE_ACTIVE_STAGES = [
  'intake',
  'sourcing',
  'quoted',
  'customer-order',
  'vendor-order',
  'delivery',
  'invoicing',
] as const satisfies readonly PashxProcurementCaseStage[];

const activeStageSet = new Set<PashxProcurementCaseStage>(
  COMMAND_CENTRE_ACTIVE_STAGES,
);

const nativeLink = (
  objectName: string,
  recordId: string,
  label: string,
): CommandCentreNativeLink => ({
  objectName,
  recordId,
  label,
  href: `/object/${objectName}/${encodeURIComponent(recordId)}`,
});

const toVendorCase = (
  caseRecord: CommandCentreCaseRecord,
): VendorComparisonCaseRecord => ({
  id: caseRecord.id,
  name: caseRecord.name,
  stage: caseRecord.stage,
  customerRecordId: caseRecord.customerRecordId,
  nextActionCode: caseRecord.nextActionCode,
  actionDueAt: caseRecord.actionDueAt,
  supplierResponseDeadlineAt: caseRecord.supplierResponseDeadlineAt,
});

const toVendorDocument = (
  document: CommandCentreDocumentRecord,
): VendorComparisonDocumentRecord => ({
  id: document.id,
  name: document.name,
  procurementCaseRecordId: document.procurementCaseRecordId,
  documentType: document.normalizedDocumentType,
  lifecycleStatus: document.lifecycleStatus,
  supplierRecordId: document.supplierRecordId,
  issueDate: document.issueDate,
  currencyCode: document.currencyCode,
  totalAmountMicros: document.totalAmountMicros,
  leadTimeDays: document.leadTimeDays,
  paymentTerms: document.paymentTerms,
  validUntil: document.validUntil,
});

const buildQuotationState = (
  caseRecord: CommandCentreCaseRecord,
  documents: readonly CommandCentreDocumentRecord[],
  asOf: string,
): CommandCentreQuotationState => {
  const vendorDocuments = documents.map(toVendorDocument);
  const summary = buildVendorComparisonSummary(
    vendorDocuments,
    toVendorCase(caseRecord),
  );
  const recommendation = buildVendorComparisonRecommendation(
    selectFinalizedVendorQuotes(vendorDocuments),
    asOf,
  );

  const recommendationStatus: CommandCentreQuotationState['recommendationStatus'] =
    recommendation.status === 'no-finalized-quotes'
      ? 'AWAITING_FINALIZED_RESPONSES'
      : recommendation.status === 'ranked'
        ? 'COMPARABLE'
        : recommendation.status === 'insufficient-comparable'
          ? 'INSUFFICIENT_COMPARABLE'
          : 'INCOMPARABLE';

  return {
    finalizedInvitationCount: summary.invitedCount,
    finalizedResponseCount: summary.responseCount,
    draftInvitationCount: documents.filter(
      (document) =>
        document.normalizedDocumentType === 'supplierRfq' &&
        document.lifecycleStatus === 'DRAFT',
    ).length,
    draftResponseCount: documents.filter(
      (document) =>
        document.normalizedDocumentType === 'vendorQuote' &&
        document.lifecycleStatus === 'DRAFT',
    ).length,
    recommendationStatus,
  };
};

const workItemCaseId = (
  item: PashxOperationalWorkItem,
  documentCaseById: ReadonlyMap<string, string>,
  visibleCaseIds: ReadonlySet<string>,
): string | null => {
  if (item.source === 'COMMAND_CENTRE') return item.item.procurementCaseId;

  for (const sourceRecordId of item.item.sourceRecordIds) {
    if (visibleCaseIds.has(sourceRecordId)) return sourceRecordId;
    const documentCaseId = documentCaseById.get(sourceRecordId);
    if (documentCaseId !== undefined) return documentCaseId;
  }
  return null;
};

const buildCashState = ({
  capabilityAvailable,
  caseRecord,
  movements,
  documentsById,
}: {
  capabilityAvailable: boolean;
  caseRecord: CommandCentreCaseRecord;
  movements: readonly CommandCentreCashMovementRecord[];
  documentsById: ReadonlyMap<string, CommandCentreDocumentRecord>;
}): CommandCentreCashState => {
  if (!capabilityAvailable) return { status: 'UNAVAILABLE' };

  const records: CashMovementRecord[] = movements.map((movement) => {
    const sourceDocument =
      movement.sourceDocumentRecordId === null
        ? null
        : (documentsById.get(movement.sourceDocumentRecordId) ?? null);
    const sourceBelongsToCase =
      sourceDocument?.procurementCaseRecordId === caseRecord.id;

    return {
      recordId: movement.id,
      recordName: movement.name,
      direction: movement.direction,
      verificationStatus: movement.verificationStatus,
      occurredOn: movement.movementDate,
      amountMicros: movement.amountMicros,
      currencyCode: movement.currencyCode,
      sourceDocumentRecordId: sourceBelongsToCase
        ? movement.sourceDocumentRecordId
        : null,
      bankReference: movement.bankReference,
      evidenceReference: movement.evidenceReference,
      caseDimension: {
        caseRecordId: caseRecord.id,
        caseName: caseRecord.name,
        customerRecordId: caseRecord.customerRecordId,
        projectName: caseRecord.projectName,
        ownerRecordId: caseRecord.ownerRecordId,
      },
    };
  });
  const result = aggregateVerifiedCashFlow({
    records,
    filters: {
      periodStart: '0001-01-01',
      periodEndExclusive: '9999-12-31',
      caseRecordIds: [caseRecord.id],
    },
  });

  if (result.contributions.length === 0) return { status: 'NOT_RECORDED' };

  return {
    status: 'VERIFIED',
    currencies: result.currencies.map((summary) => ({
      currencyCode: summary.currencyCode,
      inflowMicros: summary.inflowMicros,
      outflowMicros: summary.outflowMicros,
      netCashMicros: summary.netCashMicros,
    })),
    movementLinks: result.contributions.map((contribution) =>
      nativeLink(
        'cashMovement',
        contribution.recordId,
        contribution.recordName,
      ),
    ),
  };
};

const buildStageSummary = (
  cases: readonly CommandCentreCaseRecord[],
): CommandCentreStageSummary => {
  const counts = Object.fromEntries(
    COMMAND_CENTRE_ACTIVE_STAGES.map((stage) => [stage, 0]),
  ) as Record<(typeof COMMAND_CENTRE_ACTIVE_STAGES)[number], number>;
  let unrecordedCount = 0;

  for (const caseRecord of cases) {
    if (caseRecord.stage === null) {
      unrecordedCount += 1;
    } else if (activeStageSet.has(caseRecord.stage)) {
      counts[caseRecord.stage as keyof typeof counts] += 1;
    }
  }
  return { counts, unrecordedCount };
};

export const buildCommandCentreOverview = ({
  cases,
  documents,
  expenses,
  companies,
  cashMovements,
  cashCapabilityAvailable,
  commandItems,
  approvals,
  insights,
  partialSources,
  asOf,
}: {
  cases: readonly CommandCentreCaseRecord[];
  documents: readonly CommandCentreDocumentRecord[];
  expenses: readonly CommandCentreExpenseRecord[];
  companies: readonly CommandCentreCompanyRecord[];
  cashMovements: readonly CommandCentreCashMovementRecord[];
  cashCapabilityAvailable: boolean;
  commandItems: CommandCentreOverviewResult['commandItems'];
  approvals: readonly PashxApprovalQueueItem[];
  insights: readonly PashxEvidenceInsight[];
  partialSources: readonly CommandCentrePartialSource[];
  asOf: string;
}): CommandCentreOverviewResult => {
  const caseIds = new Set(cases.map(({ id }) => id));
  const documentsById = new Map(
    documents.map((document) => [document.id, document]),
  );
  const documentCaseById = new Map(
    documents.map((document) => [
      document.id,
      document.procurementCaseRecordId,
    ]),
  );
  const companiesById = new Map(
    companies.map((company) => [company.id, company]),
  );
  const workQueue = buildOperationalWorkQueue({ commandItems, approvals });
  const queueIndexByCaseId = new Map<string, number>();

  workQueue.forEach((item, index) => {
    const caseId = workItemCaseId(item, documentCaseById, caseIds);
    if (
      caseId !== null &&
      caseIds.has(caseId) &&
      !queueIndexByCaseId.has(caseId)
    ) {
      queueIndexByCaseId.set(caseId, index);
    }
  });

  const recordLinks: CommandCentreNativeLink[] = [
    ...cases.map((record) =>
      nativeLink('procurementCase', record.id, record.name),
    ),
    ...documents.map((record) =>
      nativeLink('commercialDocument', record.id, record.name),
    ),
    ...expenses.map((record) => nativeLink('expense', record.id, record.id)),
    ...companies.map((record) => nativeLink('company', record.id, record.name)),
    ...approvals.map((record) =>
      nativeLink('approvalRequest', record.id, record.name),
    ),
    ...insights.map((record) =>
      nativeLink('operationalInsight', record.id, record.narrative),
    ),
    ...cashMovements.map((record) =>
      nativeLink('cashMovement', record.id, record.name),
    ),
  ];

  const rows = cases.map((caseRecord) => {
    const caseDocuments = documents.filter(
      (document) => document.procurementCaseRecordId === caseRecord.id,
    );
    const supplierIds = [
      ...new Set(
        caseDocuments
          .map(({ supplierRecordId }) => supplierRecordId)
          .filter((id): id is string => id !== null && id.trim() !== ''),
      ),
    ];
    const caseMovements = cashMovements.filter(
      (movement) => movement.procurementCaseRecordId === caseRecord.id,
    );
    const nextWork =
      workQueue.find(
        (item) =>
          workItemCaseId(item, documentCaseById, caseIds) === caseRecord.id,
      ) ?? null;

    return {
      caseRecord,
      caseLink: nativeLink('procurementCase', caseRecord.id, caseRecord.name),
      customer:
        caseRecord.customerRecordId === null
          ? null
          : (companiesById.get(caseRecord.customerRecordId) ?? null),
      customerLink:
        caseRecord.customerRecordId === null ||
        !companiesById.has(caseRecord.customerRecordId)
          ? null
          : nativeLink(
              'company',
              caseRecord.customerRecordId,
              companiesById.get(caseRecord.customerRecordId)?.name ?? '',
            ),
      suppliers: supplierIds.flatMap((supplierId) => {
        const company = companiesById.get(supplierId);
        return company === undefined
          ? []
          : [
              {
                company,
                link: nativeLink('company', company.id, company.name),
              },
            ];
      }),
      nextWork,
      totalDocumentCount: caseDocuments.length,
      finalizedDocumentCount: caseDocuments.filter(
        ({ lifecycleStatus }) => lifecycleStatus === 'FINALIZED',
      ).length,
      amountRecordedCount: caseDocuments.filter(
        ({ totalAmountMicros, currencyCode }) =>
          totalAmountMicros !== null &&
          currencyCode !== null &&
          currencyCode.trim() !== '',
      ).length,
      documentLinks: caseDocuments.map((document) =>
        nativeLink('commercialDocument', document.id, document.name),
      ),
      quotation: buildQuotationState(caseRecord, caseDocuments, asOf),
      deliveryStatus: caseRecord.deliveryStatus,
      deliveryDueAt: caseRecord.deliveryDueAt,
      invoices: caseDocuments
        .filter(
          ({ normalizedDocumentType }) =>
            normalizedDocumentType === 'customerInvoice',
        )
        .map((invoice) => ({
          id: invoice.id,
          name: invoice.name,
          lifecycleStatus: invoice.lifecycleStatus,
          complianceStatus: invoice.complianceStatus,
          amountMicros: invoice.totalAmountMicros,
          currencyCode: invoice.currencyCode,
          link: nativeLink('commercialDocument', invoice.id, invoice.name),
        })),
      cash: buildCashState({
        capabilityAvailable: cashCapabilityAvailable,
        caseRecord,
        movements: caseMovements,
        documentsById,
      }),
    };
  });

  rows.sort((left, right) => {
    const leftQueueIndex = queueIndexByCaseId.get(left.caseRecord.id);
    const rightQueueIndex = queueIndexByCaseId.get(right.caseRecord.id);
    if (leftQueueIndex !== undefined || rightQueueIndex !== undefined) {
      if (leftQueueIndex === undefined) return 1;
      if (rightQueueIndex === undefined) return -1;
      if (leftQueueIndex !== rightQueueIndex)
        return leftQueueIndex - rightQueueIndex;
    }
    const updatedOrder = right.caseRecord.updatedAt.localeCompare(
      left.caseRecord.updatedAt,
    );
    return updatedOrder !== 0
      ? updatedOrder
      : left.caseRecord.id.localeCompare(right.caseRecord.id);
  });

  return {
    commandItems,
    approvals,
    insights,
    workQueue,
    cases: rows,
    stageSummary: buildStageSummary(cases),
    recordLinks,
    isPartial: partialSources.length > 0,
    partialSources: [...new Set(partialSources)].sort(),
    asOf,
  };
};

export const isCommandCentreActiveStage = (
  stage: PashxProcurementCaseStage | null,
): boolean => stage !== null && activeStageSet.has(stage);

export const hasKnownCommandCentreStage = (value: string): boolean =>
  PASHX_PROCUREMENT_CASE_STAGES.includes(value as PashxProcurementCaseStage);
