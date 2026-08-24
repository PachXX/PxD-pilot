import {
  PASHX_PROCUREMENT_CASE_STAGES,
  type PashxCaseDeliveryStatus,
  type PashxProcurementCaseStage,
} from 'pashx-mab-contract';

import type {
  CaseWorkflowCaseRecord,
  CaseWorkflowDocumentRecord,
  CaseWorkflowInvoiceMissingReason,
  CaseWorkflowInvoiceReadiness,
  CaseWorkflowPriceComparisonRow,
  CaseWorkflowStageRailEntry,
  CaseWorkflowStageState,
} from './case-workflow.types';

export const CASE_WORKFLOW_STAGE_ORDER: readonly PashxProcurementCaseStage[] =
  PASHX_PROCUREMENT_CASE_STAGES;

const isWorkflowStage = (
  stage: PashxProcurementCaseStage,
): stage is Exclude<PashxProcurementCaseStage, 'closed' | 'cancelled'> =>
  stage !== 'closed' && stage !== 'cancelled';

// The process rail is derived from the frozen WF1 stage order. Stages before the
// current stage are complete, the current stage is marked, later stages are
// upcoming. A cancelled case carries no position information, so its active
// stages stay upcoming and only the cancelled marker is authoritative — the
// documents ledger below still shows whatever evidence actually exists.
export const buildCaseStageRail = (
  currentStage: PashxProcurementCaseStage | null,
): readonly CaseWorkflowStageRailEntry[] => {
  const currentPosition = CASE_WORKFLOW_STAGE_ORDER.indexOf(
    currentStage ?? 'intake',
  );

  return CASE_WORKFLOW_STAGE_ORDER.map((stage, position) => {
    let state: CaseWorkflowStageState;
    if (currentStage === 'cancelled') {
      state = stage === 'cancelled' ? 'cancelled' : 'upcoming';
    } else if (stage === currentStage) {
      state = 'current';
    } else if (stage === 'cancelled') {
      // The cancellation marker never claims a position in a non-cancelled chain.
      state = 'upcoming';
    } else if (
      currentStage === 'closed' ||
      (isWorkflowStage(stage) && position < currentPosition)
    ) {
      state = 'complete';
    } else {
      state = 'upcoming';
    }

    return { stage, state, position };
  });
};

const isFinalized = (document: CaseWorkflowDocumentRecord): boolean =>
  document.lifecycleStatus === 'FINALIZED';

const statusRank = (lifecycleStatus: string | null): number =>
  lifecycleStatus === 'FINALIZED' ? 0 : 1;

// Deterministic price comparison: finalized vendor quotations first, then by
// ascending total (missing totals last), then by document reference.
export const buildPriceComparisonRows = (
  documents: readonly CaseWorkflowDocumentRecord[],
  procurementCaseRecordId: string,
): readonly CaseWorkflowPriceComparisonRow[] =>
  documents
    .filter(
      (document) =>
        document.procurementCaseRecordId === procurementCaseRecordId &&
        document.documentType === 'vendorQuote',
    )
    .map((document) => ({
      documentId: document.id,
      documentName: document.name,
      supplierRecordId: document.supplierRecordId,
      totalAmountMicros: document.totalAmountMicros,
      currencyCode: document.currencyCode,
      lifecycleStatus: document.lifecycleStatus,
    }))
    .sort((left, right) => {
      const statusDelta =
        statusRank(left.lifecycleStatus) - statusRank(right.lifecycleStatus);

      if (statusDelta !== 0) return statusDelta;
      if (left.totalAmountMicros !== right.totalAmountMicros) {
        if (left.totalAmountMicros === null) return 1;
        if (right.totalAmountMicros === null) return -1;

        return left.totalAmountMicros - right.totalAmountMicros;
      }

      return left.documentName.localeCompare(right.documentName);
    });

export const buildDeliveryState = (
  procurementCase: CaseWorkflowCaseRecord,
  documents: readonly CaseWorkflowDocumentRecord[],
): {
  status: PashxCaseDeliveryStatus;
  dueAt: string | null;
  deliveryNoteCount: number;
  finalizedDeliveryNoteCount: number;
  deliveryNoteDocumentIds: readonly string[];
} => {
  const deliveryNotes = documents.filter(
    (document) =>
      document.procurementCaseRecordId === procurementCase.id &&
      document.documentType === 'deliveryNote',
  );

  return {
    status: procurementCase.deliveryStatus ?? 'notStarted',
    dueAt: procurementCase.deliveryDueAt,
    deliveryNoteCount: deliveryNotes.length,
    finalizedDeliveryNoteCount: deliveryNotes.filter(isFinalized).length,
    deliveryNoteDocumentIds: deliveryNotes.map((document) => document.id),
  };
};

// Invoice eligibility derives from finalized evidence only, per the operating
// graph: an approved/delivered customer purchase order and a finalized
// delivery note precede the customer invoice. Compliance state is displayed
// separately and never changes these counts.
export const buildInvoiceReadiness = (
  documents: readonly CaseWorkflowDocumentRecord[],
  procurementCaseRecordId: string,
): CaseWorkflowInvoiceReadiness => {
  const caseDocuments = documents.filter(
    (document) => document.procurementCaseRecordId === procurementCaseRecordId,
  );
  const ofType = (documentType: string) =>
    caseDocuments.filter((document) => document.documentType === documentType);
  const customerPurchaseOrders = ofType('customerPurchaseOrder');
  const deliveryNotes = ofType('deliveryNote');
  const customerInvoices = ofType('customerInvoice');
  const finalizedCustomerPurchaseOrderCount =
    customerPurchaseOrders.filter(isFinalized).length;
  const finalizedDeliveryNoteCount = deliveryNotes.filter(isFinalized).length;
  const finalizedCustomerInvoiceCount =
    customerInvoices.filter(isFinalized).length;
  const missingReasons: CaseWorkflowInvoiceMissingReason[] = [];

  if (finalizedCustomerPurchaseOrderCount === 0) {
    missingReasons.push('missing-finalized-customer-purchase-order');
  }
  if (finalizedDeliveryNoteCount === 0) {
    missingReasons.push('missing-finalized-delivery-note');
  }
  if (finalizedCustomerInvoiceCount === 0) {
    missingReasons.push('missing-finalized-customer-invoice');
  }

  return {
    customerPurchaseOrderCount: customerPurchaseOrders.length,
    finalizedCustomerPurchaseOrderCount,
    deliveryNoteCount: deliveryNotes.length,
    finalizedDeliveryNoteCount,
    customerInvoiceCount: customerInvoices.length,
    finalizedCustomerInvoiceCount,
    missingReasons,
  };
};

export const getCaseRecordHref = (caseRecordId: string): string =>
  `/object/procurementCase/${caseRecordId}`;

export const getDocumentRecordHref = (documentRecordId: string): string =>
  `/object/commercialDocument/${documentRecordId}`;

export const getSupplierRecordHref = (supplierRecordId: string): string =>
  `/object/company/${supplierRecordId}`;

const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();

export const formatWorkflowDateTime = (
  value: string | null,
  locale: 'en' | 'ar',
): string => {
  if (value === null || value.trim() === '') return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return '—';
  const cacheKey = locale;
  const formatter =
    dateTimeFormatterCache.get(cacheKey) ??
    new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  dateTimeFormatterCache.set(cacheKey, formatter);

  return formatter.format(parsed);
};

const numberFormatterCache = new Map<string, Intl.NumberFormat>();

export const formatWorkflowAmount = (
  totalAmountMicros: number | null,
  currencyCode: string | null,
  locale: 'en' | 'ar',
): string => {
  if (totalAmountMicros === null) return '—';
  const amount = totalAmountMicros / 1_000_000;
  const cacheKey = locale;
  const formatter =
    numberFormatterCache.get(cacheKey) ??
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  numberFormatterCache.set(cacheKey, formatter);

  return `${formatter.format(amount)} ${currencyCode ?? ''}`.trimEnd();
};
