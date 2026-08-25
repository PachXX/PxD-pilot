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
    dashboardLabel: 'MAB workflow pipeline',
    welcomeTitle: 'MAB Indus Solutions',
    eyebrow: 'PxD · Operations',
    title: 'MAB workflow pipeline',
    subtitle:
      'Every procurement case from client RFQ through supplier sourcing, quotation, purchase, delivery and invoicing, backed by its stored evidence.',
    languageName: 'العربية',
    languageButtonLabel: 'Switch display language',
    refresh: 'Refresh',
    refreshing: 'Refreshing…',
    searchLabel: 'Search cases',
    searchPlaceholder: 'Search case, customer or project',
    showArchived: 'Show closed and cancelled',
    hideArchived: 'Hide closed and cancelled',
    loading: 'Loading the MAB workflow pipeline…',
    errorTitle: 'The MAB workflow pipeline could not be loaded.',
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
      intake: '1 · Client RFQ',
      sourcing: '2 · Supplier sourcing',
      quoted: '3 · Quotation to client',
      'customer-order': '4 · Client PO',
      'vendor-order': '5 · Vendor procurement',
      delivery: '6 · Delivery',
      invoicing: '7 · Client invoice',
      closed: 'Closed',
      cancelled: 'Cancelled',
    },
    stageDescriptions: {
      intake: 'RFQ received from the client',
      sourcing: 'Supplier RFQs and price comparison',
      quoted: 'MAB quotation issued to the client',
      'customer-order': 'Client approval and PO received',
      'vendor-order': 'Vendor PO issued for procurement',
      delivery: 'Goods and delivery-note evidence',
      invoicing: 'Customer invoice and billing readiness',
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
    dashboardLabel: 'مسار عمل MAB',
    welcomeTitle: 'MAB Indus Solutions',
    eyebrow: 'PxD · العمليات',
    title: 'مسار عمل MAB',
    subtitle:
      'كل حالة مشتريات من طلب عرض السعر للعميل إلى توريد الموردين والعرض والشراء والتسليم والفوترة، مرتبطة بأدلتها المحفوظة.',
    languageName: 'English',
    languageButtonLabel: 'تغيير لغة العرض',
    refresh: 'تحديث',
    refreshing: 'جارٍ التحديث…',
    searchLabel: 'البحث في الحالات',
    searchPlaceholder: 'ابحث عن الحالة أو العميل أو المشروع',
    showArchived: 'إظهار المغلق والملغي',
    hideArchived: 'إخفاء المغلق والملغي',
    loading: 'جارٍ تحميل مسار عمل MAB…',
    errorTitle: 'تعذر تحميل مسار عمل MAB.',
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
      intake: '١ · طلب العميل',
      sourcing: '٢ · توريد الموردين',
      quoted: '٣ · العرض للعميل',
      'customer-order': '٤ · أمر شراء العميل',
      'vendor-order': '٥ · شراء المورد',
      delivery: '٦ · التسليم',
      invoicing: '٧ · فاتورة العميل',
      closed: 'مغلقة',
      cancelled: 'ملغاة',
    },
    stageDescriptions: {
      intake: 'استلام طلب عرض السعر من العميل',
      sourcing: 'طلبات الموردين ومقارنة الأسعار',
      quoted: 'إصدار عرض MAB للعميل',
      'customer-order': 'موافقة العميل واستلام أمر الشراء',
      'vendor-order': 'إصدار أمر شراء المورد',
      delivery: 'البضائع ودليل إشعار التسليم',
      invoicing: 'فاتورة العميل وجاهزية الفوترة',
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
