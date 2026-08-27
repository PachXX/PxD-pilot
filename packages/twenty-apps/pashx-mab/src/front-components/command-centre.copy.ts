import type {
  PashxCommandCentreReasonCode,
  PashxEmailIntakeTaskType,
  PashxInsightConfidence,
  PashxInsightType,
  PashxOperationalWorkSignal,
  PashxProcurementCaseStage,
} from 'pashx-mab-contract';

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
  retry: string;
  emptyTitle: string;
  emptyBody: string;
  partial: string;
  queueSummary: string;
  priorityWork: string;
  priorityWorkDescription: string;
  insightsTitle: string;
  insightsDescription: string;
  insightsEmpty: string;
  insightsEmptyBody: string;
  unavailableTitle: string;
  unavailableBody: string;
  unavailableState: string;
  emailIntakeLabel: string;
  emailIntakeDescription: string;
  emailLoading: string;
  emailError: string;
  emailPartial: string;
  emailCandidatesEmpty: string;
  emailCandidatesEmptyBody: string;
  emailReviewStatusLabel: string;
  emailPendingReview: string;
  emailTaskLabel: string;
  emailTaskUnknown: string;
  emailTaskLabels: Readonly<Record<PashxEmailIntakeTaskType, string>>;
  emailSenderLabel: string;
  emailReceivedLabel: string;
  emailOpenMessage: string;
  ocrLabel: string;
  ocrUnavailableReason: string;
  queueCoverage: (visible: number) => string;
  priorityLabel: string;
  requiredActionLabel: string;
  evidenceLabel: string;
  observed: (value: string) => string;
  signals: Readonly<Record<PashxOperationalWorkSignal, string>>;
  signalDescriptions: Readonly<Record<PashxOperationalWorkSignal, string>>;
  reasons: Readonly<Record<PashxCommandCentreReasonCode, string>>;
  stages: Readonly<Record<PashxProcurementCaseStage, string>>;
  insightTypeLabels: Readonly<Record<PashxInsightType, string>>;
  insightTypeUnknown: string;
  confidenceLabels: Readonly<Record<PashxInsightConfidence, string>>;
  confidenceLabel: string;
  confidenceUnknown: string;
  generatedLabel: string;
  generatorLabel: string;
  sourcesLabel: string;
  sourceIdsPlainLabel: string;
  openInsightRecord: string;
  noSources: string;
  requestedActionPrefix: string;
  approvalPendingLabel: string;
  requestedAtLabel: string;
  caseLabel: string;
  stageLabel: string;
  ownerLabel: string;
  dueLabel: string;
  noStage: string;
  unassigned: string;
  noDeadline: string;
  openEvidence: string;
}>;

const english: CommandCentreCopy = {
  welcomeTitle: 'Welcome, MAB Indus Solutions',
  languageName: 'العربية',
  languageButtonLabel: 'Switch to Arabic',
  dashboardLabel: 'PxD Command centre',
  eyebrow: 'MAB procurement / Work',
  title: 'Command centre',
  subtitle:
    'A deterministic queue of compliance exceptions, pending approvals, blocked data, and your current actions.',
  refresh: 'Refresh queue',
  refreshing: 'Refreshing…',
  loading: 'Loading authoritative work records…',
  errorTitle: 'The work queue could not be loaded',
  retry: 'Retry',
  emptyTitle: "You're caught up",
  emptyBody:
    'No supported compliance, approval, blocked-data, or action signals are present.',
  partial:
    'The bounded read reached its limit. Visible items remain valid, but the queue is partial.',
  queueSummary: 'Work queue summary',
  priorityWork: 'Priority work',
  priorityWorkDescription:
    'Ordered by compliance, approvals, blocked data, then your current actions.',
  insightsTitle: 'Evidence insights',
  insightsDescription:
    'Active stored insights with their generated time, confidence, and source records.',
  insightsEmpty: 'No active insights',
  insightsEmptyBody:
    'Insights appear here once the evidence analyst generates them from MAB records.',
  unavailableTitle: 'Capability status',
  unavailableBody:
    'Blocked capabilities appear honestly. Nothing here is simulated or enabled.',
  unavailableState: 'Unavailable',
  emailIntakeLabel: 'Synchronized email',
  emailIntakeDescription:
    'Review-only candidates from synchronized email. Nothing is created, sent, or deleted; a human reviews before any record is created.',
  emailLoading: 'Loading email candidates…',
  emailError: 'Email candidates could not be loaded',
  emailPartial:
    'The bounded email read reached its limit. Visible candidates are valid, but the list is partial.',
  emailCandidatesEmpty: 'No email candidates',
  emailCandidatesEmptyBody:
    'Candidates appear here when synchronized inbound mail matches a supported task type.',
  emailReviewStatusLabel: 'Review status',
  emailPendingReview: 'Pending review',
  emailTaskLabel: 'Proposed task',
  emailTaskUnknown: 'Unclassified',
  emailTaskLabels: {
    PREPARE_QUOTATION: 'Prepare quotation',
    CAPTURE_PURCHASE_ORDER: 'Capture purchase order',
    CAPTURE_DELIVERY_NOTE: 'Capture delivery note',
    CAPTURE_INVOICE: 'Capture invoice',
  },
  emailSenderLabel: 'Sender',
  emailReceivedLabel: 'Received',
  emailOpenMessage: 'Open message record',
  ocrLabel: 'Document OCR',
  ocrUnavailableReason:
    'OCR extraction is unavailable until a provider passes the frozen benchmark and is accepted (OC5-OCR).',
  queueCoverage: (visible) => `${visible.toLocaleString('en-GB')} visible records`,
  priorityLabel: 'Priority',
  requiredActionLabel: 'Required action',
  evidenceLabel: 'Evidence',
  observed: (value) => `Observed ${value}`,
  signals: {
    COMPLIANCE_EXCEPTION: 'Compliance exceptions',
    APPROVAL_REQUIRED: 'Pending approvals',
    BLOCKED_DATA: 'Blocked data',
    ACTION_REQUIRED: 'Your actions',
  },
  signalDescriptions: {
    COMPLIANCE_EXCEPTION:
      'Rejected or retryable compliance states that need resolution.',
    APPROVAL_REQUIRED:
      'Approval requests pending a human decision.',
    BLOCKED_DATA:
      'Records that cannot progress because required data is missing.',
    ACTION_REQUIRED: 'Complete records owned by you and ready for review.',
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
  sourceIdsPlainLabel: 'Source IDs without a resolvable record type',
  openInsightRecord: 'Open insight record',
  noSources: 'No source records recorded',
  requestedActionPrefix: 'Requested action',
  approvalPendingLabel: 'Pending approval',
  requestedAtLabel: 'Requested',
  caseLabel: 'Case',
  stageLabel: 'Stage',
  ownerLabel: 'Owner / approver',
  dueLabel: 'Due',
  noStage: 'Not recorded',
  unassigned: 'Unassigned',
  noDeadline: 'No deadline',
  openEvidence: 'Open evidence record',
};

const arabic: CommandCentreCopy = {
  welcomeTitle: 'مرحبًا بكم في MAB Indus Solutions',
  languageName: 'English',
  languageButtonLabel: 'التبديل إلى الإنجليزية',
  dashboardLabel: 'مركز قيادة PxD',
  eyebrow: 'مشتريات MAB / العمل',
  title: 'مركز القيادة',
  subtitle:
    'قائمة حتمية لاستثناءات الامتثال والموافقات المعلقة والبيانات المعطلة وإجراءاتك الحالية.',
  refresh: 'تحديث قائمة العمل',
  refreshing: 'جارٍ التحديث…',
  loading: 'جارٍ تحميل سجلات العمل المعتمدة…',
  errorTitle: 'تعذر تحميل قائمة العمل',
  retry: 'إعادة المحاولة',
  emptyTitle: 'لا توجد أعمال معلقة',
  emptyBody:
    'لا توجد إشارات امتثال أو موافقات أو بيانات معطلة أو إجراءات مدعومة حاليًا.',
  partial: 'وصلت القراءة المحدودة إلى حدها. العناصر الظاهرة صحيحة لكن القائمة جزئية.',
  queueSummary: 'ملخص قائمة العمل',
  priorityWork: 'العمل ذو الأولوية',
  priorityWorkDescription:
    'مرتبة حسب الامتثال ثم الموافقات ثم البيانات المعطلة ثم إجراءاتك الحالية.',
  insightsTitle: 'رؤى الأدلة',
  insightsDescription:
    'رؤى نشطة مخزنة مع وقت إنشائها ودرجة ثقتها وسجلات مصادرها.',
  insightsEmpty: 'لا توجد رؤى نشطة',
  insightsEmptyBody: 'تظهر الرؤى هنا عندما ينشئها محلل الأدلة من سجلات MAB.',
  unavailableTitle: 'حالة القدرات',
  unavailableBody: 'تظهر القدرات المحظورة بصدق. لا شيء هنا مُحاكى أو مُفعّل.',
  unavailableState: 'غير متاحة',
  emailIntakeLabel: 'البريد الإلكتروني المتزامن',
  emailIntakeDescription:
    'مرشحات للمراجعة فقط من البريد الإلكتروني المتزامن. لا يُنشأ أو يُرسل أو يُحذف أي شيء؛ يراجع الإنسان قبل إنشاء أي سجل.',
  emailLoading: 'جارٍ تحميل مرشحات البريد الإلكتروني…',
  emailError: 'تعذر تحميل مرشحات البريد الإلكتروني',
  emailPartial:
    'وصلت قراءة البريد المحدودة إلى حدها. المرشحات الظاهرة صحيحة لكن القائمة جزئية.',
  emailCandidatesEmpty: 'لا توجد مرشحات بريد إلكتروني',
  emailCandidatesEmptyBody:
    'تظهر المرشحات هنا عندما يتطابق البريد الوارد المتزامن مع نوع مهمة مدعوم.',
  emailReviewStatusLabel: 'حالة المراجعة',
  emailPendingReview: 'بانتظار المراجعة',
  emailTaskLabel: 'المهمة المقترحة',
  emailTaskUnknown: 'غير مصنّف',
  emailTaskLabels: {
    PREPARE_QUOTATION: 'تحضير عرض سعر',
    CAPTURE_PURCHASE_ORDER: 'التقاط أمر الشراء',
    CAPTURE_DELIVERY_NOTE: 'التقاط إشعار التسليم',
    CAPTURE_INVOICE: 'التقاط الفاتورة',
  },
  emailSenderLabel: 'المرسل',
  emailReceivedLabel: 'تاريخ الاستلام',
  emailOpenMessage: 'فتح سجل الرسالة',
  ocrLabel: 'التعرف الضوئي على المستندات (OCR)',
  ocrUnavailableReason:
    'استخراج OCR غير متاح حتى يجتاز مزوّد ما المعيار المجمّد ويُعتمد (OC5-OCR).',
  queueCoverage: (visible) => `${visible.toLocaleString('ar-SA')} سجلات ظاهرة`,
  priorityLabel: 'الأولوية',
  requiredActionLabel: 'الإجراء المطلوب',
  evidenceLabel: 'الدليل',
  observed: (value) => `وقت الرصد ${value}`,
  signals: {
    COMPLIANCE_EXCEPTION: 'استثناءات الامتثال',
    APPROVAL_REQUIRED: 'موافقات معلقة',
    BLOCKED_DATA: 'بيانات معطلة',
    ACTION_REQUIRED: 'إجراءاتك',
  },
  signalDescriptions: {
    COMPLIANCE_EXCEPTION:
      'حالات امتثال مرفوضة أو قابلة لإعادة المحاولة وتتطلب المعالجة.',
    APPROVAL_REQUIRED: 'طلبات موافقة تنتظر قرارًا بشريًا.',
    BLOCKED_DATA: 'سجلات لا يمكنها التقدم بسبب نقص بيانات مطلوبة.',
    ACTION_REQUIRED: 'سجلات مكتملة ومسندة إليك وجاهزة للمراجعة.',
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
    intake: 'الاستلام',
    sourcing: 'التوريد',
    quoted: 'تم التسعير',
    'customer-order': 'أمر العميل',
    'vendor-order': 'أمر المورّد',
    delivery: 'التسليم',
    invoicing: 'الفوترة',
    closed: 'مغلقة',
    cancelled: 'ملغاة',
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
  sourceIdsPlainLabel: 'معرفات مصادر بدون نوع سجل قابل للحل',
  openInsightRecord: 'فتح سجل الرؤية',
  noSources: 'لا توجد سجلات مصادر مسجلة',
  requestedActionPrefix: 'الإجراء المطلوب',
  approvalPendingLabel: 'موافقة معلقة',
  requestedAtLabel: 'الطلب',
  caseLabel: 'الحالة',
  stageLabel: 'المرحلة',
  ownerLabel: 'المسؤول / الموافق',
  dueLabel: 'الاستحقاق',
  noStage: 'غير مسجلة',
  unassigned: 'غير معيّن',
  noDeadline: 'لا يوجد موعد',
  openEvidence: 'فتح سجل الدليل',
};

export const commandCentreCopy: Readonly<
  Record<CommandCentreLocale, CommandCentreCopy>
> = { en: english, ar: arabic };

export const toCommandCentreLocale = (
  locale: string | null | undefined,
): CommandCentreLocale => (locale?.toLowerCase().startsWith('ar') ? 'ar' : 'en');
