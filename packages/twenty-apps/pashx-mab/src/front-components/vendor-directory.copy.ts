import type { PashxProcurementCaseStage } from 'pashx-mab-contract';

export type VendorDirectoryLocale = 'en' | 'ar';

export type VendorDirectoryCopy = Readonly<{
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
  vendorCoverage: (visible: number) => string;
  directoryTitle: string;
  directoryDescription: string;
  vendorLabel: string;
  crLabel: string;
  vatLabel: string;
  noCr: string;
  noVat: string;
  openRfqLabel: string;
  repliedLabel: string;
  activeCasesLabel: string;
  noActiveCases: string;
  requestRfqTitle: string;
  requestRfqDescription: string;
  caseSelectLabel: string;
  selectCaseHint: string;
  noEligibleCases: string;
  vendorSelectLabel: string;
  noVendorsSelected: string;
  dueDateLabel: string;
  dueDateHint: string;
  submitRfq: string;
  submittingRfq: string;
  submitSuccess: string;
  submitFailed: string;
  noOutboundBoundary: string;
  outboundUnavailable: string;
  openCompany: string;
  openCase: string;
  stages: Readonly<Record<PashxProcurementCaseStage, string>>;
}>;

export const vendorDirectoryCopy: Readonly<
  Record<VendorDirectoryLocale, VendorDirectoryCopy>
> = {
  en: {
    dashboardLabel: 'Vendor directory',
    welcomeTitle: 'MAB Indus Solutions',
    eyebrow: 'PxD · MAB pilot',
    title: 'Vendors',
    subtitle:
      'Every existing supplier in one directory, with its RFQ activity, plus a request flow that creates supplier RFQ documents against a client requirement.',
    refresh: 'Refresh',
    refreshing: 'Refreshing…',
    loading: 'Loading the vendor directory…',
    errorTitle: 'The vendor directory could not be loaded.',
    retry: 'Try again',
    emptyTitle: 'No suppliers yet',
    emptyBody:
      'Suppliers appear here when a company carries the MAB supplier role. The view stays read-only except the RFQ request action.',
    partial: 'Result is partial: more records exist than this bounded view shows.',
    languageName: 'العربية',
    languageButtonLabel: 'Switch display language',
    observed: (value) => `Observed ${value}`,
    vendorCoverage: (visible) => `${visible} suppliers visible`,
    directoryTitle: 'Supplier directory',
    directoryDescription:
      'Companies with the MAB supplier role, their open RFQ requests and replied quotations.',
    vendorLabel: 'Supplier',
    crLabel: 'CR',
    vatLabel: 'VAT',
    noCr: 'No CR',
    noVat: 'No VAT',
    openRfqLabel: 'Open RFQs',
    repliedLabel: 'Quotes replied',
    activeCasesLabel: 'Active cases',
    noActiveCases: 'No open requests',
    requestRfqTitle: 'Request RFQ',
    requestRfqDescription:
      'Choose a case with a client RFQ, select suppliers and set a reply due date. One supplier RFQ document is created per supplier.',
    caseSelectLabel: 'Procurement case',
    selectCaseHint: 'Select a case',
    noEligibleCases:
      'No eligible case: a case must be in Intake or Sourcing and carry a client RFQ.',
    vendorSelectLabel: 'Suppliers',
    noVendorsSelected: 'Select at least one supplier',
    dueDateLabel: 'Reply due date',
    dueDateHint: 'UTC date and time',
    submitRfq: 'Request RFQ',
    submittingRfq: 'Requesting…',
    submitSuccess: 'Supplier RFQs requested and recorded.',
    submitFailed: 'The RFQ request was rejected. Review the message and try again.',
    noOutboundBoundary:
      'The pilot cannot send email or WhatsApp yet: the request is recorded and audited, and outbound sending stays unavailable.',
    outboundUnavailable: 'Outbound sending unavailable',
    openCompany: 'Open supplier',
    openCase: 'Open case',
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
  },
  ar: {
    dashboardLabel: 'دليل الموردين',
    welcomeTitle: 'حلول مباندس',
    eyebrow: 'PxD · تجربة مباندس',
    title: 'الموردون',
    subtitle:
      'كل مورد موجود في دليل واحد مع نشاط طلبات العروض، إضافة إلى تدفق لإنشاء مستندات طلب عرض المورد مقابل طلب العميل.',
    refresh: 'تحديث',
    refreshing: 'جارٍ التحديث…',
    loading: 'جارٍ تحميل دليل الموردين…',
    errorTitle: 'تعذر تحميل دليل الموردين.',
    retry: 'حاول مرة أخرى',
    emptyTitle: 'لا يوجد موردون بعد',
    emptyBody:
      'يظهر الموردون هنا عندما تحمل الشركة دور المورد في مباندس. تبقى الشاشة للقراءة فقط باستثناء إجراء طلب عرض السعر.',
    partial: 'النتيجة جزئية: توجد سجلات أكثر مما تعرضه هذه الشاشة المحدودة.',
    languageName: 'English',
    languageButtonLabel: 'تبديل لغة العرض',
    observed: (value) => `تمت الملاحظة ${value}`,
    vendorCoverage: (visible) => `${visible} مورداً ظاهراً`,
    directoryTitle: 'دليل الموردين',
    directoryDescription: 'الشركات الحاملة لدور المورد في مباندس مع طلبات العروض المفتوحة والعروض الواردة.',
    vendorLabel: 'المورد',
    crLabel: 'السجل التجاري',
    vatLabel: 'الرقم الضريبي',
    noCr: 'لا يوجد سجل تجاري',
    noVat: 'لا يوجد رقم ضريبي',
    openRfqLabel: 'طلبات مفتوحة',
    repliedLabel: 'عروض واردة',
    activeCasesLabel: 'حالات نشطة',
    noActiveCases: 'لا توجد طلبات مفتوحة',
    requestRfqTitle: 'طلب عرض سعر',
    requestRfqDescription:
      'اختر حالة تحمل طلب عرض العميل، وحدد الموردين، وضبط موعد الرد. يُنشأ مستند طلب عرض واحد لكل مورد.',
    caseSelectLabel: 'حالة الشراء',
    selectCaseHint: 'اختر حالة',
    noEligibleCases:
      'لا توجد حالة مؤهلة: يجب أن تكون الحالة في الاستلام أو التوريد وتحمل طلب عرض العميل.',
    vendorSelectLabel: 'الموردون',
    noVendorsSelected: 'اختر مورداً واحداً على الأقل',
    dueDateLabel: 'موعد الرد',
    dueDateHint: 'التاريخ والوقت بالتوقيت العالمي',
    submitRfq: 'طلب عرض سعر',
    submittingRfq: 'جارٍ الطلب…',
    submitSuccess: 'تم طلب عروض الموردين وتسجيلها.',
    submitFailed: 'تم رفض طلب عرض السعر. راجع الرسالة وحاول مرة أخرى.',
    noOutboundBoundary:
      'لا يستطيع التجربة إرسال البريد أو واتساب بعد: يُسجل الطلب ويدوّن، ويبقى الإرسال الخارجي غير متاح.',
    outboundUnavailable: 'الإرسال الخارجي غير متاح',
    openCompany: 'فتح المورد',
    openCase: 'فتح الحالة',
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
  },
};

export const toVendorDirectoryLocale = (
  locale: string | null,
): VendorDirectoryLocale => (locale === 'ar' ? 'ar' : 'en');
