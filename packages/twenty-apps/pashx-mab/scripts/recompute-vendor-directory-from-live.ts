/* eslint-disable no-console -- standalone coordinator verification tool. */
/**
 * Recompute the honest Vendors page state from a live data dump.
 *
 * Coordinator tool: runs the SAME vendor-directory model functions the UI uses
 * (`buildVendorDirectoryRows`, `buildRfqEligibleCases`) against the live records, proving the
 * page shows exactly the real suppliers and an honest RFQ-eligible set.
 *
 * Usage:
 *   node --import tsx scripts/recompute-vendor-directory-from-live.ts <dumpDir>
 *
 * <dumpDir> must contain companies.json, procurementCases.json and commercialDocuments.json in
 * the REST list shape { data: { <plural>: [...] } }.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildRfqEligibleCases,
  buildVendorDirectoryRows,
} from '../src/vendor-directory/load-vendor-directory';

const dumpDir = process.argv[2];

if (dumpDir === undefined) {
  console.error(
    'Usage: node --import tsx scripts/recompute-vendor-directory-from-live.ts <dumpDir>',
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

const companies = readDump('companies');
const cases = readDump('procurementCases').map(
  (row: Record<string, unknown>) => ({
    id: String(row.id),
    name: String(row.name),
    stage:
      toNullable(row.stage) === null
        ? null
        : toNullable(row.stage)!.toLowerCase().replace(/_/g, '-'),
    aggregateVersion: Number(row.aggregateVersion),
  }),
);
const documents = readDump('commercialDocuments').map(
  (row: Record<string, unknown>) => ({
    id: String(row.id),
    name: String(row.name),
    procurementCaseRecordId: String(row.procurementCaseRecordId),
    documentType: toNullable(row.documentType),
    lifecycleStatus: toNullable(row.lifecycleStatus),
    supplierRecordId: toNullable(row.supplierRecordId),
  }),
);

const vendors = companies
  .filter(
    (company) =>
      Array.isArray((company as Record<string, unknown>).mabBusinessRoles) &&
      (
        (company as Record<string, unknown>).mabBusinessRoles as unknown[]
      ).includes('SUPPLIER'),
  )
  .map((company) => {
    const row = company as Record<string, unknown>;

    return {
      id: String(row.id),
      name: String(row.name),
      commercialRegistrationNumber: toNullable(
        row.commercialRegistrationNumber,
      ),
      vatRegistrationNumber: toNullable(row.vatRegistrationNumber),
    };
  });

const result = {
  vendors,
  cases: cases.map((caseRecord) => ({
    ...caseRecord,
    stage: caseRecord.stage as never,
  })),
  documents,
  isPartial: false,
  asOf: new Date().toISOString(),
};

console.log(`Suppliers with role: ${vendors.length}`);
for (const row of buildVendorDirectoryRows(result)) {
  console.log(
    `${row.vendor.name} | open RFQs: ${row.openSupplierRfqCount} | quotes: ${row.vendorQuoteCount} | active cases: ${JSON.stringify(row.activeCaseNames)}`,
  );
}

const eligible = buildRfqEligibleCases(result.cases, documents);
console.log(
  `RFQ-eligible cases: ${eligible.length}${
    eligible.length === 0
      ? ' (none — no live case is in Intake/Sourcing with a client RFQ)'
      : ` ${eligible.map((entry) => entry.name).join(', ')}`
  }`,
);
