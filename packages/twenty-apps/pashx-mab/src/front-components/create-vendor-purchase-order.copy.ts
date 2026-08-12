export const createVendorPurchaseOrderCopy = {
  en: {
    title: 'Create vendor purchase order',
    subtitle:
      'Create a numbered draft linked to this procurement case. Review and issuance remain separate actions.',
    supplier: 'Supplier',
    issueDate: 'Issue date',
    currency: 'Currency',
    reference: 'Vendor reference (optional)',
    referenceHint: 'For example, the supplier quote or email reference.',
    chooseSupplier: 'Choose a supplier',
    cancel: 'Cancel',
    create: 'Create draft',
    retry: 'Retry creation',
    creating: 'Creating…',
    loading: 'Loading case and suppliers…',
    loadError: 'Could not load the case and supplier list.',
    submitError: 'Could not create the draft. Try again.',
    timeoutError:
      'The request took too long. Check your connection and retry safely.',
    successSuffix: 'created as a draft.',
    selectionError: 'Select exactly one procurement case.',
  },
  ar: {
    title: 'إنشاء أمر شراء للمورد',
    subtitle:
      'أنشئ مسودة مرقمة مرتبطة بحالة المشتريات. تظل المراجعة والإصدار إجراءات منفصلة.',
    supplier: 'المورد',
    issueDate: 'تاريخ الإصدار',
    currency: 'العملة',
    reference: 'مرجع المورد (اختياري)',
    referenceHint: 'مثلاً رقم عرض المورد أو مرجع البريد الإلكتروني.',
    chooseSupplier: 'اختر مورداً',
    cancel: 'إلغاء',
    create: 'إنشاء المسودة',
    retry: 'إعادة محاولة الإنشاء',
    creating: 'جارٍ الإنشاء…',
    loading: 'جارٍ تحميل الحالة والموردين…',
    loadError: 'تعذر تحميل الحالة وقائمة الموردين.',
    submitError: 'تعذر إنشاء المسودة. حاول مرة أخرى.',
    timeoutError: 'استغرق الطلب وقتاً طويلاً. تحقق من الاتصال وأعد المحاولة بأمان.',
    successSuffix: 'تم إنشاؤه كمسودة.',
    selectionError: 'حدد حالة مشتريات واحدة فقط.',
  },
} as const;

export type PashxCommandLocale = keyof typeof createVendorPurchaseOrderCopy;
