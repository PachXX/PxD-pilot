/* eslint-disable no-console -- standalone coordinator verification tool. */
/**
 * Recompute the honest Vendor comparison page state from a live data dump.
 *
 * Coordinator tool: runs the SAME vendor-comparison model functions the parallel-lane page
 * uses (`selectFinalizedVendorQuotes`, `buildVendorComparisonRecommendation`,
 * `buildEvidenceCompleteness`) over the live records, proving the page shows real quotes and a
 * deterministic recommendation (or an honest no-recommendation state).
 *
 * Usage:
 *   node --import tsx scripts/recompute-vendor-comparison-from-live.ts <dumpDir>
 *
 * <dumpDir> must contain procurementCases.json, commercialDocuments.json and companies.json in
 * the REST list shape { data: { <plural>: [...] } }.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PASHX_COMMERCIAL_DOCUMENT_TYPES } from 'pashx-mab-contract';

import {
  buildEvidenceCompleteness,
  buildVendorComparisonRecommendation,
  selectFinalizedVendorQuotes,
} from '../src/vendor-comparison/vendor-comparison.model';
import type {
  VendorComparisonCaseRecord,
  VendorComparisonDocumentRecord,
} from '../src/vendor-comparison/vendor-comparison.types';

const dumpDir = process.argv[2];

if (dumpDir === undefined) {
  console.error(
    'Usage: node --import tsx scripts/recompute-vendor-comparison-from-live.ts <dumpDir>',
  );
  process.exit(2);
}

const readDump = (objectPlural: string): unknown[] => {
  const parsed = JSON.parse(
    readFileSync(join(dumpDir, `${objectPlural}.json`), 'utf8'),
  ) as { data: Record<string, unknown[]> };

  return parsed.data[objectPlural] ?? [];
};

const toNullable = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

const toCamel = (value: string): string =>
  value
    .toLowerCase()
    .replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());

const cases: VendorComparisonCaseRecord[] = readDump('procurementCases').map(
  (row: Record<string, unknown>) => ({
    id: String(row.id),
    name: String(row.name),
    stage:
      toNullable(row.stage) === null
        ? null
        : (toNullable(row.stage)!
            .toLowerCase()
            .replace(/_/g, '-') as VendorComparisonCaseRecord['stage']),
    customerRecordId: toNullable(row.customerRecordId),
    nextActionCode: toNullable(row.nextActionCode),
    actionDueAt: toNullable(row.actionDueAt),
    supplierResponseDeadlineAt: toNullable(row.supplierResponseDeadlineAt),
  }),
);

const documents: VendorComparisonDocumentRecord[] = readDump(
  'commercialDocuments',
).map((row: Record<string, unknown>) => {
  const totalAmount = row.totalAmount as
    | { amountMicros?: number | null; currencyCode?: string | null }
    | null
    | undefined;

  return {
    id: String(row.id),
    name: String(row.name),
    procurementCaseRecordId: String(row.procurementCaseRecordId),
    documentType:
      toNullable(row.documentType) === null
        ? null
        : (PASHX_COMMERCIAL_DOCUMENT_TYPES.find(
            (documentType) =>
              documentType === toCamel(String(row.documentType)),
          ) ?? null),
    lifecycleStatus: toNullable(row.lifecycleStatus),
    supplierRecordId: toNullable(row.supplierRecordId),
    issueDate: toNullable(row.issueDate),
    currencyCode: totalAmount?.currencyCode ?? toNullable(row.currencyCode),
    totalAmountMicros: totalAmount?.amountMicros ?? null,
    leadTimeDays:
      typeof row.leadTimeDays === 'number' ? row.leadTimeDays : null,
    paymentTerms: toNullable(row.paymentTerms),
    validUntil: toNullable(row.validUntil),
  };
});

const asOf = new Date().toISOString();

for (const caseRecord of cases) {
  const caseDocuments = documents.filter(
    (document) => document.procurementCaseRecordId === caseRecord.id,
  );
  const finalizedQuotes = selectFinalizedVendorQuotes(caseDocuments);
  const recommendation = buildVendorComparisonRecommendation(
    finalizedQuotes,
    asOf,
  );
  const completeness = buildEvidenceCompleteness(caseDocuments);

  console.log(`=== ${caseRecord.name} (${caseRecord.id.slice(0, 8)}) ===`);
  console.log(
    `finalized quotes: ${finalizedQuotes.length} (all quotes on case: ${caseDocuments.filter((document) => document.documentType === 'vendorQuote').length})`,
  );
  for (const quote of finalizedQuotes) {
    console.log(
      `  ${quote.name} supplier=${quote.supplierRecordId?.slice(0, 8) ?? '(none)'} total=${quote.totalAmountMicros === null ? '(missing)' : quote.totalAmountMicros / 1_000_000} ${quote.currencyCode ?? '(no currency)'}`,
    );
  }
  console.log(`recommendation: ${JSON.stringify(recommendation)}`);
  console.log(
    `evidence completeness: ${JSON.stringify(completeness).slice(0, 240)}`,
  );
}
