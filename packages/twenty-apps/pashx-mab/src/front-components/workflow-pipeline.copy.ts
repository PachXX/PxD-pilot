import type {
  PashxCaseDeliveryStatus,
  PashxCommercialDocumentType,
  PashxProcurementCaseStage,
} from 'pashx-mab-contract';

export type WorkflowPipelineLocale = 'en' | 'ar';

export type WorkflowPipelineCopy = Readonly<{
  dashboardLabel: string;
  welcomeTitle: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  languageName: string;
  languageButtonLabel: string;
  refresh: string;
  refreshing: string;
  searchLabel: string;
  searchPlaceholder: string;
  showArchived: string;
  hideArchived: string;
  loading: string;
  errorTitle: string;
  retry: string;
  emptyTitle: string;
  emptyBody: string;
  noSearchResultsTitle: string;
  noSearchResultsBody: string;
  partial: string;
  observed: (value: string) => string;
  summaryLabel: string;
  activeCasesLabel: string;
  overdueCasesLabel: string;
  complianceLabel: string;
  evidenceLabel: string;
  evidenceValue: (finalized: number, total: number) => string;
  casesCount: (count: number) => string;
  emptyColumn: string;
  customerLabel: string;
  projectLabel: string;
  nextActionLabel: string;
  dueLabel: string;
  deliveryLabel: string;
  evidenceCardLabel: string;
  documentsValue: (finalized: number, total: number) => string;
  complianceExceptions: (count: number) => string;
  overdue: string;
  blocked: string;
  noCustomer: string;
  noProject: string;
  noNextAction: string;
  noDueDate: string;
  noFinancialEvidence: string;
  openCase: string;
  openEvidence: string;
  readOnlyTitle: string;
  readOnlyBody: string;
  stages: Readonly<Record<PashxProcurementCaseStage, string>>;
  stageDescriptions: Readonly<Record<PashxProcurementCaseStage, string>>;
  nextActions: Readonly<Record<string, string>>;
  blockedReasons: Readonly<Record<string, string>>;
  deliveryStatuses: Readonly<Record<PashxCaseDeliveryStatus, string>>;
  documentTypes: Readonly<Partial<Record<PashxCommercialDocumentType, string>>>;
}>;

export const workflowPipelineCopy: Readonly<
  Record<WorkflowPipelineLocale, WorkflowPipelineCopy>
> = {
  en: {
    dashboardLabel: 'MAB deals pipeline',
    welcomeTitle: 'MAB Indus Solutions',
    eyebrow: 'PxD · Operations',
    title: 'MAB deals pipeline',
    subtitle:
      'Every MAB deal from RFQ received through vendor quotation, client quotation, client PO, vendor PO, delivery note and invoice, backed by its stored evidence.',
    languageName: 'العربية',
    languageButtonLabel: 'Switch display language',
    refresh: 'Refresh',
    refreshing: 'Refreshing…',
    searchLabel: 'Search cases',
    searchPlaceholder: 'Search case, customer or project',
    showArchived: 'Show closed and cancelled',
    hideArchived: 'Hide closed and cancelled',
    loading: 'Loading the MAB deals pipeline…',
    errorTitle: 'The MAB deals pipeline could not be loaded.',
    retry: 'Try again',
    emptyTitle: 'No procurement cases available',
    emptyBody:
      'No cases are visible for this account. The pipeline does not guess whether the workspace is empty or access is restricted.',
    noSearchResultsTitle: 'No matching cases',
    noSearchResultsBody: 'Change the search or show the archived stages.',
    partial:
      'This pipeline is partial because more records exist than the bounded view can safely display.',
    observed: (value) => `Observed ${value}`,
    summaryLabel: 'Pipeline summary',
    activeCasesLabel: 'Active cases',
    overdueCasesLabel: 'Overdue',
    complianceLabel: 'Compliance exceptions',
    evidenceLabel: 'Finalized evidence',
    evidenceValue: (finalized, total) => `${finalized} of ${total} documents`,
    casesCount: (count) => `${count} cases`,
    emptyColumn: 'No cases at this stage.',
    customerLabel: 'Customer',
    projectLabel: 'Project',
    nextActionLabel: 'Next task',
    dueLabel: 'Due',
    deliveryLabel: 'Delivery',
    evidenceCardLabel: 'Latest financial evidence',
    documentsValue: (finalized, total) => `${finalized}/${total} finalized`,
    complianceExceptions: (count) => `${count} compliance exceptions`,
    overdue: 'Overdue',
    blocked: 'Blocked',
    noCustomer: 'Customer not linked',
    noProject: 'Project not recorded',
    noNextAction: 'No next task recorded',
    noDueDate: 'No due date',
    noFinancialEvidence: 'No finalized financial evidence',
    openCase: 'Open case',
    openEvidence: 'Open evidence',
    readOnlyTitle: 'Pipeline visibility, controlled transitions',
    readOnlyBody:
      'This board is intentionally read-only. Move a case through the audited workflow command so approvals, evidence, idempotency and version checks cannot be bypassed by drag and drop.',
    stages: {
      intake: '1 · RFQ Received',
      sourcing: '2 · Quotation Requested from Vendor',
      quoted: '3 · Quotation Sent to Client',
      'customer-order': '4 · PO Approved from Client',
      'vendor-order': '5 · PO Approved to Vendor',
      delivery: '6 · Delivery Note',
      invoicing: '7 · Invoice',
      closed: 'Closed',
      cancelled: 'Cancelled',
    },
    stageDescriptions: {
      intake: 'Client RFQ received and case opened',
      sourcing: 'Vendor quotations requested and compared',
      quoted: 'MAB quotation sent to the client',
      'customer-order': 'Client approved and PO received',
      'vendor-order': 'Vendor PO approved and issued',
      delivery: 'Goods delivered with delivery-note evidence',
      invoicing: 'Customer invoice issued',
      closed: 'Completed operating chain',
      cancelled: 'Stopped with recorded reason',
    },
    nextActions: {
      REVIEW_DRAFT_DOCUMENT: 'Review draft document',
      REVIEW_PENDING_EXPENSE: 'Review pending expense',
      COMPLETE_CASE_DATA: 'Complete case data',
      COMPLETE_DOCUMENT_DATA: 'Complete document data',
      RESOLVE_COMPLIANCE_EXCEPTION: 'Resolve compliance exception',
    },
    blockedReasons: {
      AWAITING_CUSTOMER_INPUT: 'Awaiting customer input',
      AWAITING_SUPPLIER_RESPONSE: 'Awaiting supplier response',
      AWAITING_INTERNAL_DECISION: 'Awaiting internal decision',
      EXTERNAL_DEPENDENCY: 'External dependency',
    },
    deliveryStatuses: {
      notStarted: 'Not started',
      partial: 'Partial',
      full: 'Full',
    },
    documentTypes: {
      customerInvoice: 'Customer invoice',
      customerPurchaseOrder: 'Client PO',
      customerQuote: 'Customer quotation',
      vendorPurchaseOrder: 'Vendor PO',
      vendorQuote: 'Vendor quotation',
      vendorInvoice: 'Vendor invoice',
    },
  },
  ar: {
    dashboardLabel: 'مسار صفقات MAB',
    welcomeTitle: 'MAB Indus Solutions',
    eyebrow: 'PxD · العمليات',
    title: 'مسار صفقات MAB',
    subtitle:
      'كل صفقة MAB من استلام طلب عرض السعر إلى طلب العرض من المورد، وإرسال العرض للعميل، واعتماد أمر الشراء، وأمر شراء المورد، وإشعار التسليم، والفاتورة، مرتبطة بأدلتها المحفوظة.',
    languageName: 'English',
    languageButtonLabel: 'تغيير لغة العرض',
    refresh: 'تحديث',
    refreshing: 'جارٍ التحديث…',
    searchLabel: 'البحث في الحالات',
    searchPlaceholder: 'ابحث عن الحالة أو العميل أو المشروع',
    showArchived: 'إظهار المغلق والملغي',
    hideArchived: 'إخفاء المغلق والملغي',
    loading: 'جارٍ تحميل مسار صفقات MAB…',
    errorTitle: 'تعذر تحميل مسار صفقات MAB.',
    retry: 'إعادة المحاولة',
    emptyTitle: 'لا توجد حالات مشتريات متاحة',
    emptyBody:
      'لا توجد حالات ظاهرة لهذا الحساب. لا يفترض النظام أن مساحة العمل فارغة أو أن الوصول مقيّد.',
    noSearchResultsTitle: 'لا توجد حالات مطابقة',
    noSearchResultsBody: 'غيّر البحث أو أظهر المراحل المؤرشفة.',
    partial:
      'هذا المسار جزئي لأن عدد السجلات أكبر من الحد الآمن للعرض.',
    observed: (value) => `وقت الرصد ${value}`,
    summaryLabel: 'ملخص مسار العمل',
    activeCasesLabel: 'الحالات النشطة',
    overdueCasesLabel: 'متأخرة',
    complianceLabel: 'استثناءات الامتثال',
    evidenceLabel: 'الأدلة النهائية',
    evidenceValue: (finalized, total) => `${finalized} من ${total} مستندات`,
    casesCount: (count) => `${count} حالات`,
    emptyColumn: 'لا توجد حالات في هذه المرحلة.',
    customerLabel: 'العميل',
    projectLabel: 'المشروع',
    nextActionLabel: 'المهمة التالية',
    dueLabel: 'الاستحقاق',
    deliveryLabel: 'التسليم',
    evidenceCardLabel: 'أحدث دليل مالي',
    documentsValue: (finalized, total) => `${finalized}/${total} نهائي`,
    complianceExceptions: (count) => `${count} استثناءات امتثال`,
    overdue: 'متأخرة',
    blocked: 'متوقفة',
    noCustomer: 'العميل غير مرتبط',
    noProject: 'المشروع غير مسجل',
    noNextAction: 'لا توجد مهمة تالية مسجلة',
    noDueDate: 'لا يوجد تاريخ استحقاق',
    noFinancialEvidence: 'لا يوجد دليل مالي نهائي',
    openCase: 'فتح الحالة',
    openEvidence: 'فتح الدليل',
    readOnlyTitle: 'رؤية واضحة وانتقالات منضبطة',
    readOnlyBody:
      'هذه اللوحة للقراءة فقط. انقل الحالة عبر أمر سير العمل المدقق حتى لا يتجاوز السحب والإفلات الموافقات والأدلة ومفتاح منع التكرار وفحص الإصدار.',
    stages: {
      intake: '١ · استلام طلب عرض السعر',
      sourcing: '٢ · طلب عرض السعر من المورد',
      quoted: '٣ · إرسال العرض للعميل',
      'customer-order': '٤ · اعتماد أمر الشراء من العميل',
      'vendor-order': '٥ · اعتماد أمر الشراء للمورد',
      delivery: '٦ · إشعار التسليم',
      invoicing: '٧ · الفاتورة',
      closed: 'مغلقة',
      cancelled: 'ملغاة',
    },
    stageDescriptions: {
      intake: 'استلام طلب عرض السعر من العميل وفتح الحالة',
      sourcing: 'طلب عروض الموردين ومقارنتها',
      quoted: 'إرسال عرض MAB إلى العميل',
      'customer-order': 'موافقة العميل واستلام أمر الشراء',
      'vendor-order': 'اعتماد أمر شراء المورد وإصداره',
      delivery: 'تسليم البضائع مع دليل إشعار التسليم',
      invoicing: 'إصدار فاتورة العميل',
      closed: 'اكتمال دورة التشغيل',
      cancelled: 'إيقاف مع سبب مسجل',
    },
    nextActions: {
      REVIEW_DRAFT_DOCUMENT: 'مراجعة مستند مسودة',
      REVIEW_PENDING_EXPENSE: 'مراجعة مصروف معلق',
      COMPLETE_CASE_DATA: 'استكمال بيانات الحالة',
      COMPLETE_DOCUMENT_DATA: 'استكمال بيانات المستند',
      RESOLVE_COMPLIANCE_EXCEPTION: 'معالجة استثناء الامتثال',
    },
    blockedReasons: {
      AWAITING_CUSTOMER_INPUT: 'بانتظار بيانات العميل',
      AWAITING_SUPPLIER_RESPONSE: 'بانتظار رد المورد',
      AWAITING_INTERNAL_DECISION: 'بانتظار قرار داخلي',
      EXTERNAL_DEPENDENCY: 'اعتماد خارجي',
    },
    deliveryStatuses: {
      notStarted: 'لم يبدأ',
      partial: 'جزئي',
      full: 'مكتمل',
    },
    documentTypes: {
      customerInvoice: 'فاتورة العميل',
      customerPurchaseOrder: 'أمر شراء العميل',
      customerQuote: 'عرض العميل',
      vendorPurchaseOrder: 'أمر شراء المورد',
      vendorQuote: 'عرض المورد',
      vendorInvoice: 'فاتورة المورد',
    },
  },
};

export const toWorkflowPipelineLocale = (
  locale: string | null | undefined,
): WorkflowPipelineLocale =>
  locale?.toLowerCase().startsWith('ar') === true ? 'ar' : 'en';
