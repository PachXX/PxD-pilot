export const PASHX_COMMAND_EXCEPTION_CODES = {
  invalidInput: 'PASHX_INVALID_INPUT',
  invalidTransition: 'PASHX_INVALID_TRANSITION',
  forbiddenCapability: 'PASHX_FORBIDDEN_CAPABILITY',
  staleVersion: 'PASHX_STALE_VERSION',
  idempotencyKeyReused: 'PASHX_IDEMPOTENCY_KEY_REUSED',
  numberConflict: 'PASHX_NUMBER_CONFLICT',
  recordConflict: 'PASHX_RECORD_CONFLICT',
  recordNotFound: 'PASHX_RECORD_NOT_FOUND',
  currencyMismatch: 'PASHX_CURRENCY_MISMATCH',
  amountOutOfRange: 'PASHX_AMOUNT_OUT_OF_RANGE',
  finalizedDocumentImmutable: 'PASHX_FINALIZED_DOCUMENT_IMMUTABLE',
  importBlocked: 'PASHX_IMPORT_BLOCKED',
  storageFailure: 'PASHX_STORAGE_FAILURE',
  complianceNotReady: 'PASHX_COMPLIANCE_NOT_READY',
  complianceRejected: 'PASHX_COMPLIANCE_REJECTED',
  providerRetryableFailure: 'PASHX_PROVIDER_RETRYABLE_FAILURE',
  internalError: 'PASHX_INTERNAL_ERROR',
} as const;

export type PashxCommandExceptionCode =
  (typeof PASHX_COMMAND_EXCEPTION_CODES)[keyof typeof PASHX_COMMAND_EXCEPTION_CODES];

export type PashxErrorLocale = 'en' | 'ar';

export type PashxLocalizedErrorDefinition = Readonly<{
  retryable: boolean;
  messages: Readonly<Record<PashxErrorLocale, string>>;
}>;

export const PASHX_COMMAND_ERROR_DEFINITIONS = {
  PASHX_INVALID_INPUT: {
    retryable: false,
    messages: {
      en: 'Check the highlighted values and try again.',
      ar: 'تحقق من القيم المحددة ثم حاول مرة أخرى.',
    },
  },
  PASHX_INVALID_TRANSITION: {
    retryable: false,
    messages: {
      en: 'This record cannot move to the requested stage.',
      ar: 'لا يمكن نقل هذا السجل إلى المرحلة المطلوبة.',
    },
  },
  PASHX_FORBIDDEN_CAPABILITY: {
    retryable: false,
    messages: {
      en: 'Your role does not allow this action.',
      ar: 'لا يسمح دورك بتنفيذ هذا الإجراء.',
    },
  },
  PASHX_STALE_VERSION: {
    retryable: true,
    messages: {
      en: 'This record changed. Reload it before trying again.',
      ar: 'تم تغيير هذا السجل. أعد تحميله قبل المحاولة مرة أخرى.',
    },
  },
  PASHX_IDEMPOTENCY_KEY_REUSED: {
    retryable: false,
    messages: {
      en: 'This request key was already used for different data.',
      ar: 'تم استخدام مفتاح الطلب هذا مسبقاً لبيانات مختلفة.',
    },
  },
  PASHX_NUMBER_CONFLICT: {
    retryable: true,
    messages: {
      en: 'A document number conflict occurred. Try again.',
      ar: 'حدث تعارض في رقم المستند. حاول مرة أخرى.',
    },
  },
  PASHX_RECORD_CONFLICT: {
    retryable: false,
    messages: {
      en: 'This record identifier is already in use. Reload and try again.',
      ar: 'معرّف السجل هذا مستخدم بالفعل. أعد التحميل ثم حاول مرة أخرى.',
    },
  },
  PASHX_RECORD_NOT_FOUND: {
    retryable: false,
    messages: {
      en: 'The requested record was not found.',
      ar: 'لم يتم العثور على السجل المطلوب.',
    },
  },
  PASHX_CURRENCY_MISMATCH: {
    retryable: false,
    messages: {
      en: 'Amounts in different currencies cannot be combined.',
      ar: 'لا يمكن جمع مبالغ بعملات مختلفة.',
    },
  },
  PASHX_AMOUNT_OUT_OF_RANGE: {
    retryable: false,
    messages: {
      en: 'The amount exceeds the supported safe range.',
      ar: 'يتجاوز المبلغ النطاق الآمن المدعوم.',
    },
  },
  PASHX_FINALIZED_DOCUMENT_IMMUTABLE: {
    retryable: false,
    messages: {
      en: 'A finalized document cannot be edited. Create a correction instead.',
      ar: 'لا يمكن تعديل مستند نهائي. أنشئ مستند تصحيح بدلاً من ذلك.',
    },
  },
  PASHX_IMPORT_BLOCKED: {
    retryable: false,
    messages: {
      en: 'Resolve every blocking import error before approval.',
      ar: 'عالج جميع أخطاء الاستيراد المانعة قبل الموافقة.',
    },
  },
  PASHX_STORAGE_FAILURE: {
    retryable: true,
    messages: {
      en: 'The document could not be stored. Try again.',
      ar: 'تعذر حفظ المستند. حاول مرة أخرى.',
    },
  },
  PASHX_COMPLIANCE_NOT_READY: {
    retryable: true,
    messages: {
      en: 'The invoice is not ready for compliance submission.',
      ar: 'الفاتورة غير جاهزة للإرسال للامتثال.',
    },
  },
  PASHX_COMPLIANCE_REJECTED: {
    retryable: false,
    messages: {
      en: 'Invoice compliance was rejected and needs operator review.',
      ar: 'تم رفض امتثال الفاتورة ويلزم مراجعته من قبل المشغل.',
    },
  },
  PASHX_PROVIDER_RETRYABLE_FAILURE: {
    retryable: true,
    messages: {
      en: 'The external service is temporarily unavailable. Try again.',
      ar: 'الخدمة الخارجية غير متاحة مؤقتاً. حاول مرة أخرى.',
    },
  },
  PASHX_INTERNAL_ERROR: {
    retryable: false,
    messages: {
      en: 'An unexpected error occurred. Contact support with the correlation ID.',
      ar: 'حدث خطأ غير متوقع. تواصل مع الدعم باستخدام معرّف الارتباط.',
    },
  },
} as const satisfies Record<
  PashxCommandExceptionCode,
  PashxLocalizedErrorDefinition
>;

export type PashxCommandError = Readonly<{
  ok: false;
  code: PashxCommandExceptionCode;
  correlationId: string;
  retryable: boolean;
  fieldPaths: readonly string[];
  currentVersion?: number;
}>;

export const getPashxCommandErrorMessage = (
  code: PashxCommandExceptionCode,
  locale: PashxErrorLocale,
): string => PASHX_COMMAND_ERROR_DEFINITIONS[code].messages[locale];
