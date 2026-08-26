import type { PashxProcurementCaseStage } from 'pashx-mab-contract';

export type VendorComparisonLocale = 'en' | 'ar';

export type VendorComparisonCopy = Readonly<{
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
  conflict: string;
  languageName: string;
  languageButtonLabel: string;
  observed: (value: string) => string;
  caseHeaderTitle: string;
  clientRfqLabel: string;
  dueDateLabel: string;
  stageLabel: string;
  evidenceCompletenessLabel: string;
  noClientRfq: string;
  noDueDate: string;
  noStage: string;
  evidenceCompletenessValue: (finalized: number, total: number) => string;
  summaryTitle: string;
  summaryDescription: string;
  invitedLabel: string;
  responsesLabel: string;
  responseDeadlineLabel: string;
  priceVarianceLabel: string;
  notApplicable: string;
  invitedFormula: string;
  responsesFormula: string;
  responseDeadlineFormula: string;
  priceVarianceFormula: string;
  invitedValue: (count: number) => string;
  responsesValue: (count: number) => string;
  comparisonTitle: string;
  comparisonDescription: string;
  supplierLabel: string;
  totalLabel: string;
  leadTimeLabel: string;
  paymentTermsLabel: string;
  validityLabel: string;
  statusLabel: string;
  sourceLabel: string;
  noSupplier: string;
  noPaymentTerms: string;
  noLeadTime: string;
  noValidity: string;
  expiredStatus: string;
  openRecord: string;
  openSupplier: string;
  vendorIdLabel: string;
  crLabel: string;
  vatLabel: string;
  missingLabel: string;
  daysSuffix: (days: number) => string;
  recommendationTitle: string;
  recommendationDescription: string;
  rankingTitle: string;
  rankLabel: string;
  formulaTitle: string;
  formulaSteps: readonly string[];
  noFinalizedQuotesTitle: string;
  noFinalizedQuotesBody: string;
  mixedCurrencyTitle: string;
  mixedCurrencyBody: (currencies: string) => string;
  missingTotalTitle: string;
  missingTotalBody: (refs: string) => string;
  conflictingSupplierQuotesTitle: string;
  conflictingSupplierQuotesBody: (refs: string) => string;
  allExpiredTitle: string;
  allExpiredBody: (count: number) => string;
  insufficientComparableTitle: string;
  insufficientComparableBody: (count: number) => string;
  exclusionsLabel: string;
  expiredExclusion: (reference: string) => string;
  noExclusions: string;
  rankedNote: string;
  customerQuotationTitle: string;
  customerQuotationDescription: string;
  finalizedStateLabel: string;
  sourceLinkageLabel: string;
  noneSelected: string;
  noCustomerQuotes: string;
  nextTaskTitle: string;
  nextTaskLabel: string;
  noNextTask: string;
  approvalTitle: string;
  approvalBody: string;
  complianceTitle: string;
  complianceBody: string;
  openCaseLabel: string;
  stages: Readonly<Record<PashxProcurementCaseStage, string>>;
  lifecycleStatuses: Readonly<Record<string, string>>;
  nextActionLabels: Readonly<Record<string, string>>;
  unknownValue: string;
  draftLabel: string;
  finalizedLabel: string;
}>;

export const vendorComparisonCopy: Readonly<
  Record<VendorComparisonLocale, VendorComparisonCopy>
> = {
  en: {
    dashboardLabel: 'Vendor comparison',
    welcomeTitle: 'MAB Indus Solutions',
    eyebrow: 'PxD · MAB pilot',
    title: 'Vendor comparison',
    subtitle:
      'One procurement case, compared deterministically: who was invited, who replied, how price, delivery and terms differ, and which finalized quotation the formula ranks first.',
    refresh: 'Refresh',
    refreshing: 'Refreshing…',
    loading: 'Loading the vendor comparison…',
    errorTitle: 'The vendor comparison could not be loaded.',
    retry: 'Try again',
    emptyTitle: 'No comparable procurement case found',
    emptyBody:
      'No case or quotations are visible to this account for the selected case. The view stays read-only and never claims a cause it cannot prove.',
    partial: 'Result is partial: more records exist than this bounded view shows.',
    conflict:
      'Evidence is in conflict and no recommendation can be made from it.',
    languageName: 'العربية',
    languageButtonLabel: 'Switch display language',
    observed: (value) => `Observed ${value}`,
    caseHeaderTitle: 'Case',
    clientRfqLabel: 'Client RFQ',
    dueDateLabel: 'Due date',
    stageLabel: 'Stage',
    evidenceCompletenessLabel: 'Evidence completeness',
    noClientRfq: 'No finalized client RFQ recorded',
    noDueDate: 'No due date',
    noStage: 'No stage recorded',
    evidenceCompletenessValue: (finalized, total) =>
      `${finalized} of ${total} documents finalized`,
    summaryTitle: 'Summary signals',
    summaryDescription:
      'Every signal is derived from finalized evidence and shown with its formula; nothing is fabricated.',
    invitedLabel: 'Suppliers invited',
    responsesLabel: 'Responses received',
    responseDeadlineLabel: 'Response deadline',
    priceVarianceLabel: 'Price variance',
    notApplicable: 'Not applicable',
    invitedFormula: 'Distinct suppliers on finalized supplier RFQs',
    responsesFormula: 'Distinct suppliers on finalized vendor quotations',
    responseDeadlineFormula: 'procurementCase.supplierResponseDeadlineAt',
    priceVarianceFormula:
      '(max − min) / min over finalized same-currency quotations',
    invitedValue: (count) => `${count} suppliers`,
    responsesValue: (count) => `${count} suppliers`,
    comparisonTitle: 'Comparison',
    comparisonDescription:
      'Finalized supplier quotations with identity, price, delivery and commercial terms, and source links.',
    supplierLabel: 'Supplier',
    totalLabel: 'Total',
    leadTimeLabel: 'Lead time',
    paymentTermsLabel: 'Payment terms',
    validityLabel: 'Valid until',
    statusLabel: 'Status',
    sourceLabel: 'Source',
    noSupplier: 'No supplier linked',
    noPaymentTerms: 'Not stated',
    noLeadTime: 'Missing',
    noValidity: 'No validity date',
    expiredStatus: 'Expired',
    openRecord: 'Open record',
    openSupplier: 'Open supplier',
    vendorIdLabel: 'Vendor ID',
    crLabel: 'CR',
    vatLabel: 'VAT',
    missingLabel: 'Missing',
    daysSuffix: (days) => `${days} days`,
    recommendationTitle: 'Recommendation',
    recommendationDescription:
      'Deterministic from stored evidence; the formula and every exclusion are shown, never narrated.',
    rankingTitle: 'Ranking',
    rankLabel: 'Rank',
    formulaTitle: 'Formula',
    formulaSteps: [
      'Candidates are finalized vendor quotations scoped to this case.',
      'Gates, in order: no finalized quotes; mixed currencies; missing total; conflicting supplier quotes; all expired; fewer than two comparable.',
      'Expired quotations are excluded, counted, and shown.',
      'Ranking: total ascending → lead time ascending (missing last) → reference ascending → id ascending.',
      'Payment terms are displayed but never ordinally ranked.',
    ],
    noFinalizedQuotesTitle: 'No recommendation',
    noFinalizedQuotesBody: 'No finalized vendor quotations exist for this case.',
    mixedCurrencyTitle: 'No recommendation — mixed currencies',
    mixedCurrencyBody: (currencies) =>
      `Quotations span more than one currency (${currencies}); they cannot be compared without an approved conversion source.`,
    missingTotalTitle: 'No recommendation — missing total',
    missingTotalBody: (refs) =>
      `One or more quotations lack a total: ${refs}.`,
    conflictingSupplierQuotesTitle: 'No recommendation — conflicting supplier quotes',
    conflictingSupplierQuotesBody: (refs) =>
      `One supplier holds two or more finalized quotations: ${refs}.`,
    allExpiredTitle: 'No recommendation — all expired',
    allExpiredBody: (count) =>
      `Every finalized quotation is expired (${count} excluded); none remain comparable.`,
    insufficientComparableTitle: 'No recommendation — insufficient comparable',
    insufficientComparableBody: (count) =>
      `Fewer than two comparable quotations remain (${count}); a ranking needs at least two.`,
    exclusionsLabel: 'Exclusions',
    expiredExclusion: (reference) => `Expired: ${reference}`,
    noExclusions: 'No exclusions.',
    rankedNote:
      'Ranking is a total deterministic order; equal inputs resolve by reference and id, so a tie is never emitted.',
    customerQuotationTitle: 'Customer quotation',
    customerQuotationDescription:
      'Finalized customer-quote state with native drill-through. The source quotation linkage is deferred and shows “none selected”.',
    finalizedStateLabel: 'Finalized state',
    sourceLinkageLabel: 'Source quotation linkage',
    noneSelected: 'None selected',
    noCustomerQuotes: 'No customer quotation recorded for this case.',
    nextTaskTitle: 'Next task',
    nextTaskLabel: 'Next action',
    noNextTask: 'No next action recorded',
    approvalTitle: 'Approval',
    approvalBody:
      'Approval decisions happen on the native approval records through permission-checked commands; this page has no write path.',
    complianceTitle: 'Compliance',
    complianceBody:
      'Compliance state is authoritative on each document and never changes from this page.',
    openCaseLabel: 'Open case record',
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
    nextActionLabels: {
      REVIEW_DRAFT_DOCUMENT: 'Review draft document',
      REVIEW_PENDING_EXPENSE: 'Review pending expense',
      COMPLETE_CASE_DATA: 'Complete case data',
      COMPLETE_DOCUMENT_DATA: 'Complete document data',
      RESOLVE_COMPLIANCE_EXCEPTION: 'Resolve compliance exception',
    },
    unknownValue: 'Unknown',
    draftLabel: 'Draft',
    finalizedLabel: 'Finalized',
  },
  ar: {
    dashboardLabel: 'مقارنة الموردين',
    welcomeTitle: 'حلول مباندس',
    eyebrow: 'PxD · تجربة مباندس',
    title: 'مقارنة الموردين',
    subtitle:
      'حالة شراء واحدة مقارنةً حتمياً: من دُعي ومن ردّ، وكيف تختلف الأسعار والتسليم والشروط، وأي عرض معتمد يصنّفه المعادلة أولاً.',
    refresh: 'تحديث',
    refreshing: 'جارٍ التحديث…',
    loading: 'جارٍ تحميل مقارنة الموردين…',
    errorTitle: 'تعذر تحميل مقارنة الموردين.',
    retry: 'حاول مرة أخرى',
    emptyTitle: 'لا توجد حالة شراء قابلة للمقارنة',
    emptyBody:
      'لا تظهر لهذا الحساب أي حالة أو عروض للحالة المختارة. تبقى الشاشة للقراءة فقط ولا تدّعي سبباً لا يمكنها إثباته.',
    partial: 'النتيجة جزئية: توجد سجلات أكثر مما تعرضه هذه الشاشة المحدودة.',
    conflict: 'الأدلة متعارضة ولا يمكن إصدار توصية منها.',
    languageName: 'English',
    languageButtonLabel: 'تبديل لغة العرض',
    observed: (value) => `تمت الملاحظة ${value}`,
    caseHeaderTitle: 'الحالة',
    clientRfqLabel: 'طلب عرض العميل',
    dueDateLabel: 'تاريخ الاستحقاق',
    stageLabel: 'المرحلة',
    evidenceCompletenessLabel: 'اكتمال الأدلة',
    noClientRfq: 'لا يوجد طلب عرض عميل معتمد',
    noDueDate: 'لا يوجد تاريخ استحقاق',
    noStage: 'لا توجد مرحلة مسجلة',
    evidenceCompletenessValue: (finalized, total) =>
      `${finalized} من ${total} مستنداً معتمداً`,
    summaryTitle: 'مؤشرات الملخص',
    summaryDescription:
      'كل مؤشر مشتق من أدلة معتمدة ويُعرض مع معادلته؛ ولا يُختلق أي شيء.',
    invitedLabel: 'الموردون المدعوون',
    responsesLabel: 'الردود المستلمة',
    responseDeadlineLabel: 'مهلة الرد',
    priceVarianceLabel: 'تباين الأسعار',
    notApplicable: 'غير قابل للتطبيق',
    invitedFormula: 'الموردون المميزون في طلبات عرض المورد المعتمدة',
    responsesFormula: 'الموردون المميزون في عروض المورد المعتمدة',
    responseDeadlineFormula: 'procurementCase.supplierResponseDeadlineAt',
    priceVarianceFormula: '(الأقصى − الأدنى) / الأدنى لعروض معتمدة بنفس العملة',
    invitedValue: (count) => `${count} مورداً`,
    responsesValue: (count) => `${count} مورداً`,
    comparisonTitle: 'المقارنة',
    comparisonDescription:
      'عروض الموردين المعتمدة مع الهوية والسعر والتسليم والشروط التجارية وروابط المصدر.',
    supplierLabel: 'المورد',
    totalLabel: 'الإجمالي',
    leadTimeLabel: 'مهلة التسليم',
    paymentTermsLabel: 'شروط الدفع',
    validityLabel: 'صالح حتى',
    statusLabel: 'الحالة',
    sourceLabel: 'المصدر',
    noSupplier: 'لا يوجد مورد مرتبط',
    noPaymentTerms: 'غير مذكورة',
    noLeadTime: 'غير متوفر',
    noValidity: 'لا يوجد تاريخ صلاحية',
    expiredStatus: 'منتهي الصلاحية',
    openRecord: 'فتح السجل',
    openSupplier: 'فتح المورد',
    vendorIdLabel: 'معرّف المورد',
    crLabel: 'السجل التجاري',
    vatLabel: 'الرقم الضريبي',
    missingLabel: 'غير متوفر',
    daysSuffix: (days) => `${days} يوماً`,
    recommendationTitle: 'التوصية',
    recommendationDescription:
      'حتمية من الأدلة المخزنة؛ تُعرض المعادلة وكل استبعاد، ولا تُروى بأي سرد آلي.',
    rankingTitle: 'الترتيب',
    rankLabel: 'الترتيب',
    formulaTitle: 'المعادلة',
    formulaSteps: [
      'المرشحون هم عروض الموردين المعتمدة الخاصة بهذه الحالة.',
      'البوابات بالترتيب: لا عروض معتمدة؛ عملات متعددة؛ إجمالي ناقص؛ عروض متعارضة لمورد واحد؛ جميعها منتهية؛ أقل من عرضين قابلين للمقارنة.',
      'العروض المنتهية الصلاحية تُستبعد وتُحسب وتُعرض.',
      'الترتيب: الإجمالي تصاعدياً → مهلة التسليم تصاعدياً (الناقص أخيراً) → المرجع تصاعدياً → المعرّف تصاعدياً.',
      'تُعرض شروط الدفع ولا تُرتَّب ترتيبياً أبداً.',
    ],
    noFinalizedQuotesTitle: 'لا توجد توصية',
    noFinalizedQuotesBody: 'لا توجد عروض موردين معتمدة لهذه الحالة.',
    mixedCurrencyTitle: 'لا توجد توصية — عملات متعددة',
    mixedCurrencyBody: (currencies) =>
      `تغطي العروض أكثر من عملة (${currencies})؛ ولا يمكن مقارنتها دون مصدر تحويل معتمد.`,
    missingTotalTitle: 'لا توجد توصية — إجمالي ناقص',
    missingTotalBody: (refs) => `يفتقر عرض أو أكثر إلى الإجمالي: ${refs}.`,
    conflictingSupplierQuotesTitle: 'لا توجد توصية — عروض مورد متعارضة',
    conflictingSupplierQuotesBody: (refs) =>
      `يملك مورد واحد عرضين معتمدين أو أكثر: ${refs}.`,
    allExpiredTitle: 'لا توجد توصية — جميعها منتهية',
    allExpiredBody: (count) =>
      `كل عرض معتمد منتهي الصلاحية (${count} مستبعداً)؛ ولم يبقَ أي عرض قابل للمقارنة.`,
    insufficientComparableTitle: 'لا توجد توصية — عدد غير كافٍ',
    insufficientComparableBody: (count) =>
      `بقي أقل من عرضين قابلين للمقارنة (${count})؛ ويتطلب الترتيب عرضين على الأقل.`,
    exclusionsLabel: 'الاستبعادات',
    expiredExclusion: (reference) => `منتهي الصلاحية: ${reference}`,
    noExclusions: 'لا توجد استبعادات.',
    rankedNote:
      'الترتيب نظام حتمي كامل؛ تُحسم المدخلات المتساوية بالمرجع والمعرّف، فلا يُصدر تعادل أبداً.',
    customerQuotationTitle: 'عرض العميل',
    customerQuotationDescription:
      'حالة عرض العميل المعتمد مع فتح السجل الأصلي. ربط المصدر مؤجل ويُعرض على أنه «لم يُحدد».',
    finalizedStateLabel: 'الحالة المعتمدة',
    sourceLinkageLabel: 'ربط عرض المصدر',
    noneSelected: 'لم يُحدد',
    noCustomerQuotes: 'لا يوجد عرض عميل مسجل لهذه الحالة.',
    nextTaskTitle: 'المهمة التالية',
    nextTaskLabel: 'الإجراء التالي',
    noNextTask: 'لا يوجد إجراء تالٍ مسجل',
    approvalTitle: 'الاعتماد',
    approvalBody:
      'تحدث قرارات الاعتماد على سجلات الاعتماد الأصلية عبر أوامر مقيّدة بالصلاحيات؛ ولا تملك هذه الشاشة أي مسار كتابة.',
    complianceTitle: 'الامتثال',
    complianceBody:
      'حالة الامتثال موثوقة على كل مستند ولا تتغير أبداً من هذه الشاشة.',
    openCaseLabel: 'فتح سجل الحالة',
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
    nextActionLabels: {
      REVIEW_DRAFT_DOCUMENT: 'مراجعة مسودة المستند',
      REVIEW_PENDING_EXPENSE: 'مراجعة المصروف المعلق',
      COMPLETE_CASE_DATA: 'استكمال بيانات الحالة',
      COMPLETE_DOCUMENT_DATA: 'استكمال بيانات المستند',
      RESOLVE_COMPLIANCE_EXCEPTION: 'حل استثناء الامتثال',
    },
    unknownValue: 'غير معروف',
    draftLabel: 'مسودة',
    finalizedLabel: 'معتمد',
  },
};

export const toVendorComparisonLocale = (
  locale: string | null,
): VendorComparisonLocale => (locale?.startsWith('ar') ? 'ar' : 'en');
