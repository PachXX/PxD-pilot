import type {
  PashxCaseDeliveryStatus,
  PashxCommandCentreReasonCode,
  PashxInsightConfidence,
  PashxInsightType,
  PashxOperationalWorkSignal,
  PashxProcurementCaseStage,
} from 'pashx-mab-contract';
import type {
  CommandCentrePartialSource,
  CommandCentreQuotationState,
} from '../command-centre/command-centre.types';

export type CommandCentreLocale = 'en' | 'ar';

export type CommandCentreCopy = Readonly<{
  welcomeTitle: string;
  languageName: string;
  languageButtonLabel: string;
  dashboardLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  refresh: string;
  refreshing: string;
  loading: string;
  errorTitle: string;
  noPermissionTitle: string;
  noPermissionBody: string;
  retry: string;
  emptyTitle: string;
  emptyBody: string;
  partial: (sources: string) => string;
  partialSourceLabels: Readonly<Record<CommandCentrePartialSource, string>>;
  queueSummary: string;
  observed: (value: string) => string;
  caseCoverage: (visible: number) => string;
  caseSelectorLabel: string;
  allCases: string;
  pipelineTitle: string;
  pipelineDescription: string;
  stageNotRecorded: string;
  operationsTitle: string;
  operationsDescription: string;
  caseLabel: string;
  identityLabel: string;
  stageTaskLabel: string;
  documentsLabel: string;
  quotationLabel: string;
  deliveryInvoiceLabel: string;
  cashLabel: string;
  customerLabel: string;
  suppliersLabel: string;
  commercialRegistrationLabel: string;
  vatRegistrationLabel: string;
  draftStatus: string;
  finalizedStatus: string;
  notRecorded: string;
  unavailableState: string;
  awaitingVerification: string;
  noPendingApprovals: string;
  approvalsTitle: string;
  approvalsDescription: string;
  insightsTitle: string;
  insightsDescription: string;
  insightsEmpty: string;
  insightsEmptyBody: string;
  capabilityTitle: string;
  capabilityDescription: string;
  emailIntakeLabel: string;
  ocrLabel: string;
  vendorRiskLabel: string;
  paymentStatusLabel: string;
  documentLinesLabel: string;
  openRecord: string;
  finalizedDocuments: (finalized: number, total: number) => string;
  amountsRecorded: (recorded: number, total: number) => string;
  draftEvidence: (invitations: number, responses: number) => string;
  finalizedResponses: (invitations: number, responses: number) => string;
  invoiceCount: (count: number) => string;
  verifiedCash: string;
  inflowLabel: string;
  outflowLabel: string;
  netCashLabel: string;
  noDeadline: string;
  requestedAtLabel: string;
  signals: Readonly<Record<PashxOperationalWorkSignal, string>>;
  signalDescriptions: Readonly<Record<PashxOperationalWorkSignal, string>>;
  reasons: Readonly<Record<PashxCommandCentreReasonCode, string>>;
  stages: Readonly<Record<PashxProcurementCaseStage, string>>;
  deliveryStatuses: Readonly<Record<PashxCaseDeliveryStatus, string>>;
  quotationStatuses: Readonly<
    Record<CommandCentreQuotationState['recommendationStatus'], string>
  >;
  insightTypeLabels: Readonly<Record<PashxInsightType, string>>;
  insightTypeUnknown: string;
  confidenceLabels: Readonly<Record<PashxInsightConfidence, string>>;
  confidenceLabel: string;
  confidenceUnknown: string;
  generatedLabel: string;
  generatorLabel: string;
  sourcesLabel: string;
  unresolvedSourceLabel: string;
  openInsightRecord: string;
  noSources: string;
}>;

const english: CommandCentreCopy = {
  welcomeTitle: 'Welcome, MAB Indus Solutions',
  languageName: 'العربية',
  languageButtonLabel: 'Switch to Arabic',
  dashboardLabel: 'PxD MAB Command centre',
  eyebrow: 'MAB procurement / Operations',
  title: 'Command centre',
  subtitle:
    'One evidence-led view of procurement, delivery, invoicing, approvals, and the next work to complete.',
  refresh: 'Refresh',
  refreshing: 'Refreshing…',
  loading: 'Loading authoritative MAB records…',
  errorTitle: 'The Command centre could not be loaded',
  noPermissionTitle: 'Command centre access is limited',
  noPermissionBody:
    'Your workspace role does not currently expose the records required for this view.',
  retry: 'Retry',
  emptyTitle: 'No procurement cases are visible',
  emptyBody: 'No accessible MAB case records were returned.',
  partial: (sources) =>
    `Partial evidence: ${sources}. Visible values remain source-backed.`,
  partialSourceLabels: {
    cases: 'cases',
    documents: 'documents',
    expenses: 'expenses',
    cash: 'verified cash',
    companies: 'company identities',
    approvals: 'approvals',
    insights: 'insights',
    evidenceSourceLinks: 'evidence source links',
  },
  queueSummary: 'Operating signals',
  observed: (value) => `Observed ${value}`,
  caseCoverage: (visible) => `${visible.toLocaleString('en-GB')} visible cases`,
  caseSelectorLabel: 'Focus case',
  allCases: 'All cases',
  pipelineTitle: 'MAB operating pipeline',
  pipelineDescription: 'Counts use the recorded case stage only.',
  stageNotRecorded: 'Stage not recorded',
  operationsTitle: 'Case operations ledger',
  operationsDescription:
    'Real cases ordered by deterministic next work, then last update.',
  caseLabel: 'Case',
  identityLabel: 'Customer / supplier',
  stageTaskLabel: 'Stage / next task',
  documentsLabel: 'Documents',
  quotationLabel: 'Quotation state',
  deliveryInvoiceLabel: 'Delivery / invoice',
  cashLabel: 'Verified cash',
  customerLabel: 'Customer',
  suppliersLabel: 'Suppliers',
  commercialRegistrationLabel: 'CR',
  vatRegistrationLabel: 'VAT',
  draftStatus: 'Draft',
  finalizedStatus: 'Finalized',
  notRecorded: 'Not recorded',
  unavailableState: 'Unavailable',
  awaitingVerification: 'Awaiting verification',
  noPendingApprovals: 'No pending approvals',
  approvalsTitle: 'Human approvals',
  approvalsDescription: 'Pending, source-linked decisions only.',
  insightsTitle: 'Evidence insights',
  insightsDescription: 'Active stored insights; no generated placeholder copy.',
  insightsEmpty: 'No active insights',
  insightsEmptyBody: 'No source-backed operational insight is active.',
  capabilityTitle: 'Capability status',
  capabilityDescription:
    'Missing capabilities remain explicit and are never simulated.',
  emailIntakeLabel: 'Synchronized email',
  ocrLabel: 'Document OCR',
  vendorRiskLabel: 'Vendor risk',
  paymentStatusLabel: 'Payment status',
  documentLinesLabel: 'Verified document lines',
  openRecord: 'Open record',
  finalizedDocuments: (finalized, total) =>
    `${finalized} finalized / ${total} total`,
  amountsRecorded: (recorded, total) =>
    `${recorded} of ${total} totals recorded`,
  draftEvidence: (invitations, responses) =>
    `${invitations} draft RFQs · ${responses} draft responses`,
  finalizedResponses: (invitations, responses) =>
    `${invitations} finalized invitations · ${responses} finalized responses`,
  invoiceCount: (count) => `${count} customer invoices`,
  verifiedCash: 'Human-verified cash',
  inflowLabel: 'Inflow',
  outflowLabel: 'Outflow',
  netCashLabel: 'Net',
  noDeadline: 'No deadline recorded',
  requestedAtLabel: 'Requested',
  signals: {
    COMPLIANCE_EXCEPTION: 'Compliance exceptions',
    APPROVAL_REQUIRED: 'Pending approvals',
    BLOCKED_DATA: 'Blocked data',
    ACTION_REQUIRED: 'Next actions',
  },
  signalDescriptions: {
    COMPLIANCE_EXCEPTION: 'Rejected or retryable compliance results.',
    APPROVAL_REQUIRED: 'Requests waiting for a human decision.',
    BLOCKED_DATA: 'Records missing required operating data.',
    ACTION_REQUIRED: 'Owned records ready for the next task.',
  },
  reasons: {
    CASE_CUSTOMER_MISSING: 'Add the missing customer',
    CASE_PROJECT_MISSING: 'Add the missing project',
    CASE_OWNER_MISSING: 'Assign a case owner',
    DRAFT_DOCUMENT_SUPPLIER_MISSING: 'Add the missing supplier',
    DRAFT_DOCUMENT_ISSUE_DATE_MISSING: 'Add the missing issue date',
    DRAFT_DOCUMENT_CURRENCY_MISSING: 'Add the missing currency',
    DRAFT_DOCUMENT_REVIEW_REQUIRED: 'Review the draft document',
    EXPENSE_REVIEW_REQUIRED: 'Review the pending expense',
    COMPLIANCE_REJECTED: 'Resolve the rejected compliance result',
    COMPLIANCE_RETRYABLE_FAILURE: 'Retry the failed compliance submission',
  },
  stages: {
    intake: 'RFQ received',
    sourcing: 'RFQ to suppliers',
    quoted: 'Quotation to client',
    'customer-order': 'Customer PO',
    'vendor-order': 'Vendor PO',
    delivery: 'Delivery',
    invoicing: 'Client invoice',
    closed: 'Closed',
    cancelled: 'Cancelled',
  },
  deliveryStatuses: {
    notStarted: 'Not started',
    partial: 'Partially delivered',
    full: 'Delivered',
  },
  quotationStatuses: {
    AWAITING_FINALIZED_RESPONSES: 'Awaiting finalized responses',
    INSUFFICIENT_COMPARABLE: 'Insufficient comparable offers',
    INCOMPARABLE: 'Offers are not comparable',
    COMPARABLE: 'Comparable finalized offers available',
  },
  insightTypeLabels: {
    OBSERVATION: 'Observation',
    SUGGESTION: 'Suggestion',
    DATA_QUALITY: 'Data quality',
  },
  insightTypeUnknown: 'Insight',
  confidenceLabels: {
    LOW: 'Low confidence',
    MEDIUM: 'Medium confidence',
    HIGH: 'High confidence',
  },
  confidenceLabel: 'Confidence',
  confidenceUnknown: 'Confidence not recorded',
  generatedLabel: 'Generated',
  generatorLabel: 'Generator',
  sourcesLabel: 'Sources',
  unresolvedSourceLabel: 'Unresolved source identifier',
  openInsightRecord: 'Open insight record',
  noSources: 'No source records recorded',
};

const arabic: CommandCentreCopy = {
  welcomeTitle: 'مرحبًا بكم في MAB Indus Solutions',
  languageName: 'English',
  languageButtonLabel: 'التبديل إلى الإنجليزية',
  dashboardLabel: 'مركز قيادة PxD لعمليات MAB',
  eyebrow: 'مشتريات MAB / العمليات',
  title: 'مركز القيادة',
  subtitle:
    'عرض واحد قائم على الأدلة للمشتريات والتسليم والفوترة والموافقات والعمل التالي المطلوب.',
  refresh: 'تحديث',
  refreshing: 'جارٍ التحديث…',
  loading: 'جارٍ تحميل سجلات MAB المعتمدة…',
  errorTitle: 'تعذر تحميل مركز القيادة',
  noPermissionTitle: 'الوصول إلى مركز القيادة محدود',
  noPermissionBody: 'لا يتيح دور مساحة العمل السجلات المطلوبة لهذا العرض حاليًا.',
  retry: 'إعادة المحاولة',
  emptyTitle: 'لا توجد حالات مشتريات ظاهرة',
  emptyBody: 'لم يتم إرجاع أي سجلات حالات MAB متاحة.',
  partial: (sources) =>
    `أدلة جزئية: ${sources}. تظل القيم الظاهرة مدعومة بمصادرها.`,
  partialSourceLabels: {
    cases: 'حالات المشتريات',
    documents: 'المستندات',
    expenses: 'المصروفات',
    cash: 'النقد المتحقق',
    companies: 'هويات الشركات',
    approvals: 'الموافقات',
    insights: 'الرؤى',
    evidenceSourceLinks: 'روابط مصادر الأدلة',
  },
  queueSummary: 'إشارات التشغيل',
  observed: (value) => `وقت الرصد ${value}`,
  caseCoverage: (visible) => `${visible.toLocaleString('ar-SA')} حالات ظاهرة`,
  caseSelectorLabel: 'الحالة المحددة',
  allCases: 'كل الحالات',
  pipelineTitle: 'مسار عمليات MAB',
  pipelineDescription: 'تستخدم الأعداد مرحلة الحالة المسجلة فقط.',
  stageNotRecorded: 'المرحلة غير مسجلة',
  operationsTitle: 'سجل عمليات الحالات',
  operationsDescription: 'حالات حقيقية مرتبة حسب العمل التالي ثم آخر تحديث.',
  caseLabel: 'الحالة',
  identityLabel: 'العميل / المورّد',
  stageTaskLabel: 'المرحلة / المهمة التالية',
  documentsLabel: 'المستندات',
  quotationLabel: 'حالة عروض الأسعار',
  deliveryInvoiceLabel: 'التسليم / الفاتورة',
  cashLabel: 'النقد المتحقق',
  customerLabel: 'العميل',
  suppliersLabel: 'المورّدون',
  commercialRegistrationLabel: 'السجل التجاري',
  vatRegistrationLabel: 'الرقم الضريبي',
  draftStatus: 'مسودة',
  finalizedStatus: 'نهائي',
  notRecorded: 'غير مسجل',
  unavailableState: 'غير متاح',
  awaitingVerification: 'بانتظار التحقق',
  noPendingApprovals: 'لا توجد موافقات معلقة',
  approvalsTitle: 'الموافقات البشرية',
  approvalsDescription: 'قرارات معلقة ومرتبطة بمصادرها فقط.',
  insightsTitle: 'رؤى الأدلة',
  insightsDescription: 'رؤى نشطة مخزنة من دون نصوص تجريبية.',
  insightsEmpty: 'لا توجد رؤى نشطة',
  insightsEmptyBody: 'لا توجد رؤية تشغيلية نشطة مدعومة بمصدر.',
  capabilityTitle: 'حالة القدرات',
  capabilityDescription: 'تظل القدرات المفقودة واضحة ولا تتم محاكاتها.',
  emailIntakeLabel: 'البريد الإلكتروني المتزامن',
  ocrLabel: 'التعرف الضوئي على المستندات',
  vendorRiskLabel: 'مخاطر المورّد',
  paymentStatusLabel: 'حالة الدفع',
  documentLinesLabel: 'بنود المستند المتحقق منها',
  openRecord: 'فتح السجل',
  finalizedDocuments: (finalized, total) =>
    `${finalized} نهائية / ${total} إجمالي`,
  amountsRecorded: (recorded, total) => `${recorded} من ${total} مجاميع مسجلة`,
  draftEvidence: (invitations, responses) =>
    `${invitations} طلبات عرض مسودة · ${responses} ردود مسودة`,
  finalizedResponses: (invitations, responses) =>
    `${invitations} دعوات نهائية · ${responses} ردود نهائية`,
  invoiceCount: (count) => `${count} فواتير عملاء`,
  verifiedCash: 'نقد متحقق منه بشريًا',
  inflowLabel: 'التدفق الداخل',
  outflowLabel: 'التدفق الخارج',
  netCashLabel: 'الصافي',
  noDeadline: 'لا يوجد موعد مسجل',
  requestedAtLabel: 'طُلبت',
  signals: {
    COMPLIANCE_EXCEPTION: 'استثناءات الامتثال',
    APPROVAL_REQUIRED: 'موافقات معلقة',
    BLOCKED_DATA: 'بيانات معطلة',
    ACTION_REQUIRED: 'الإجراءات التالية',
  },
  signalDescriptions: {
    COMPLIANCE_EXCEPTION: 'نتائج امتثال مرفوضة أو قابلة لإعادة المحاولة.',
    APPROVAL_REQUIRED: 'طلبات تنتظر قرارًا بشريًا.',
    BLOCKED_DATA: 'سجلات تفتقد بيانات تشغيل مطلوبة.',
    ACTION_REQUIRED: 'سجلات مسندة وجاهزة للمهمة التالية.',
  },
  reasons: {
    CASE_CUSTOMER_MISSING: 'إضافة العميل المفقود',
    CASE_PROJECT_MISSING: 'إضافة المشروع المفقود',
    CASE_OWNER_MISSING: 'تعيين مسؤول للحالة',
    DRAFT_DOCUMENT_SUPPLIER_MISSING: 'إضافة المورّد المفقود',
    DRAFT_DOCUMENT_ISSUE_DATE_MISSING: 'إضافة تاريخ الإصدار المفقود',
    DRAFT_DOCUMENT_CURRENCY_MISSING: 'إضافة العملة المفقودة',
    DRAFT_DOCUMENT_REVIEW_REQUIRED: 'مراجعة مسودة المستند',
    EXPENSE_REVIEW_REQUIRED: 'مراجعة المصروف المعلق',
    COMPLIANCE_REJECTED: 'معالجة نتيجة الامتثال المرفوضة',
    COMPLIANCE_RETRYABLE_FAILURE: 'إعادة محاولة إرسال الامتثال الفاشل',
  },
  stages: {
    intake: 'استلام طلب العرض',
    sourcing: 'طلب عروض من المورّدين',
    quoted: 'عرض السعر للعميل',
    'customer-order': 'أمر شراء العميل',
    'vendor-order': 'أمر شراء المورّد',
    delivery: 'التسليم',
    invoicing: 'فاتورة العميل',
    closed: 'مغلقة',
    cancelled: 'ملغاة',
  },
  deliveryStatuses: {
    notStarted: 'لم يبدأ',
    partial: 'تسليم جزئي',
    full: 'تم التسليم',
  },
  quotationStatuses: {
    AWAITING_FINALIZED_RESPONSES: 'بانتظار الردود النهائية',
    INSUFFICIENT_COMPARABLE: 'عروض قابلة للمقارنة غير كافية',
    INCOMPARABLE: 'العروض غير قابلة للمقارنة',
    COMPARABLE: 'تتوفر عروض نهائية قابلة للمقارنة',
  },
  insightTypeLabels: {
    OBSERVATION: 'ملاحظة',
    SUGGESTION: 'اقتراح',
    DATA_QUALITY: 'جودة البيانات',
  },
  insightTypeUnknown: 'رؤية',
  confidenceLabels: {
    LOW: 'ثقة منخفضة',
    MEDIUM: 'ثقة متوسطة',
    HIGH: 'ثقة عالية',
  },
  confidenceLabel: 'درجة الثقة',
  confidenceUnknown: 'درجة الثقة غير مسجلة',
  generatedLabel: 'أُنشئت',
  generatorLabel: 'المولّد',
  sourcesLabel: 'المصادر',
  unresolvedSourceLabel: 'معرف مصدر غير محلول',
  openInsightRecord: 'فتح سجل الرؤية',
  noSources: 'لا توجد سجلات مصادر مسجلة',
};

export const commandCentreCopy: Readonly<
  Record<CommandCentreLocale, CommandCentreCopy>
> = { en: english, ar: arabic };

export const toCommandCentreLocale = (
  locale: string | null | undefined,
): CommandCentreLocale =>
  locale?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
