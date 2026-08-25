import {
  PASHX_MAB_CAPABILITIES,
  PASHX_MAB_WORKFLOW_DOCUMENT_RULES,
  PASHX_PURCHASE_ORDER_APPROVAL_ACTION_CODE,
  type PashxProcurementCaseStage,
} from 'pashx-mab-contract';

import type {
  ApprovalPanelState,
  MabOperatingStep,
  MabOperatingStepNumber,
  MabProgressRailEntry,
  MabProgressStepState,
  SupplierRiskState,
  SupportingEvidenceState,
  VendorPurchaseOrderApprovalRecord,
  VendorPurchaseOrderCashMovementRecord,
  VendorPurchaseOrderDocumentRecord,
  VendorPurchaseOrderLineRecord,
  VendorPurchaseOrderLineValidation,
} from './vendor-purchase-order.types';

// The seven operating steps are derived from the frozen workflow document
// rules: one step per numbered workflowStep, carrying that step's case stage.
// Closed and cancelled are terminal case stages and never appear as a rail
// position; the caller renders them separately.
export const deriveMabOperatingSteps = (): readonly MabOperatingStep[] => {
  const stageByStep = new Map<number, PashxProcurementCaseStage>();

  for (const rule of Object.values(PASHX_MAB_WORKFLOW_DOCUMENT_RULES)) {
    if (rule.workflowStep !== 'supporting') {
      stageByStep.set(rule.workflowStep, rule.stage);
    }
  }

  return [...stageByStep.entries()]
    .sort(([left], [right]) => left - right)
    .map(([step, stage]) => ({
      step: step as MabOperatingStepNumber,
      stage,
    }));
};

const MAB_OPERATING_STEPS: readonly MabOperatingStep[] =
  deriveMabOperatingSteps();

const isOperatingStage = (
  stage: PashxProcurementCaseStage | null,
): boolean => MAB_OPERATING_STEPS.some((step) => step.stage === stage);

export const buildMabProgressRail = (
  currentStage: PashxProcurementCaseStage | null,
): readonly MabProgressRailEntry[] => {
  const currentPosition = MAB_OPERATING_STEPS.findIndex(
    (step) => step.stage === currentStage,
  );

  return MAB_OPERATING_STEPS.map((step) => {
    let state: MabProgressStepState;
    if (currentStage === 'closed') {
      state = 'complete';
    } else if (
      currentStage === 'cancelled' ||
      currentStage === null ||
      !isOperatingStage(currentStage)
    ) {
      state = 'upcoming';
    } else if (step.stage === currentStage) {
      state = 'current';
    } else if (currentPosition > -1 && step.step < currentPosition + 1) {
      state = 'complete';
    } else {
      state = 'upcoming';
    }

    return { step: step.step, stage: step.stage, state };
  });
};

const isSafeMicros = (value: number | null): value is number =>
  value !== null && Number.isSafeInteger(value);

const distinctNonEmpty = (values: readonly (string | null)[]): readonly string[] =>
  [...new Set(values.filter((value): value is string => value !== null && value.trim() !== ''))].sort();

// Integer-micros line validation. Gate order is part of the frozen contract:
// no lines, mixed currency, invalid quantity, unsafe micros, then the summed
// total against the document total. Missing values never fabricate a number;
// they fail closed to their explicit state.
export const validateVendorPurchaseOrderLines = ({
  lines,
  document,
}: {
  lines: readonly VendorPurchaseOrderLineRecord[];
  document: VendorPurchaseOrderDocumentRecord | null;
}): VendorPurchaseOrderLineValidation => {
  if (lines.length === 0) {
    return { status: 'no-lines' };
  }

  const lineCurrencies = distinctNonEmpty(
    lines.map((line) => line.currencyCode),
  );
  const documentCurrency =
    document?.currencyCode !== null && document?.currencyCode !== undefined
      ? document.currencyCode
      : null;

  if (
    lineCurrencies.length > 1 ||
    (documentCurrency !== null &&
      documentCurrency.trim() !== '' &&
      lineCurrencies.some((currency) => currency !== documentCurrency))
  ) {
    return {
      status: 'mixed-currency',
      currencies: lineCurrencies.length > 0 ? lineCurrencies : [documentCurrency!],
    };
  }

  const invalidQuantityPositions = lines
    .filter(
      (line) =>
        line.quantity === null ||
        !Number.isFinite(line.quantity) ||
        !(line.quantity > 0),
    )
    .map((line) => line.position)
    .filter((position): position is number => position !== null);

  if (invalidQuantityPositions.length > 0) {
    return { status: 'invalid-quantity', positions: invalidQuantityPositions };
  }

  const unsafeAmountPositions = lines
    .filter((line) => !isSafeMicros(line.lineTotalMicros))
    .map((line) => line.position)
    .filter((position): position is number => position !== null);

  if (unsafeAmountPositions.length > 0) {
    return { status: 'unsafe-amount', positions: unsafeAmountPositions };
  }

  const summedTotalMicros = lines.reduce(
    (total, line) => total + (line.lineTotalMicros ?? 0),
    0,
  );
  const documentTotal = document?.totalAmountMicros ?? null;

  if (isSafeMicros(documentTotal) && summedTotalMicros !== documentTotal) {
    return {
      status: 'mismatched-total',
      expectedTotalMicros: documentTotal,
      summedTotalMicros: summedTotalMicros,
    };
  }

  return { status: 'ready' };
};

// D8: a payment is evidence only when the cash movement is VERIFIED, an
// OUTFLOW, positive, linked to this PO, and carries an evidence reference.
// Pending/rejected/incomplete movements are excluded, never counted.
export const selectVerifiedPaymentMovements = (
  cashMovements: readonly VendorPurchaseOrderCashMovementRecord[],
  poRecordId: string,
): readonly VendorPurchaseOrderCashMovementRecord[] =>
  cashMovements.filter(
    (movement) =>
      movement.verificationStatus === 'VERIFIED' &&
      movement.direction === 'OUTFLOW' &&
      isSafeMicros(movement.amountMicros) &&
      movement.amountMicros > 0 &&
      movement.sourceDocumentRecordId === poRecordId &&
      movement.evidenceReference !== null &&
      movement.evidenceReference.trim() !== '',
  );

const isFinalized = (document: VendorPurchaseOrderDocumentRecord): boolean =>
  document.lifecycleStatus === 'FINALIZED';

const hasApprovedInternalApproval = (
  approvals: readonly VendorPurchaseOrderApprovalRecord[],
  poRecordId: string,
): boolean =>
  approvals.some(
    (approval) =>
      approval.status === 'APPROVED' &&
      approval.requestedActionCode === PASHX_PURCHASE_ORDER_APPROVAL_ACTION_CODE &&
      approval.sourceRecordIds.includes(poRecordId),
  );

export const buildSupportingEvidence = ({
  approvals,
  cashMovements,
  caseDocuments,
  poRecordId,
}: {
  approvals: readonly VendorPurchaseOrderApprovalRecord[];
  cashMovements: readonly VendorPurchaseOrderCashMovementRecord[];
  caseDocuments: readonly VendorPurchaseOrderDocumentRecord[];
  poRecordId: string;
}): readonly SupportingEvidenceState[] => {
  const verifiedPayments = selectVerifiedPaymentMovements(
    cashMovements,
    poRecordId,
  );
  const deliveryNotes = caseDocuments.filter(
    (document) =>
      document.documentType === 'deliveryNote' && isFinalized(document),
  );
  const vendorInvoices = caseDocuments.filter(
    (document) =>
      document.documentType === 'vendorInvoice' && isFinalized(document),
  );

  return [
    hasApprovedInternalApproval(approvals, poRecordId)
      ? {
          kind: 'internalApproval',
          status: 'recorded',
          recordIds: approvals
            .filter(
              (approval) =>
                approval.status === 'APPROVED' &&
                approval.requestedActionCode ===
                  PASHX_PURCHASE_ORDER_APPROVAL_ACTION_CODE &&
                approval.sourceRecordIds.includes(poRecordId),
            )
            .map((approval) => approval.id),
        }
      : { kind: 'internalApproval', status: 'not-recorded' },
    // Supplier confirmation has no accepted contract in this release.
    { kind: 'supplierConfirmation', status: 'not-recorded' },
    deliveryNotes.length > 0
      ? {
          kind: 'receipt',
          status: 'recorded',
          recordIds: deliveryNotes.map((document) => document.id),
        }
      : { kind: 'receipt', status: 'not-recorded' },
    vendorInvoices.length > 0
      ? {
          kind: 'vendorInvoice',
          status: 'recorded',
          recordIds: vendorInvoices.map((document) => document.id),
        }
      : { kind: 'vendorInvoice', status: 'not-recorded' },
    verifiedPayments.length > 0
      ? {
          kind: 'verifiedPayment',
          status: 'recorded',
          recordIds: verifiedPayments.map((movement) => movement.id),
        }
      : { kind: 'verifiedPayment', status: 'not-recorded' },
  ];
};

// D3: supplier risk has no proven PO-level compliance projection this release.
// The panel always renders Not recorded and never infers a Verified badge.
export const buildSupplierRisk = (): SupplierRiskState => ({
  status: 'not-recorded',
});

export const selectApprovalPanelState = (
  approvals: readonly VendorPurchaseOrderApprovalRecord[],
  poRecordId: string,
): ApprovalPanelState => {
  const relevant = approvals
    .filter(
      (approval) =>
        approval.requestedActionCode === PASHX_PURCHASE_ORDER_APPROVAL_ACTION_CODE &&
        approval.sourceRecordIds.includes(poRecordId),
    )
    .sort((left, right) => {
      const leftAt = Date.parse(left.requestedAt ?? '');
      const rightAt = Date.parse(right.requestedAt ?? '');
      return (Number.isNaN(leftAt) ? 0 : leftAt) -
        (Number.isNaN(rightAt) ? 0 : rightAt);
    });

  const latest = relevant[relevant.length - 1];
  if (latest === undefined || latest.status === null) {
    return { status: 'no-request' };
  }

  return { status: latest.status, approvalRecordId: latest.id };
};

// D5: map the current user's MAB capability flag keys to the approval actions
// the UI may present. Admin and Operator carry both; Viewer and Evidence Agent
// carry neither and stay read-only.
export const resolveApprovalCapabilities = (
  permissionFlagKeys: readonly string[],
): Readonly<{ canRequest: boolean; canDecide: boolean }> => ({
  canRequest: permissionFlagKeys.includes(
    PASHX_MAB_CAPABILITIES.approvalRequest,
  ),
  canDecide: permissionFlagKeys.includes(PASHX_MAB_CAPABILITIES.approvalDecide),
});

// D4: the approval request identity is deterministic so a timeout retry resends
// a byte-identical request and hits the audited idempotency replay no-op. The
// idempotency key is stable per PO + action; the record id is a v4 UUID derived
// from the canonical digest, so the same payload always yields the same record.
export const buildPurchaseOrderApprovalIdempotencyKey = (
  commercialDocumentRecordId: string,
): string => `purchaseOrder.approval:${commercialDocumentRecordId}`;

export const buildPurchaseOrderApprovalRequestRecordId = (
  payloadDigest: string,
): string => {
  const hex = payloadDigest.slice(0, 32);
  const bytes = hex.match(/.{2}/g) ?? [];
  if (bytes.length !== 16) {
    throw new Error('Approval payload digest must be a full SHA-256 hex string.');
  }
  const values = bytes.map((pair) => Number.parseInt(pair, 16));
  values[6] = (values[6]! & 0x0f) | 0x40; // version 4
  values[8] = (values[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const toHex = (value: number): string => value.toString(16).padStart(2, '0');

  return [
    values.slice(0, 4).map(toHex).join(''),
    values.slice(4, 6).map(toHex).join(''),
    values.slice(6, 8).map(toHex).join(''),
    values.slice(8, 10).map(toHex).join(''),
    values.slice(10).map(toHex).join(''),
  ].join('-');
};

export const getVendorPurchaseOrderCaseHref = (caseRecordId: string): string =>
  `/object/procurementCase/${caseRecordId}`;

export const getVendorPurchaseOrderDocumentHref = (
  documentRecordId: string,
): string => `/object/commercialDocument/${documentRecordId}`;

export const getVendorPurchaseOrderCompanyHref = (
  companyRecordId: string,
): string => `/object/company/${companyRecordId}`;

export const getVendorPurchaseOrderApprovalHref = (
  approvalRecordId: string,
): string => `/object/approvalRequest/${approvalRecordId}`;

export const getVendorPurchaseOrderCashMovementHref = (
  cashMovementRecordId: string,
): string => `/object/cashMovement/${cashMovementRecordId}`;

const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();
const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const numberFormatterCache = new Map<string, Intl.NumberFormat>();

export const formatVendorPurchaseOrderDateTime = (
  value: string | null,
  locale: 'en' | 'ar',
): string => {
  if (value === null || value.trim() === '') return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return '—';
  const formatter =
    dateTimeFormatterCache.get(locale) ??
    new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  dateTimeFormatterCache.set(locale, formatter);

  return formatter.format(parsed);
};

export const formatVendorPurchaseOrderDate = (
  value: string | null,
  locale: 'en' | 'ar',
): string => {
  if (value === null || value.trim() === '') return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return '—';
  const cacheKey = `date:${locale}`;
  const formatter =
    dateFormatterCache.get(cacheKey) ??
    new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
      dateStyle: 'medium',
    });
  dateFormatterCache.set(cacheKey, formatter);

  return formatter.format(parsed);
};

export const formatVendorPurchaseOrderAmount = (
  amountMicros: number | null,
  currencyCode: string | null,
  locale: 'en' | 'ar',
): string => {
  if (amountMicros === null) return '—';
  const amount = amountMicros / 1_000_000;
  const formatter =
    numberFormatterCache.get(locale) ??
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  numberFormatterCache.set(locale, formatter);

  return `${formatter.format(amount)} ${currencyCode ?? ''}`.trimEnd();
};

export const formatVendorPurchaseOrderQuantity = (
  quantity: number | null,
  locale: 'en' | 'ar',
): string => {
  if (quantity === null) return '—';
  const formatter =
    numberFormatterCache.get(`quantity:${locale}`) ??
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
      maximumFractionDigits: 6,
    });
  numberFormatterCache.set(`quantity:${locale}`, formatter);

  return formatter.format(quantity);
};
