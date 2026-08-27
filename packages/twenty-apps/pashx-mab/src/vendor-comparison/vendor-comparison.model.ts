import type {
  VendorComparisonCaseRecord,
  VendorComparisonCustomerQuotationSummary,
  VendorComparisonDocumentRecord,
  VendorComparisonEvidenceCompleteness,
  VendorComparisonExcludedQuote,
  VendorComparisonRankedQuote,
  VendorComparisonRecommendation,
  VendorComparisonSummary,
} from './vendor-comparison.types';

const isFinalized = (document: VendorComparisonDocumentRecord): boolean =>
  document.lifecycleStatus === 'FINALIZED';

// Candidates are finalized vendor quotations scoped to the case. The loader
// already scoped documents to the case server-side; the recommendation treats
// only the finalized vendorQuote role as a comparable candidate.
export const selectFinalizedVendorQuotes = (
  documents: readonly VendorComparisonDocumentRecord[],
): readonly VendorComparisonDocumentRecord[] =>
  documents.filter(
    (document) =>
      document.documentType === 'vendorQuote' && isFinalized(document),
  );

const distinct = <T>(values: readonly T[]): T[] => [...new Set(values)];

const isComparableQuote = (
  quote: VendorComparisonDocumentRecord,
): quote is VendorComparisonDocumentRecord & {
  totalAmountMicros: number;
} => quote.totalAmountMicros !== null;

const parseTimestamp = (value: string): number => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

// A quotation is expired when its validity end falls strictly before the
// observation instant. An unparseable or absent validity date is treated as
// still valid: evidence of absence must not silently discard a candidate.
const isExpired = (validUntil: string | null, asOf: string): boolean =>
  validUntil !== null &&
  validUntil.trim() !== '' &&
  parseTimestamp(validUntil) < parseTimestamp(asOf);

export const isVendorComparisonQuoteExpired = (
  validUntil: string | null,
  asOf: string,
): boolean => isExpired(validUntil, asOf);

// Deterministic recommendation over frozen finalized vendor quotations. Gate
// order is part of the frozen contract and must never be reordered: presence,
// single currency, complete totals, one quote per supplier, expiry, minimum
// comparability, then the total-order ranking.
export const buildVendorComparisonRecommendation = (
  finalizedQuotes: readonly VendorComparisonDocumentRecord[],
  asOf: string,
): VendorComparisonRecommendation => {
  const quotes = [...finalizedQuotes];

  if (quotes.length === 0) {
    return { status: 'no-finalized-quotes' };
  }

  const currencies = distinct(
    quotes
      .map((quote) => quote.currencyCode)
      .filter(
        (currencyCode): currencyCode is string =>
          currencyCode !== null && currencyCode.trim() !== '',
      ),
  ).sort();
  if (currencies.length > 1) {
    return { status: 'mixed-currency', currencies };
  }

  const missingTotalRefs = quotes
    .filter((quote) => quote.totalAmountMicros === null)
    .map((quote) => quote.name)
    .sort();
  if (missingTotalRefs.length > 0) {
    return { status: 'missing-total', refs: missingTotalRefs };
  }

  // Two or more finalized quotations from one supplier make the comparison
  // self-conflicting; the ranking would otherwise pick between records that
  // claim to speak for the same party.
  const supplierCounts = new Map<string, number>();
  for (const quote of quotes) {
    if (quote.supplierRecordId !== null) {
      supplierCounts.set(
        quote.supplierRecordId,
        (supplierCounts.get(quote.supplierRecordId) ?? 0) + 1,
      );
    }
  }
  const conflictingSupplierIds = [...supplierCounts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([supplierRecordId]) => supplierRecordId);
  if (conflictingSupplierIds.length > 0) {
    const conflictSet = new Set(conflictingSupplierIds);
    return {
      status: 'conflicting-supplier-quotes',
      refs: quotes
        .filter(
          (quote) =>
            quote.supplierRecordId !== null &&
            conflictSet.has(quote.supplierRecordId),
        )
        .map((quote) => quote.name)
        .sort(),
    };
  }

  const expiredQuotes = quotes.filter((quote) =>
    isExpired(quote.validUntil, asOf),
  );
  const expiredIds = new Set(expiredQuotes.map((quote) => quote.id));
  const excluded: readonly VendorComparisonExcludedQuote[] = expiredQuotes.map(
    (quote) => ({
      documentId: quote.id,
      reference: quote.name,
      reason: 'expired',
      validUntil: quote.validUntil ?? '',
    }),
  );

  const comparable = quotes
    .filter((quote) => !expiredIds.has(quote.id))
    .filter(isComparableQuote);

  if (comparable.length === 0) {
    return {
      status: 'all-expired',
      expiredCount: expiredQuotes.length,
      expiredRefs: expiredQuotes.map((quote) => quote.name).sort(),
    };
  }

  if (comparable.length < 2) {
    return { status: 'insufficient-comparable', comparableCount: comparable.length };
  }

  const ranking: readonly VendorComparisonRankedQuote[] = [...comparable]
    .sort((left, right) => {
      const totalDelta = left.totalAmountMicros - right.totalAmountMicros;
      if (totalDelta !== 0) return totalDelta;

      // Lead time ascends; a missing lead time sorts last and is visibly
      // marked by the caller rather than given a fabricated number.
      if (left.leadTimeDays === null && right.leadTimeDays !== null) return 1;
      if (right.leadTimeDays === null && left.leadTimeDays !== null) return -1;
      if (left.leadTimeDays !== null && right.leadTimeDays !== null) {
        const leadTimeDelta = left.leadTimeDays - right.leadTimeDays;
        if (leadTimeDelta !== 0) return leadTimeDelta;
      }

      const referenceDelta = left.name.localeCompare(right.name);
      if (referenceDelta !== 0) return referenceDelta;

      return left.id.localeCompare(right.id);
    })
    .map((quote, index) => ({
      rank: index + 1,
      documentId: quote.id,
      reference: quote.name,
      supplierRecordId: quote.supplierRecordId,
      currencyCode: quote.currencyCode,
      totalAmountMicros: quote.totalAmountMicros,
      leadTimeDays: quote.leadTimeDays,
      paymentTerms: quote.paymentTerms,
      validUntil: quote.validUntil,
    }));

  return { status: 'ranked', ranking, excluded };
};

// Summary signals are displayed with their formula and never fabricated.
// Invited suppliers come from finalized supplier RFQs; responses come from
// finalized vendor quotations. Price variance is (max − min) / min over
// finalized quotations that share one currency and have a total; otherwise it
// is not applicable and stays null.
export const buildVendorComparisonSummary = (
  documents: readonly VendorComparisonDocumentRecord[],
  caseRecord: VendorComparisonCaseRecord | null,
): VendorComparisonSummary => {
  const caseDocuments =
    caseRecord === null
      ? []
      : documents.filter(
          (document) => document.procurementCaseRecordId === caseRecord.id,
        );
  const finalized = caseDocuments.filter(isFinalized);
  const supplierRfqs = finalized.filter(
    (document) => document.documentType === 'supplierRfq',
  );
  const vendorQuotes = finalized.filter(
    (document) => document.documentType === 'vendorQuote',
  );

  const invitedSupplierIds = distinct(
    supplierRfqs
      .map((document) => document.supplierRecordId)
      .filter((id): id is string => id !== null),
  );
  const responseSupplierIds = distinct(
    vendorQuotes
      .map((document) => document.supplierRecordId)
      .filter((id): id is string => id !== null),
  );

  const pricedQuotes = vendorQuotes.filter(
    (
      document,
    ): document is VendorComparisonDocumentRecord & {
      totalAmountMicros: number;
      currencyCode: string;
    } =>
      document.totalAmountMicros !== null &&
      document.currencyCode !== null &&
      document.currencyCode.trim() !== '',
  );
  const pricedCurrencies = distinct(
    pricedQuotes.map((document) => document.currencyCode),
  );

  let priceVariance: number | null = null;
  let priceVarianceCurrencyCode: string | null = null;
  if (pricedCurrencies.length === 1 && pricedQuotes.length >= 2) {
    const totals = pricedQuotes.map((document) => document.totalAmountMicros);
    const minimum = Math.min(...totals);
    const maximum = Math.max(...totals);
    // A zero baseline makes a relative variance meaningless; report not
    // applicable rather than an infinite ratio.
    if (minimum !== 0) {
      priceVariance = (maximum - minimum) / minimum;
      priceVarianceCurrencyCode = pricedCurrencies[0] ?? null;
    }
  }

  return {
    invitedSupplierIds,
    invitedCount: invitedSupplierIds.length,
    responseSupplierIds,
    responseCount: responseSupplierIds.length,
    priceVariance,
    priceVarianceCurrencyCode,
  };
};

export const buildEvidenceCompleteness = (
  documents: readonly VendorComparisonDocumentRecord[],
): VendorComparisonEvidenceCompleteness => {
  const finalized = documents.filter(isFinalized);

  return {
    totalDocumentCount: documents.length,
    finalizedDocumentCount: finalized.length,
    finalizedSupplierRfqCount: finalized.filter(
      (document) => document.documentType === 'supplierRfq',
    ).length,
    finalizedVendorQuoteCount: finalized.filter(
      (document) => document.documentType === 'vendorQuote',
    ).length,
    finalizedCustomerQuoteCount: finalized.filter(
      (document) => document.documentType === 'customerQuote',
    ).length,
  };
};

export const buildCustomerQuotationSummary = (
  documents: readonly VendorComparisonDocumentRecord[],
  caseRecord: VendorComparisonCaseRecord | null,
): VendorComparisonCustomerQuotationSummary => {
  const quotations =
    caseRecord === null
      ? []
      : documents.filter(
          (document) =>
            document.procurementCaseRecordId === caseRecord.id &&
            document.documentType === 'customerQuote',
        );

  return {
    quotations: quotations.map((document) => ({
      documentId: document.id,
      reference: document.name,
      lifecycleStatus: document.lifecycleStatus,
    })),
    totalCount: quotations.length,
    finalizedCount: quotations.filter(isFinalized).length,
  };
};

export const getVendorComparisonCaseHref = (caseRecordId: string): string =>
  `/object/procurementCase/${caseRecordId}`;

export const getVendorComparisonDocumentHref = (documentRecordId: string): string =>
  `/object/commercialDocument/${documentRecordId}`;

export const getVendorComparisonCompanyHref = (companyRecordId: string): string =>
  `/object/company/${companyRecordId}`;

const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>();
const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const numberFormatterCache = new Map<string, Intl.NumberFormat>();

export const formatVendorComparisonDateTime = (
  value: string | null,
  locale: 'en' | 'ar',
): string => {
  if (value === null || value.trim() === '') return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return '—';
  const cacheKey = locale;
  const formatter =
    dateTimeFormatterCache.get(cacheKey) ??
    new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  dateTimeFormatterCache.set(cacheKey, formatter);

  return formatter.format(parsed);
};

export const formatVendorComparisonDate = (
  value: string | null,
  locale: 'en' | 'ar',
): string => {
  if (value === null || value.trim() === '') return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return '—';
  const cacheKey = `date:${locale}`;
  const formatter =
    dateFormatterCache.get(cacheKey) ??
    new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
      dateStyle: 'medium',
    });
  dateFormatterCache.set(cacheKey, formatter);

  return formatter.format(parsed);
};

export const formatVendorComparisonAmount = (
  totalAmountMicros: number | null,
  currencyCode: string | null,
  locale: 'en' | 'ar',
): string => {
  if (totalAmountMicros === null) return '—';
  const amount = totalAmountMicros / 1_000_000;
  const cacheKey = locale;
  const formatter =
    numberFormatterCache.get(cacheKey) ??
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  numberFormatterCache.set(cacheKey, formatter);

  return `${formatter.format(amount)} ${currencyCode ?? ''}`.trimEnd();
};

export const formatVendorComparisonVariance = (
  variance: number | null,
  locale: 'en' | 'ar',
): string => {
  if (variance === null) return '—';
  const cacheKey = `variance:${locale}`;
  const formatter =
    numberFormatterCache.get(cacheKey) ??
    new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  numberFormatterCache.set(cacheKey, formatter);

  return formatter.format(variance);
};
