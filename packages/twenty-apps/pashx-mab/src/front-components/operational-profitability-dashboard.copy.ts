import {
  type ProfitabilityContributionKind,
  type ProfitabilityExclusionReason,
} from '../profitability/operational-profitability.types';

export type DashboardLocale = 'en' | 'ar';

export const DASHBOARD_LOCALES = ['en', 'ar'] as const;

export const DASHBOARD_LOCALE_TAGS: Readonly<Record<DashboardLocale, string>> =
  {
    en: 'en-GB',
    ar: 'ar-SA',
  };

export type DashboardCopy = Readonly<{
  languageName: string;
  languageButtonLabel: string;
  dashboardLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  refresh: string;
  refreshing: string;
  filtersLabel: string;
  periodStart: string;
  periodEnd: string;
  case: string;
  customer: string;
  project: string;
  owner: string;
  currency: string;
  all: string;
  noCurrency: string;
  activeFiltersLabel: string;
  methodStrong: string;
  methodBody: string;
  asOf: (formattedDate: string, dayCount: string) => string;
  staleRefreshError: (error: string) => string;
  loading: string;
  errorTitle: string;
  retry: string;
  emptyTitle: string;
  emptyBody: string;
  resetFilters: string;
  partialEvidence: (count: string) => string;
  totalsLabel: string;
  metricLabels: Readonly<
    Record<'REVENUE' | 'DIRECT_COST' | 'GROSS_PROFIT' | 'GROSS_MARGIN', string>
  >;
  contributingRecords: (count: string) => string;
  noComparablePriorMargin: string;
  noChange: string;
  noPositivePriorBaseline: string;
  percentChange: (value: string) => string;
  pointChange: (value: string) => string;
  trendTitle: string;
  trendSubtitle: (currencyCode: string) => string;
  chartLegend: string;
  chartRevenue: string;
  chartDirectCost: string;
  chartAccessibleLabel: (currencyCode: string) => string;
  noTrendTitle: string;
  noTrendBody: string;
  exactMonthlyValues: string;
  cashTitle: string;
  cashSubtitle: string;
  cashBoundary: string;
  cashInflow: string;
  cashOutflow: string;
  netCash: string;
  cashNotRecorded: string;
  cashEmptyTitle: string;
  cashEmptyBody: string;
  cashExcluded: (count: string) => string;
  cashChartAccessibleLabel: (currencyCode: string) => string;
  exactCashValues: string;
  period: string;
  grossProfit: string;
  records: string;
  evidenceTitle: string;
  evidenceSubtitle: string;
  source: string;
  included: string;
  excluded: string;
  currencyConversion: string;
  noCurrencyConversion: string;
  marginBridgeTitle: string;
  marginBridgeSubtitle: string;
  finalizedRevenue: string;
  lessDirectCost: string;
  rankedCasesTitle: string;
  rankedCasesSubtitle: string;
  noCaseContributors: string;
  ledgerTitle: string;
  ledgerShowing: (visible: string, total: string) => string;
  record: string;
  type: string;
  date: string;
  signedAmount: string;
  contributionKinds: Readonly<Record<ProfitabilityContributionKind, string>>;
  inclusionRulesTitle: string;
  inclusionRules: readonly string[];
  includedCurrencyRecords: (count: string, currencyCode: string) => string;
  exclusions: Readonly<Record<ProfitabilityExclusionReason, string>>;
}>;

// ISO currency codes must keep their canonical left-to-right order inside RTL copy.
const isolateLeftToRight = (value: string): string => `\u2066${value}\u2069`;

const englishCopy: DashboardCopy = {
  languageName: 'العربية',
  languageButtonLabel: 'Switch to Arabic',
  dashboardLabel: 'PxD Operational profitability Evidence Ledger',
  eyebrow: 'MAB procurement / Analysis',
  title: 'Operational profitability',
  subtitle:
    'Finalized revenue, direct cost, and gross margin with traceable source records.',
  refresh: 'Refresh evidence',
  refreshing: 'Refreshing…',
  filtersLabel: 'Dashboard filters',
  periodStart: 'Period start',
  periodEnd: 'Period end',
  case: 'Case',
  customer: 'Customer',
  project: 'Project',
  owner: 'Owner',
  currency: 'Currency',
  all: 'All',
  noCurrency: 'No currency',
  activeFiltersLabel: 'Active evidence filters',
  methodStrong: 'Management analysis, not accounting P&L.',
  methodBody:
    'Revenue and direct cost include only records allowed by the frozen UI1 rules.',
  asOf: (formattedDate, dayCount) =>
    `As of ${formattedDate} · compared with the preceding ${dayCount} days`,
  staleRefreshError: (error) =>
    `Refresh failed; showing the last successful evidence snapshot. ${error}`,
  loading: 'Loading finalized records and prior-period evidence…',
  errorTitle: 'Profitability evidence could not be loaded',
  retry: 'Retry',
  emptyTitle: 'No finalized evidence for this selection',
  emptyBody:
    'No records passed the selected period, dimension, status, compliance, amount, and currency rules. Exclusions are not converted into totals.',
  resetFilters: 'Reset filters',
  partialEvidence: (count) =>
    `Valid totals remain visible, but ${count} source records are excluded. See Evidence coverage for every reason.`,
  totalsLabel: 'Profitability totals',
  metricLabels: {
    REVENUE: 'Finalized revenue',
    DIRECT_COST: 'Direct cost',
    GROSS_PROFIT: 'Gross profit',
    GROSS_MARGIN: 'Gross margin',
  },
  contributingRecords: (count) => `${count} contributing records`,
  noComparablePriorMargin: 'No comparable prior margin',
  noChange: 'No change vs prior period',
  noPositivePriorBaseline: 'No positive prior-period baseline',
  percentChange: (value) => `${value} vs prior period`,
  pointChange: (value) => `${value} pp vs prior period`,
  trendTitle: 'Finalized document flow',
  trendSubtitle: (currencyCode) =>
    `Monthly finalized totals · ${isolateLeftToRight(currencyCode)} · shared scale`,
  chartLegend: 'Chart legend',
  chartRevenue: 'Revenue',
  chartDirectCost: 'Direct cost',
  chartAccessibleLabel: (currencyCode) =>
    `Monthly finalized revenue and direct cost in ${isolateLeftToRight(currencyCode)}`,
  noTrendTitle: 'No monthly trend yet',
  noTrendBody:
    'The selected currency has no finalized contributions in this period.',
  exactMonthlyValues: 'View exact monthly values',
  cashTitle: 'Verified cash movement',
  cashSubtitle: 'Actual receipts and payments, separated from document values.',
  cashBoundary:
    'Invoices and purchase orders are not treated as cash. Only human-verified, evidence-linked movements appear here.',
  cashInflow: 'Cash inflow',
  cashOutflow: 'Cash outflow',
  netCash: 'Net cash',
  cashNotRecorded: 'Not recorded',
  cashEmptyTitle: 'No verified cash movements recorded',
  cashEmptyBody:
    'Add reviewed receipt or payment evidence before showing cash totals. The profitability totals above remain valid document-based analysis.',
  cashExcluded: (count) =>
    `${count} cash movement records excluded from totals`,
  cashChartAccessibleLabel: (currencyCode) =>
    `Monthly verified cash inflow and outflow in ${isolateLeftToRight(currencyCode)}`,
  exactCashValues: 'View exact cash values',
  period: 'Period',
  grossProfit: 'Gross profit',
  records: 'Records',
  evidenceTitle: 'Evidence coverage',
  evidenceSubtitle: 'No exclusion is grouped as “other”.',
  source: 'Source',
  included: 'Included',
  excluded: 'Excluded',
  currencyConversion: 'Currency conversion',
  noCurrencyConversion: 'None — currencies remain separated',
  marginBridgeTitle: 'Deterministic margin bridge',
  marginBridgeSubtitle: 'Revenue − direct cost = gross profit',
  finalizedRevenue: 'Finalized revenue',
  lessDirectCost: 'Less direct cost',
  rankedCasesTitle: 'Ranked case contributors',
  rankedCasesSubtitle: 'Largest absolute gross-profit effect',
  noCaseContributors: 'No case contributors in this currency.',
  ledgerTitle: 'Contributing record ledger',
  ledgerShowing: (visible, total) =>
    `Showing ${visible} of ${total} records, ranked by absolute amount.`,
  record: 'Record',
  type: 'Type',
  date: 'Date',
  signedAmount: 'Signed amount',
  contributionKinds: {
    REVENUE: 'Revenue document',
    DIRECT_COST_DOCUMENT: 'Vendor document',
    DIRECT_COST_EXPENSE: 'Approved expense',
  },
  inclusionRulesTitle: 'Inclusion rules and active evidence boundary',
  inclusionRules: [
    'Revenue includes finalized customer invoices and finalized customer credit notes with cleared or not-required compliance.',
    'Direct cost includes finalized vendor purchase orders, finalized vendor credit notes, and approved recorded direct expenses.',
    'Customer and vendor credit notes reduce their respective totals using a positive stored amount and a deterministic negative sign.',
    'Draft, cancelled, credited-original, ZATCA-pending, ZATCA-rejected, pending-expense, and rejected-expense records are excluded and counted.',
    'Currencies are never combined; each ISO 4217 currency is reported separately without conversion.',
    'Gross margin is rounded half away from zero to one basis point and is not applicable when finalized revenue is zero.',
  ],
  includedCurrencyRecords: (count, currencyCode) =>
    `${count} included ${isolateLeftToRight(currencyCode)} records`,
  exclusions: {
    OUTSIDE_PERIOD: 'Outside selected period',
    FILTERED_OUT: 'Outside selected dimensions',
    MISSING_CASE: 'Missing procurement case',
    MISSING_DATE: 'Missing reporting date',
    MISSING_AMOUNT: 'Missing amount',
    UNSAFE_AMOUNT: 'Unsafe amount boundary',
    INVALID_CURRENCY: 'Invalid or missing currency',
    DRAFT: 'Draft documents',
    CANCELLED: 'Cancelled documents',
    CREDITED: 'Credited originals',
    ZATCA_PENDING: 'ZATCA pending',
    ZATCA_REJECTED: 'ZATCA rejected',
    UNSUPPORTED_DOCUMENT_TYPE: 'Unsupported document type',
    EXPENSE_PENDING: 'Pending direct expenses',
    EXPENSE_REJECTED: 'Rejected direct expenses',
  },
};

const arabicCopy: DashboardCopy = {
  languageName: 'English',
  languageButtonLabel: 'التبديل إلى الإنجليزية',
  dashboardLabel: 'دفتر أدلة الربحية التشغيلية من PxD',
  eyebrow: 'مشتريات MAB / التحليل',
  title: 'الربحية التشغيلية',
  subtitle:
    'الإيرادات النهائية والتكلفة المباشرة والهامش الإجمالي مع سجلات مصدر قابلة للتتبع.',
  refresh: 'تحديث الأدلة',
  refreshing: 'جارٍ التحديث…',
  filtersLabel: 'مرشحات لوحة المعلومات',
  periodStart: 'بداية الفترة',
  periodEnd: 'نهاية الفترة',
  case: 'حالة الشراء',
  customer: 'العميل',
  project: 'المشروع',
  owner: 'المسؤول',
  currency: 'العملة',
  all: 'الكل',
  noCurrency: 'لا توجد عملة',
  activeFiltersLabel: 'مرشحات الأدلة النشطة',
  methodStrong: 'تحليل إداري وليس قائمة أرباح وخسائر محاسبية.',
  methodBody:
    'تشمل الإيرادات والتكلفة المباشرة السجلات التي تسمح بها قواعد UI1 المعتمدة فقط.',
  asOf: (formattedDate, dayCount) =>
    `حتى ${formattedDate} · مقارنةً بالأيام ${dayCount} السابقة`,
  staleRefreshError: (error) =>
    `تعذّر التحديث؛ نعرض آخر لقطة أدلة ناجحة. ${error}`,
  loading: 'جارٍ تحميل السجلات النهائية وأدلة الفترة السابقة…',
  errorTitle: 'تعذّر تحميل أدلة الربحية',
  retry: 'إعادة المحاولة',
  emptyTitle: 'لا توجد أدلة نهائية لهذا الاختيار',
  emptyBody:
    'لم يجتز أي سجل قواعد الفترة والأبعاد والحالة والامتثال والمبلغ والعملة المحددة. لا تتحول الاستبعادات إلى إجماليات.',
  resetFilters: 'إعادة ضبط المرشحات',
  partialEvidence: (count) =>
    `تظل الإجماليات الصالحة ظاهرة، لكن تم استبعاد ${count} من سجلات المصدر. راجع تغطية الأدلة لمعرفة كل سبب.`,
  totalsLabel: 'إجماليات الربحية',
  metricLabels: {
    REVENUE: 'الإيرادات النهائية',
    DIRECT_COST: 'التكلفة المباشرة',
    GROSS_PROFIT: 'إجمالي الربح',
    GROSS_MARGIN: 'الهامش الإجمالي',
  },
  contributingRecords: (count) => `${count} من السجلات المساهمة`,
  noComparablePriorMargin: 'لا يوجد هامش سابق قابل للمقارنة',
  noChange: 'لا تغيير عن الفترة السابقة',
  noPositivePriorBaseline: 'لا يوجد خط أساس موجب للفترة السابقة',
  percentChange: (value) => `${value} مقارنةً بالفترة السابقة`,
  pointChange: (value) => `${value} نقطة مئوية مقارنةً بالفترة السابقة`,
  trendTitle: 'تدفق المستندات النهائية',
  trendSubtitle: (currencyCode) =>
    `الإجماليات النهائية الشهرية · ${isolateLeftToRight(currencyCode)} · مقياس موحّد`,
  chartLegend: 'مفتاح الرسم البياني',
  chartRevenue: 'الإيرادات',
  chartDirectCost: 'التكلفة المباشرة',
  chartAccessibleLabel: (currencyCode) =>
    `الإيرادات النهائية الشهرية والتكلفة المباشرة بعملة ${isolateLeftToRight(currencyCode)}`,
  noTrendTitle: 'لا يوجد اتجاه شهري بعد',
  noTrendBody: 'لا تحتوي العملة المحددة على مساهمات نهائية في هذه الفترة.',
  exactMonthlyValues: 'عرض القيم الشهرية الدقيقة',
  cashTitle: 'حركة النقد المتحققة',
  cashSubtitle: 'المقبوضات والمدفوعات الفعلية منفصلة عن قيم المستندات.',
  cashBoundary:
    'لا تُعامل الفواتير وأوامر الشراء كنقد. تظهر هنا فقط الحركات التي تحقق منها شخص وربطها بالدليل.',
  cashInflow: 'التدفق النقدي الداخل',
  cashOutflow: 'التدفق النقدي الخارج',
  netCash: 'صافي النقد',
  cashNotRecorded: 'غير مسجل',
  cashEmptyTitle: 'لا توجد حركات نقدية متحقق منها',
  cashEmptyBody:
    'أضف دليل قبض أو دفع تمت مراجعته قبل عرض إجماليات النقد. تبقى إجماليات الربحية أعلاه تحليلًا صحيحًا قائمًا على المستندات.',
  cashExcluded: (count) =>
    `تم استبعاد ${count} من سجلات الحركة النقدية من الإجماليات`,
  cashChartAccessibleLabel: (currencyCode) =>
    `التدفق النقدي الداخل والخارج المتحقق منه شهريًا بعملة ${isolateLeftToRight(currencyCode)}`,
  exactCashValues: 'عرض القيم النقدية الدقيقة',
  period: 'الفترة',
  grossProfit: 'إجمالي الربح',
  records: 'السجلات',
  evidenceTitle: 'تغطية الأدلة',
  evidenceSubtitle: 'لا يتم تجميع أي استبعاد تحت بند «أخرى».',
  source: 'المصدر',
  included: 'المُدرج',
  excluded: 'المستبعد',
  currencyConversion: 'تحويل العملة',
  noCurrencyConversion: 'لا يوجد — تبقى العملات منفصلة',
  marginBridgeTitle: 'جسر الهامش الحتمي',
  marginBridgeSubtitle: 'الإيرادات − التكلفة المباشرة = إجمالي الربح',
  finalizedRevenue: 'الإيرادات النهائية',
  lessDirectCost: 'ناقص التكلفة المباشرة',
  rankedCasesTitle: 'ترتيب الحالات المساهمة',
  rankedCasesSubtitle: 'أكبر أثر مطلق على إجمالي الربح',
  noCaseContributors: 'لا توجد حالات مساهمة بهذه العملة.',
  ledgerTitle: 'دفتر السجلات المساهمة',
  ledgerShowing: (visible, total) =>
    `عرض ${visible} من أصل ${total} سجلًا، مرتبة حسب القيمة المطلقة للمبلغ.`,
  record: 'السجل',
  type: 'النوع',
  date: 'التاريخ',
  signedAmount: 'المبلغ الموقّع',
  contributionKinds: {
    REVENUE: 'مستند إيراد',
    DIRECT_COST_DOCUMENT: 'مستند مورّد',
    DIRECT_COST_EXPENSE: 'مصروف معتمد',
  },
  inclusionRulesTitle: 'قواعد الإدراج وحدود الأدلة النشطة',
  inclusionRules: [
    'تشمل الإيرادات فواتير العملاء النهائية وإشعارات دائني العملاء النهائية عندما تكون حالة الامتثال مجتازة أو غير مطلوبة.',
    'تشمل التكلفة المباشرة أوامر شراء الموردين النهائية وإشعارات دائني الموردين النهائية والمصروفات المباشرة المسجلة والمعتمدة.',
    'تخفض إشعارات دائني العملاء والموردين إجمالياتها باستخدام مبلغ موجب مخزن وإشارة سالبة حتمية.',
    'تُستبعد وتُحصى السجلات المسودة والملغاة والأصول المقيّدة والإقرارات المعلقة أو المرفوضة لدى ZATCA والمصروفات المعلقة أو المرفوضة.',
    'لا تُدمج العملات مطلقًا؛ تُعرض كل عملة وفق ISO 4217 بصورة منفصلة ومن دون تحويل.',
    'يُقرب الهامش الإجمالي بعيدًا عن الصفر إلى نقطة أساس واحدة، ويكون غير منطبق عندما تكون الإيرادات النهائية صفرًا.',
  ],
  includedCurrencyRecords: (count, currencyCode) =>
    `${count} من السجلات المدرجة بعملة ${isolateLeftToRight(currencyCode)}`,
  exclusions: {
    OUTSIDE_PERIOD: 'خارج الفترة المحددة',
    FILTERED_OUT: 'خارج الأبعاد المحددة',
    MISSING_CASE: 'حالة شراء مفقودة',
    MISSING_DATE: 'تاريخ التقرير مفقود',
    MISSING_AMOUNT: 'المبلغ مفقود',
    UNSAFE_AMOUNT: 'المبلغ خارج الحد الآمن',
    INVALID_CURRENCY: 'العملة مفقودة أو غير صالحة',
    DRAFT: 'مستندات مسودة',
    CANCELLED: 'مستندات ملغاة',
    CREDITED: 'أصول مقيّدة',
    ZATCA_PENDING: 'معلق لدى ZATCA',
    ZATCA_REJECTED: 'مرفوض لدى ZATCA',
    UNSUPPORTED_DOCUMENT_TYPE: 'نوع مستند غير مدعوم',
    EXPENSE_PENDING: 'مصروفات مباشرة معلقة',
    EXPENSE_REJECTED: 'مصروفات مباشرة مرفوضة',
  },
};

export const operationalProfitabilityDashboardCopy: Readonly<
  Record<DashboardLocale, DashboardCopy>
> = {
  en: englishCopy,
  ar: arabicCopy,
};

export const toDashboardLocale = (locale: string): DashboardLocale =>
  locale.startsWith('ar') ? 'ar' : 'en';

export const formatDashboardCount = (
  value: number,
  locale: DashboardLocale,
): string => value.toLocaleString(DASHBOARD_LOCALE_TAGS[locale]);

export const formatDashboardDateTime = (
  value: string,
  locale: DashboardLocale,
): string =>
  new Intl.DateTimeFormat(DASHBOARD_LOCALE_TAGS[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Riyadh',
  }).format(new Date(value));

export const formatDashboardDate = (
  value: string,
  locale: DashboardLocale,
): string => {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    return '—';
  }

  return new Intl.DateTimeFormat(DASHBOARD_LOCALE_TAGS[locale], {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(parsed);
};
