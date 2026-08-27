export const PASHX_DOCUMENT_EXTRACTION_PATHS = [
  'TEXT_LAYER',
  'HYBRID_OCR',
  'OCR_ONLY',
] as const;

export type PashxDocumentExtractionPath =
  (typeof PASHX_DOCUMENT_EXTRACTION_PATHS)[number];

export const PASHX_OCR_REVIEW_STATUSES = [
  'PENDING_REVIEW',
  'ACCEPTED',
  'REJECTED',
] as const;

export type PashxOcrReviewStatus = (typeof PASHX_OCR_REVIEW_STATUSES)[number];

export type PashxOcrSourceRegion = Readonly<{
  pageNumber: number;
  /** Normalized [left, top, right, bottom] coordinates in the range 0..1. */
  boundingBox: readonly [number, number, number, number];
  text: string;
  confidence: number;
}>;

export type PashxOcrFieldProposal = Readonly<{
  fieldCode: string;
  proposedValue: string;
  confidence: number;
  sourceRegionIndexes: readonly number[];
}>;

export type PashxDocumentExtractionProposal = Readonly<{
  contractVersion: 1;
  sourceFileId: string;
  sourceFileSha256: string;
  extractionPath: PashxDocumentExtractionPath;
  engineName: 'NATIVE_TEXT_LAYER' | 'PADDLEOCR_PP_STRUCTURE_V3';
  engineVersion: string;
  sourceRegions: readonly PashxOcrSourceRegion[];
  fieldProposals: readonly PashxOcrFieldProposal[];
  reviewStatus: PashxOcrReviewStatus;
  extractedAt: string;
}>;

export type PashxDocumentExtractionRoutingResult =
  | Readonly<{ valid: true; path: PashxDocumentExtractionPath }>
  | Readonly<{ valid: false; fieldPaths: readonly ['pageTextCharacters'] }>;

/**
 * This threshold only decides whether OCR is needed. It does not establish field accuracy.
 * Provider acceptance remains benchmark-gated and every extracted field remains review-only.
 */
export const PASHX_MINIMUM_TEXT_LAYER_CHARACTERS_PER_PAGE = 40;

export const routeDocumentExtraction = (
  pageTextCharacters: readonly number[],
): PashxDocumentExtractionRoutingResult => {
  if (
    pageTextCharacters.length === 0 ||
    pageTextCharacters.some(
      (count) => !Number.isSafeInteger(count) || count < 0,
    )
  ) {
    return { valid: false, fieldPaths: ['pageTextCharacters'] };
  }

  const usableTextPages = pageTextCharacters.filter(
    (count) => count >= PASHX_MINIMUM_TEXT_LAYER_CHARACTERS_PER_PAGE,
  ).length;

  if (usableTextPages === pageTextCharacters.length) {
    return { valid: true, path: 'TEXT_LAYER' };
  }
  if (usableTextPages === 0) {
    return { valid: true, path: 'OCR_ONLY' };
  }

  return { valid: true, path: 'HYBRID_OCR' };
};
