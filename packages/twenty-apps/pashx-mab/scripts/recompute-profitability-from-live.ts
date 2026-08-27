/* eslint-disable no-console -- standalone coordinator verification tool. */
/**
 * Recompute the honest Operational profitability totals from a live data dump.
 *
 * Coordinator tool: runs the SAME frozen aggregation (`aggregateOperationalProfitability` +
 * inclusion rules) over live records, so the dashboard's revenue/cost/margin numbers are
 * proven derivable from stored data — the "cash evidence" the coordinator mandate names.
 *
 * Usage:
 *   node --import tsx scripts/recompute-profitability-from-live.ts <dumpDir>
 *
 * <dumpDir> must contain procurementCases.json, commercialDocuments.json and expenses.json in
 * the REST list shape { data: { <plural>: [...] } }.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  aggregateOperationalProfitability,
  OPERATIONAL_PROFITABILITY_INCLUSION_RULES,
} from '../src/profitability/aggregate-operational-profitability';
import type {
  ProfitabilityComplianceStatus,
  ProfitabilityLifecycleStatus,
  ProfitabilitySourceRecord,
} from '../src/profitability/operational-profitability.types';

const dumpDir = process.argv[2];

if (dumpDir === undefined) {
  console.error(
    'Usage: node --import tsx scripts/recompute-profitability-from-live.ts <dumpDir>',
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

const cases = new Map(
  readDump('procurementCases').map((row: Record<string, unknown>) => [
    String(row.id),
    {
      caseRecordId: String(row.id),
      caseName: String(row.name),
      customerRecordId: toNullable(row.customerRecordId),
      projectName: toNullable(row.projectName),
      ownerRecordId: toNullable(row.ownerRecordId),
    },
  ]),
);

const records: ProfitabilitySourceRecord[] = readDump(
  'commercialDocuments',
).map((row: Record<string, unknown>) => {
  const totalAmount = row.totalAmount as
    | { amountMicros?: number | null; currencyCode?: string | null }
    | null
    | undefined;
  const caseRecordId = String(row.procurementCaseRecordId);

  return {
    recordId: String(row.id),
    recordName: String(row.name),
    occurredOn: toNullable(row.issueDate),
    amountMicros: totalAmount?.amountMicros ?? null,
    currencyCode: totalAmount?.currencyCode ?? toNullable(row.currencyCode),
    caseDimension: cases.get(caseRecordId) ?? null,
    sourceType: 'DOCUMENT' as const,
    documentType: String(row.documentType),
    lifecycleStatus: String(
      row.lifecycleStatus,
    ) as ProfitabilityLifecycleStatus,
    complianceStatus: toNullable(
      row.complianceStatus,
    ) as ProfitabilityComplianceStatus | null,
  };
});

const result = aggregateOperationalProfitability({
  records,
  filters: {
    // Empty optional arrays would filter everything out (an empty selection matches nothing);
    // omitting them means "no dimension filter", matching the unfiltered dashboard state.
    periodStart: '2000-01-01',
    periodEndExclusive: '2100-01-01',
  },
  asOf: new Date().toISOString(),
});

console.log('Frozen inclusion rules:');
for (const rule of OPERATIONAL_PROFITABILITY_INCLUSION_RULES) {
  console.log(`  - ${rule}`);
}
console.log('Per-currency totals:');
for (const currency of result.currencies) {
  const revenue = Number(currency.finalizedRevenueMicros) / 1_000_000;
  const cost = Number(currency.directCostMicros) / 1_000_000;

  console.log(
    `  ${currency.currencyCode}: revenue=${revenue} cost=${cost} profit=${revenue - cost} marginBps=${currency.grossMarginBasisPoints ?? 'n/a'}`,
  );
}
console.log('Exclusions:');
for (const [reason, count] of Object.entries(result.quality.exclusions)) {
  if (count > 0) console.log(`  ${reason}: ${count}`);
}
console.log(
  `Records: ${result.quality.sourceRecordCount} source, ${result.quality.includedRecordCount} included, ${result.quality.excludedRecordCount} excluded`,
);
