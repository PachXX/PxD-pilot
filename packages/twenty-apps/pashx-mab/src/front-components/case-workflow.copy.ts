import type {
  PashxCaseDeliveryStatus,
  PashxProcurementCaseStage,
} from 'pashx-mab-contract';

import type {
  CaseWorkflowInvoiceMissingReason,
  CaseWorkflowStageState,
} from '../case-workflow/case-workflow.types';

export type CaseWorkflowLocale = 'en' | 'ar';

export type CaseWorkflowCopy = Readonly<{
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
  partial: string;
  languageName: string;
  languageButtonLabel: string;
  observed: (value: string) => string;
  caseCoverage: (visible: number) => string;
  casesTitle: string;
  casesDescription: string;
  selectCaseHint: string;
  noCaseSelectedTitle: string;
  noCaseSelectedBody: string;
  caseLinkLabel: string;
  processRailTitle: string;
  processRailDescription: string;
  documentsTitle: string;
  documentsDescription: string;
  documentLabel: string;
  documentTypeLabel: string;
  lifecycleLabel: string;
  issueDateLabel: string;
  totalLabel: string;
  priceComparisonTitle: string;
  priceComparisonDescription: string;
  supplierLabel: string;
  noSupplier: string;
  noQuotesBody: string;
  deterministicNote: string;
  deliveryTitle: string;
  deliveryDescription: string;
  deliveryStatusLabel: string;
  deliveryDueLabel: string;
  deliveryNotesLabel: string;
  noDeliveryNotes: string;
  invoiceReadinessTitle: string;
  invoiceReadinessDescription: string;
  readinessDerivesFrom: string;
  gateLabels: Readonly<Record<CaseWorkflowInvoiceMissingReason, string>>;
  gateSatisfied: string;
  gateMissing: string;
  stages: Readonly<Record<PashxProcurementCaseStage, string>>;
  stageStates: Readonly<Record<CaseWorkflowStageState, string>>;
  deliveryStatuses: Readonly<Record<PashxCaseDeliveryStatus, string>>;
  lifecycleStatuses: Readonly<Record<string, string>>;
  documentTypeLabels: Readonly<Record<string, string>>;
  unknownDocumentType: string;
  noDeadline: string;
  openRecord: string;
  openSupplier: string;
  draftLabel: string;
  finalizedLabel: string;
}>;

export const caseWorkflowCopy: Readonly<
  Record<CaseWorkflowLocale, CaseWorkflowCopy>
> = {
  en: {
    dashboardLabel: 'Procurement case workflow',
    welcomeTitle: 'MAB Indus Solutions',
    eyebrow: 'PxD · MAB pilot',
    title: 'Case workflow',
    subtitle:
      'One procurement case, read from the authoritative chain: RFQ through comparison, approval, procurement, delivery and invoicing.',
    refresh: 'Refresh',
    refreshing: 'Refreshing…',
    loading: 'Loading the case workflow ledger…',
    errorTitle: 'The case workflow could not be loaded.',
    retry: 'Try again',
    emptyTitle: 'No procurement cases yet',
    emptyBody:
      'Create a case to see its operating chain here. The view stays read-only; stages move only through permission-checked commands.',
    partial: 'Result is partial: more records exist than this bounded view shows.',
    languageName: 'العربية',
    languageButtonLabel: 'Switch display language',
    observed: (value) => `Observed ${value}`,
    caseCoverage: (visible) => `${visible} cases visible`,
    casesTitle: 'Procurement cases',
    casesDescription:
      'Select a case to inspect its operating chain. Links open the native records.',
    selectCaseHint: 'Select a case',
    noCaseSelectedTitle: 'Select a case to inspect',
    noCaseSelectedBody:
      'The process rail, documents, price comparison, delivery and invoice readiness appear here for the selected case.',
    caseLinkLabel: 'Open case record',
    processRailTitle: 'Process rail',
    processRailDescription:
      'Authoritative stage position from the frozen operating workflow.',
    documentsTitle: 'Documents',
    documentsDescription:
      'Every document role carried by this case, with lifecycle and evidence links.',
    documentLabel: 'Document',
    documentTypeLabel: 'Role',
    lifecycleLabel: 'Lifecycle',
    issueDateLabel: 'Issue date',
    totalLabel: 'Total',
    priceComparisonTitle: 'Price comparison',
    priceComparisonDescription:
      'Supplier quotations ranked deterministically: finalized first, then ascending total, then reference.',
    supplierLabel: 'Supplier',
    noSupplier: 'No supplier linked',
    noQuotesBody: 'No vendor quotations recorded for this case.',
    deterministicNote:
      'Ranking is deterministic from stored evidence; no external service participates.',
    deliveryTitle: 'Delivery',
    deliveryDescription:
      'Delivery progress recorded by the delivery command; evidence is the finalized delivery note.',
    deliveryStatusLabel: 'Status',
    deliveryDueLabel: 'Due',
    deliveryNotesLabel: 'Delivery notes',
    noDeliveryNotes: 'No delivery note recorded for this case.',
    invoiceReadinessTitle: 'Invoice readiness',
    invoiceReadinessDescription:
      'Eligibility derives from finalized evidence only: an approved and delivered customer order, a finalized delivery note, and the finalized customer invoice.',
    readinessDerivesFrom:
      'Readiness is derived; it never changes compliance state or finalizes records.',
    gateLabels: {
      'missing-finalized-customer-purchase-order': 'Finalized customer purchase order',
      'missing-finalized-delivery-note': 'Finalized delivery note',
      'missing-finalized-customer-invoice': 'Finalized customer invoice',
    },
    gateSatisfied: 'Present',
    gateMissing: 'Missing',
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
    stageStates: {
      complete: 'Complete',
      current: 'Current',
      upcoming: 'Upcoming',
      cancelled: 'Cancelled',
    },
    deliveryStatuses: {
      notStarted: 'Not started',
      partial: 'Partial',
      full: 'Full',
    },
    lifecycleStatuses: {
      DRAFT: 'Draft',
      FINALIZED: 'Finalized',
      CANCELLED: 'Cancelled',
      CREDITED: 'Credited',
    },
    documentTypeLabels: {
      customerRfq: 'Customer RFQ',
      supplierRfq: 'Supplier RFQ',
      vendorQuote: 'Vendor quotation',
      customerQuote: 'Customer quotation',
      customerPurchaseOrder: 'Customer purchase order',
      vendorPurchaseOrder: 'Vendor purchase order',
      deliveryNote: 'Delivery note',
      vendorInvoice: 'Vendor invoice',
      customerInvoice: 'Customer invoice',
      customerCreditNote: 'Customer credit note',
      vendorCreditNote: 'Vendor credit note',
    },
    unknownDocumentType: 'Unmapped document role',
    noDeadline: 'No due date',
    openRecord: 'Open record',
    openSupplier: 'Open supplier',
    draftLabel: 'Draft',
    finalizedLabel: 'Finalized',
  },
  ar: {
    dashboardLabel: 'مسار سير حالة الشراء',
    welcomeTitle: 'حلول مباندس',
    eyebrow: 'PxD · تجربة مباندس',
    title: 'مسار سير الحالة',
    subtitle:
      'حالة شراء واحدة مقروءة من السلسلة الموثوقة: من طلب العرض مروراً بالمقارنة والاعتماد والشراء والتوريد وحتى الفوترة.',
    refresh: 'تحديث',
    refreshing: 'جارٍ التحديث…',
    loading: 'جارٍ تحميل سجل مسار الحالة…',
    errorTitle: 'تعذر تحميل مسار سير الحالة.',
    retry: 'حاول مرة أخرى',
    emptyTitle: 'لا توجد حالات شراء بعد',
    emptyBody:
      'أنشئ حالة لعرض سلسلتها التشغيلية هنا. تبقى الشاشة للقراءة فقط؛ ولا تنتقل المراحل إلا عبر أوامر مقيّدة بالصلاحيات.',
    partial: 'النتيجة جزئية: توجد سجلات أكثر مما تعرضه هذه الشاشة المحدودة.',
    languageName: 'English',
    languageButtonLabel: 'تبديل لغة العرض',
    observed: (value) => `تمت الملاحظة ${value}`,
    caseCoverage: (visible) => `${visible} حالة ظاهرة`,
    casesTitle: 'حالات الشراء',
    casesDescription:
      'اختر حالة لفحص سلسلتها التشغيلية. تفتح الروابط السجلات الأصلية.',
    selectCaseHint: 'اختر حالة',
    noCaseSelectedTitle: 'اختر حالة لفحصها',
    noCaseSelectedBody:
      'يظهر هنا مسار المراحل والمستندات ومقارنة الأسعار والتوريد وجاهزية الفوترة للحالة المختارة.',
    caseLinkLabel: 'فتح سجل الحالة',
    processRailTitle: 'مسار المراحل',
    processRailDescription: 'موضع المرحلة الموثوق من مسار العمل التشغيلي المعتمد.',
    documentsTitle: 'المستندات',
    documentsDescription: 'كل دور مستند تحمله هذه الحالة مع دورة حياته وروابط الأدلة.',
    documentLabel: 'المستند',
    documentTypeLabel: 'الدور',
    lifecycleLabel: 'دورة الحياة',
    issueDateLabel: 'تاريخ الإصدار',
    totalLabel: 'الإجمالي',
    priceComparisonTitle: 'مقارنة الأسعار',
    priceComparisonDescription:
      'عروض الموردين مرتبة حتمياً: المعتمد أولاً ثم الإجمالي تصاعدياً ثم المرجع.',
    supplierLabel: 'المورد',
    noSupplier: 'لا يوجد مورد مرتبط',
    noQuotesBody: 'لا توجد عروض موردين مسجلة لهذه الحالة.',
    deterministicNote:
      'الترتيب حتمي من الأدلة المخزنة؛ ولا تشارك أي خدمة خارجية.',
    deliveryTitle: 'التوريد',
    deliveryDescription:
      'تقدم التوريد المسجل عبر أمر التوريد؛ والدليل هو إشعار التسليم المعتمد.',
    deliveryStatusLabel: 'الحالة',
    deliveryDueLabel: 'الاستحقاق',
    deliveryNotesLabel: 'إشعارات التسليم',
    noDeliveryNotes: 'لا يوجد إشعار تسليم مسجل لهذه الحالة.',
    invoiceReadinessTitle: 'جاهزية الفوترة',
    invoiceReadinessDescription:
      'تشتق الأهلية من الأدلة المعتمدة فقط: أمر شراء عميل معتمد ومستلم، وإشعار تسليم معتمد، وفاتورة العميل المعتمدة.',
    readinessDerivesFrom:
      'الجاهزية قيمة مشتقة؛ ولا تغيّر حالة الامتثال ولا تعتمد أي سجلات.',
    gateLabels: {
      'missing-finalized-customer-purchase-order': 'أمر شراء العميل المعتمد',
      'missing-finalized-delivery-note': 'إشعار التسليم المعتمد',
      'missing-finalized-customer-invoice': 'فاتورة العميل المعتمدة',
    },
    gateSatisfied: 'متوفر',
    gateMissing: 'ناقص',
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
    stageStates: {
      complete: 'مكتملة',
      current: 'الحالية',
      upcoming: 'قادمة',
      cancelled: 'ملغاة',
    },
    deliveryStatuses: {
      notStarted: 'لم تبدأ',
      partial: 'جزئي',
      full: 'كامل',
    },
    lifecycleStatuses: {
      DRAFT: 'مسودة',
      FINALIZED: 'معتمد',
      CANCELLED: 'ملغى',
      CREDITED: 'مُقيد',
    },
    documentTypeLabels: {
      customerRfq: 'طلب عرض العميل',
      supplierRfq: 'طلب عرض المورد',
      vendorQuote: 'عرض المورد',
      customerQuote: 'عرض العميل',
      customerPurchaseOrder: 'أمر شراء العميل',
      vendorPurchaseOrder: 'أمر شراء المورد',
      deliveryNote: 'إشعار تسليم',
      vendorInvoice: 'فاتورة المورد',
      customerInvoice: 'فاتورة العميل',
      customerCreditNote: 'إشعار دائن للعميل',
      vendorCreditNote: 'إشعار دائن للمورد',
    },
    unknownDocumentType: 'دور مستند غير معرّف',
    noDeadline: 'لا يوجد موعد استحقاق',
    openRecord: 'فتح السجل',
    openSupplier: 'فتح المورد',
    draftLabel: 'مسودة',
    finalizedLabel: 'معتمد',
  },
};

export const toCaseWorkflowLocale = (locale: string | null): CaseWorkflowLocale =>
  locale === 'ar' ? 'ar' : 'en';
