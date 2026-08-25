import type { PashxProcurementCaseStage } from 'pashx-mab-contract';

import type {
  MabOperatingStepNumber,
  SupportingEvidenceKind,
} from '../vendor-purchase-order/vendor-purchase-order.types';

export type VendorPurchaseOrderLocale = 'en' | 'ar';

export type VendorPurchaseOrderCopy = Readonly<{
  dashboardLabel: string;
  welcomeTitle: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  refresh: string;
  refreshing: string;
  loading: string;
  errorTitle: string;
  retry: string;
  emptyTitle: string;
  emptyBody: string;
  notFoundTitle: string;
  notFoundBody: string;
  partial: string;
  conflict: string;
  languageName: string;
  languageButtonLabel: string;
  observed: (value: string) => string;
  notRecorded: string;
  noDueDate: string;
  headerTitle: string;
  referenceLabel: string;
  documentTypeLabel: string;
  lifecycleStatusLabel: string;
  versionLabel: string;
  issueDateLabel: string;
  currencyLabel: string;
  totalLabel: string;
  requiredByLabel: string;
  ownerLabel: string;
  projectLabel: string;
  supplierLabel: string;
  riskLabel: string;
  riskNotRecorded: string;
  railTitle: string;
  railDescription: string;
  stepLabels: Readonly<Record<MabOperatingStepNumber, string>>;
  stepComplete: string;
  stepCurrent: string;
  stepUpcoming: string;
  terminalClosed: string;
  terminalCancelled: string;
  linesTitle: string;
  linesDescription: string;
  positionLabel: string;
  descriptionLabel: string;
  specificationLabel: string;
  quantityLabel: string;
  unitLabel: string;
  unitPriceLabel: string;
  lineTotalLabel: string;
  sourceLabel: string;
  noLines: string;
  validationErrorTitle: string;
  invalidQuantityBody: (positions: string) => string;
  mixedCurrencyTitle: string;
  mixedCurrencyBody: (currencies: string) => string;
  mismatchedTotalBody: (expected: string, summed: string) => string;
  unsafeAmountBody: (positions: string) => string;
  supplierTitle: string;
  supplierDescription: string;
  crLabel: string;
  vatLabel: string;
  missingLabel: string;
  openSupplier: string;
  riskTitle: string;
  riskBody: string;
  approvalTitle: string;
  approvalDescription: string;
  noRequest: string;
  requesterLabel: string;
  approverLabel: string;
  requestedAtLabel: string;
  decidedAtLabel: string;
  digestLabel: string;
  decisionNoteLabel: string;
  requestApproval: string;
  approve: string;
  reject: string;
  cancelApproval: string;
  requesting: string;
  deciding: string;
  approvalNotePlaceholder: string;
  requestSuccess: string;
  decideSuccess: (status: string) => string;
  timeoutError: string;
  selfDecisionBlocked: string;
  openApproval: string;
  evidenceTitle: string;
  evidenceDescription: string;
  evidenceKinds: Readonly<Record<SupportingEvidenceKind, string>>;
  recorded: string;
  openRecord: string;
  downloadTitle: string;
  downloadUnavailable: string;
  downloadUnavailableBody: string;
  relatedCaseTitle: string;
  openCase: string;
  openDocument: string;
  formulaTitle: string;
  formulaSteps: readonly string[];
  stages: Readonly<Record<PashxProcurementCaseStage, string>>;
  lifecycleStatuses: Readonly<Record<string, string>>;
  approvalStatuses: Readonly<Record<string, string>>;
}>;

export const vendorPurchaseOrderCopy: Readonly<
  Record<VendorPurchaseOrderLocale, VendorPurchaseOrderCopy>
> = {
  en: {
    dashboardLabel: 'Vendor purchase order',
    welcomeTitle: 'MAB Indus Solutions',
    eyebrow: 'PxD · MAB pilot',
    title: 'Vendor purchase order',
    subtitle:
      'One source-backed purchase order: its supplier, approval state, order lines, evidence and operating progress, shown without re-keying or inventing data.',
    refresh: 'Refresh',
    refreshing: 'Refreshing…',
    loading: 'Loading the vendor purchase order…',
    errorTitle: 'The vendor purchase order could not be loaded.',
    retry: 'Try again',
    emptyTitle: 'Select a vendor purchase order',
    emptyBody:
      'Open this page with one commercial document selected. Until then, nothing is shown and no cause is invented.',
    notFoundTitle: 'Vendor purchase order not found',
    notFoundBody:
      'The selected record is not visible to this account or is not a commercial document.',
    partial: 'Result is partial: more records exist than this bounded view shows.',
    conflict:
      'Evidence is in conflict and no authoritative line arithmetic can be shown.',
    languageName: 'العربية',
    languageButtonLabel: 'Switch display language',
    observed: (value) => `Observed ${value}`,
    notRecorded: 'Not recorded',
    noDueDate: 'No due date',
    headerTitle: 'Purchase order',
    referenceLabel: 'Reference',
    documentTypeLabel: 'Document type',
    lifecycleStatusLabel: 'Lifecycle status',
    versionLabel: 'Draft version',
    issueDateLabel: 'Issue date',
    currencyLabel: 'Currency',
    totalLabel: 'Total',
    requiredByLabel: 'Required by',
    ownerLabel: 'Owner',
    projectLabel: 'Project',
    supplierLabel: 'Supplier',
    riskLabel: 'Risk',
    riskNotRecorded: 'Not recorded',
    railTitle: 'MAB progress',
    railDescription:
      'The seven operating steps are derived from the accepted workflow contract; closed and cancelled are terminal.',
    stepLabels: {
      1: 'Client RFQ',
      2: 'Supplier sourcing',
      3: 'Client quote',
      4: 'Client PO',
      5: 'Vendor PO',
      6: 'Delivery',
      7: 'Client invoice',
    },
    stepComplete: 'Complete',
    stepCurrent: 'Current',
    stepUpcoming: 'Upcoming',
    terminalClosed: 'Case closed',
    terminalCancelled: 'Case cancelled',
    linesTitle: 'Order lines',
    linesDescription:
      'Structured source lines with exact integer-micros arithmetic and evidence provenance.',
    positionLabel: 'Position',
    descriptionLabel: 'Description',
    specificationLabel: 'Specification',
    quantityLabel: 'Quantity',
    unitLabel: 'Unit',
    unitPriceLabel: 'Unit price',
    lineTotalLabel: 'Line total',
    sourceLabel: 'Source',
    noLines: 'Order lines are incomplete or not recorded for this order.',
    validationErrorTitle: 'Line arithmetic cannot be trusted',
    invalidQuantityBody: (positions) =>
      `One or more lines carry a zero or negative quantity (positions ${positions}).`,
    mixedCurrencyTitle: 'Mixed currencies',
    mixedCurrencyBody: (currencies) =>
      `Lines span more than one currency (${currencies}); they cannot be combined.`,
    mismatchedTotalBody: (expected, summed) =>
      `The line totals sum to ${summed} but the document total is ${expected}.`,
    unsafeAmountBody: (positions) =>
      `One or more lines carry an unsafe amount (positions ${positions}).`,
    supplierTitle: 'Supplier identity and compliance',
    supplierDescription:
      'Stored CR and VAT with a native drill-through; risk is never inferred from company presence.',
    crLabel: 'CR',
    vatLabel: 'VAT',
    missingLabel: 'Not recorded',
    openSupplier: 'Open supplier',
    riskTitle: 'Supplier risk',
    riskBody:
      'No proven purchase-order compliance projection exists this release; risk stays Not recorded.',
    approvalTitle: 'Human approval',
    approvalDescription:
      'Approval decisions go through the audited command boundary; the requester may not approve their own request.',
    noRequest: 'No approval request recorded for this order.',
    requesterLabel: 'Requester',
    approverLabel: 'Approver',
    requestedAtLabel: 'Requested at',
    decidedAtLabel: 'Decided at',
    digestLabel: 'Payload digest',
    decisionNoteLabel: 'Decision note',
    requestApproval: 'Request approval',
    approve: 'Approve',
    reject: 'Reject',
    cancelApproval: 'Cancel request',
    requesting: 'Requesting…',
    deciding: 'Deciding…',
    approvalNotePlaceholder: 'Decision note (optional for request)',
    requestSuccess: 'Approval requested.',
    decideSuccess: (status) => `Approval ${status}.`,
    timeoutError: 'The approval command timed out. Retry with the same data.',
    selfDecisionBlocked:
      'You cannot approve or reject your own request; cancel it instead.',
    openApproval: 'Open approval record',
    evidenceTitle: 'Supporting evidence',
    evidenceDescription:
      'Each item stays Not recorded until its authoritative record exists; none of these advance the case stage.',
    evidenceKinds: {
      internalApproval: 'Internal approval',
      supplierConfirmation: 'Supplier confirmation',
      receipt: 'Receipt',
      vendorInvoice: 'Vendor invoice',
      verifiedPayment: 'Verified payment',
    },
    recorded: 'Recorded',
    openRecord: 'Open record',
    downloadTitle: 'Draft download',
    downloadUnavailable: 'Unavailable',
    downloadUnavailableBody:
      'Draft download stays disabled until a deterministic local document renderer is accepted.',
    relatedCaseTitle: 'Related case',
    openCase: 'Open case record',
    openDocument: 'Open document',
    formulaTitle: 'Line validation',
    formulaSteps: [
      'Lines must exist; otherwise the table is incomplete or Not recorded.',
      'All lines and the document must share one currency.',
      'Every quantity must be greater than zero.',
      'Every line total must be a safe integer number of micros.',
      'The summed line totals must equal the document total.',
    ],
    stages: {
      intake: 'Intake',
      sourcing: 'Sourcing',
      quoted: 'Quoted',
      'customer-order': 'Customer order',
      'vendor-order': 'Vendor order',
      delivery: 'Delivery',
      invoicing: 'Invoicing',
      closed: 'Closed',
      cancelled: 'Cancelled',
    },
    lifecycleStatuses: {
      DRAFT: 'Draft',
      FINALIZED: 'Finalized',
      CANCELLED: 'Cancelled',
      CREDITED: 'Credited',
    },
    approvalStatuses: {
      PENDING: 'Pending',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      CANCELLED: 'Cancelled',
    },
  },
  ar: {
    dashboardLabel: 'أمر شراء المورد',
    welcomeTitle: 'حلول مباندس',
    eyebrow: 'PxD · تجربة مباندس',
    title: 'أمر شراء المورد',
    subtitle:
      'أمر شراء واحد مدعوم بالمصدر: مورّده وحالة اعتماده وبنوده وأدلته وتقدّم التشغيل، دون إعادة إدخال أو اختلاق بيانات.',
    refresh: 'تحديث',
    refreshing: 'جارٍ التحديث…',
    loading: 'جارٍ تحميل أمر شراء المورد…',
    errorTitle: 'تعذر تحميل أمر شراء المورد.',
    retry: 'حاول مرة أخرى',
    emptyTitle: 'اختر أمر شراء المورد',
    emptyBody:
      'افتح هذه الشاشة مع تحديد مستند تجاري واحد. حتى ذلك الحين لا يُعرض شيء ولا يُدّعى أي سبب.',
    notFoundTitle: 'لم يُعثر على أمر شراء المورد',
    notFoundBody: 'السجل المحدد غير مرئي لهذا الحساب أو ليس مستنداً تجارياً.',
    partial: 'النتيجة جزئية: توجد سجلات أكثر مما تعرضه هذه الشاشة المحدودة.',
    conflict: 'الأدلة متعارضة ولا يمكن عرض حساب بنود موثوق.',
    languageName: 'English',
    languageButtonLabel: 'تبديل لغة العرض',
    observed: (value) => `تمت الملاحظة ${value}`,
    notRecorded: 'غير مسجل',
    noDueDate: 'لا يوجد تاريخ استحقاق',
    headerTitle: 'أمر الشراء',
    referenceLabel: 'المرجع',
    documentTypeLabel: 'نوع المستند',
    lifecycleStatusLabel: 'حالة دورة الحياة',
    versionLabel: 'إصدار المسودة',
    issueDateLabel: 'تاريخ الإصدار',
    currencyLabel: 'العملة',
    totalLabel: 'الإجمالي',
    requiredByLabel: 'مطلوب قبل',
    ownerLabel: 'المالك',
    projectLabel: 'المشروع',
    supplierLabel: 'المورد',
    riskLabel: 'المخاطر',
    riskNotRecorded: 'غير مسجل',
    railTitle: 'تقدّم مباندس',
    railDescription:
      'الخطوات التشغيلية السبع مشتقة من عقد سير العمل المعتمد؛ والإغلاق والإلغاء حالتان نهائيتان.',
    stepLabels: {
      1: 'طلب عرض العميل',
      2: 'توريد المورد',
      3: 'عرض العميل',
      4: 'أمر العميل',
      5: 'أمر المورد',
      6: 'التسليم',
      7: 'فاتورة العميل',
    },
    stepComplete: 'مكتمل',
    stepCurrent: 'حالي',
    stepUpcoming: 'قادم',
    terminalClosed: 'الحالة مغلقة',
    terminalCancelled: 'الحالة ملغاة',
    linesTitle: 'بنود الطلب',
    linesDescription:
      'بنود مصدرية منظمة مع حساب دقيق بالميكرو الصحيح ومصدر الأدلة.',
    positionLabel: 'الموضع',
    descriptionLabel: 'الوصف',
    specificationLabel: 'المواصفة',
    quantityLabel: 'الكمية',
    unitLabel: 'الوحدة',
    unitPriceLabel: 'سعر الوحدة',
    lineTotalLabel: 'إجمالي البند',
    sourceLabel: 'المصدر',
    noLines: 'بنود الطلب غير مكتملة أو غير مسجلة لهذا الطلب.',
    validationErrorTitle: 'لا يمكن الوثوق بحساب البنود',
    invalidQuantityBody: (positions) =>
      `يحمل بند أو أكثر كمية صفرية أو سالبة (المواضع ${positions}).`,
    mixedCurrencyTitle: 'عملات متعددة',
    mixedCurrencyBody: (currencies) =>
      `تغطي البنود أكثر من عملة (${currencies})؛ ولا يمكن جمعها.`,
    mismatchedTotalBody: (expected, summed) =>
      `مجموع إجماليات البنود ${summed} بينما إجمالي المستند ${expected}.`,
    unsafeAmountBody: (positions) =>
      `يحمل بند أو أكثر مبلغاً غير آمن (المواضع ${positions}).`,
    supplierTitle: 'هوية المورد والامتثال',
    supplierDescription:
      'السجل التجاري والرقم الضريبي المخزّنان مع فتح السجل الأصلي؛ ولا تُستنتج المخاطر من وجود الشركة.',
    crLabel: 'السجل التجاري',
    vatLabel: 'الرقم الضريبي',
    missingLabel: 'غير مسجل',
    openSupplier: 'فتح المورد',
    riskTitle: 'مخاطر المورد',
    riskBody:
      'لا يوجد إسقاط امتثال معتمد لأوامر الشراء في هذا الإصدار؛ تبقى المخاطر غير مسجلة.',
    approvalTitle: 'الاعتماد البشري',
    approvalDescription:
      'تحدث قرارات الاعتماد عبر حدود الأوامر الموثقة؛ ولا يجوز لطالب الاعتماد اعتماد طلبه.',
    noRequest: 'لا يوجد طلب اعتماد مسجل لهذا الطلب.',
    requesterLabel: 'الطالب',
    approverLabel: 'المعتمد',
    requestedAtLabel: 'طلب في',
    decidedAtLabel: 'تم البت في',
    digestLabel: 'بصمة الحمولة',
    decisionNoteLabel: 'ملاحظة القرار',
    requestApproval: 'طلب الاعتماد',
    approve: 'اعتماد',
    reject: 'رفض',
    cancelApproval: 'إلغاء الطلب',
    requesting: 'جارٍ الطلب…',
    deciding: 'جارٍ البت…',
    approvalNotePlaceholder: 'ملاحظة القرار (اختيارية للطلب)',
    requestSuccess: 'تم طلب الاعتماد.',
    decideSuccess: (status) => `الاعتماد ${status}.`,
    timeoutError: 'انتهت مهلة أمر الاعتماد. أعد المحاولة بنفس البيانات.',
    selfDecisionBlocked: 'لا يمكنك اعتماد طلبك أو رفضه؛ ألغِه بدلاً من ذلك.',
    openApproval: 'فتح سجل الاعتماد',
    evidenceTitle: 'الأدلة الداعمة',
    evidenceDescription:
      'يبقى كل بند غير مسجل حتى يوجد سجله الموثوق؛ ولا يقدّم أي منها مرحلة الحالة.',
    evidenceKinds: {
      internalApproval: 'الاعتماد الداخلي',
      supplierConfirmation: 'تأكيد المورد',
      receipt: 'الاستلام',
      vendorInvoice: 'فاتورة المورد',
      verifiedPayment: 'الدفع الموثق',
    },
    recorded: 'مسجل',
    openRecord: 'فتح السجل',
    downloadTitle: 'تنزيل المسودة',
    downloadUnavailable: 'غير متاح',
    downloadUnavailableBody:
      'يبقى تنزيل المسودة معطلاً حتى يُعتمد مولّد مستندات محلي حتمي.',
    relatedCaseTitle: 'الحالة المرتبطة',
    openCase: 'فتح سجل الحالة',
    openDocument: 'فتح المستند',
    formulaTitle: 'التحقق من البنود',
    formulaSteps: [
      'يجب وجود البنود؛ وإلا يكون الجدول غير مكتمل أو غير مسجل.',
      'يجب أن تشترك البنود والمستند في عملة واحدة.',
      'يجب أن تكون كل كمية أكبر من صفر.',
      'يجب أن يكون إجمالي كل بند عدداً صحيحاً وآمناً من الميكرو.',
      'يجب أن يساوي مجموع إجماليات البنود إجمالي المستند.',
    ],
    stages: {
      intake: 'الاستلام',
      sourcing: 'التوريد',
      quoted: 'عرض السعر',
      'customer-order': 'أمر العميل',
      'vendor-order': 'أمر المورد',
      delivery: 'التسليم',
      invoicing: 'الفوترة',
      closed: 'مغلقة',
      cancelled: 'ملغاة',
    },
    lifecycleStatuses: {
      DRAFT: 'مسودة',
      FINALIZED: 'معتمد',
      CANCELLED: 'ملغى',
      CREDITED: 'مُقيد',
    },
    approvalStatuses: {
      PENDING: 'قيد الانتظار',
      APPROVED: 'معتمد',
      REJECTED: 'مرفوض',
      CANCELLED: 'ملغى',
    },
  },
};

export const toVendorPurchaseOrderLocale = (
  locale: string | null,
): VendorPurchaseOrderLocale => (locale?.startsWith('ar') ? 'ar' : 'en');
