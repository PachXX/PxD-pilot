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
    creating: 'Creating…',
    loading: 'Loading case and suppliers…',
    loadError: 'Could not load the case and supplier list.',
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
    creating: 'جارٍ الإنشاء…',
    loading: 'جارٍ تحميل الحالة والموردين…',
    loadError: 'تعذر تحميل الحالة وقائمة الموردين.',
    selectionError: 'حدد حالة مشتريات واحدة فقط.',
  },
} as const;

export type PashxCommandLocale = keyof typeof createVendorPurchaseOrderCopy;
