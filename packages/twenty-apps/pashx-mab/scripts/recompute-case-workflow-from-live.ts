/* eslint-disable no-console -- standalone coordinator verification tool. */
/**
 * Recompute the honest Case workflow page state for every case from a live data dump.
 *
 * Coordinator tool: proves each Case workflow surface (stage rail, documents, price
 * comparison, delivery, invoice readiness) is derivable from stored records via the SAME pure
 * model functions the UI uses. Nothing is invented; stage-null cases render without a current
 * marker by design (MI never infers stages from filenames).
 *
 * Usage:
 *   node --import tsx scripts/recompute-case-workflow-from-live.ts <dumpDir>
 *
 * <dumpDir> must contain procurementCases.json and commercialDocuments.json in the REST list
 * shape { data: { <plural>: [...] } }.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildCaseStageRail,
  buildDeliveryState,
  buildInvoiceReadiness,
  buildPriceComparisonRows,
  formatWorkflowAmount,
} from '../src/case-workflow/case-workflow.model';
import type {
  CaseWorkflowCaseRecord,
  CaseWorkflowDocumentRecord,
} from '../src/case-workflow/case-workflow.types';

const dumpDir = process.argv[2];

if (dumpDir === undefined) {
  console.error(
    'Usage: node --import tsx scripts/recompute-case-workflow-from-live.ts <dumpDir>',
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

// Stored select values are UPPER_SNAKE; contract vocabulary is kebab (stages) or camel
// (delivery statuses, document types).
const toKebab = (value: string): string =>
  value.toLowerCase().replace(/_/g, '-');
const toCamel = (value: string): string =>
  value
    .toLowerCase()
    .replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());

const cases: CaseWorkflowCaseRecord[] = readDump('procurementCases').map(
  (row: Record<string, unknown>) => ({
    id: String(row.id),
    name: String(row.name),
    stage:
      toNullable(row.stage) === null
        ? null
        : (toKebab(String(row.stage)) as CaseWorkflowCaseRecord['stage']),
    deliveryStatus:
      toNullable(row.deliveryStatus) === null
        ? null
        : (toCamel(
            String(row.deliveryStatus),
          ) as CaseWorkflowCaseRecord['deliveryStatus']),
    deliveryDueAt: toNullable(row.deliveryDueAt),
    updatedAt: String(row.updatedAt),
  }),
);

const documents: CaseWorkflowDocumentRecord[] = readDump(
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
        : (toCamel(
            String(row.documentType),
          ) as CaseWorkflowDocumentRecord['documentType']),
    lifecycleStatus: toNullable(row.lifecycleStatus),
    supplierRecordId: toNullable(row.supplierRecordId),
    issueDate: toNullable(row.issueDate),
    currencyCode: totalAmount?.currencyCode ?? toNullable(row.currencyCode),
    totalAmountMicros: totalAmount?.amountMicros ?? null,
  };
});

for (const caseRecord of cases) {
  const rail = buildCaseStageRail(caseRecord.stage);
  const readiness = buildInvoiceReadiness(documents, caseRecord.id);
  const comparison = buildPriceComparisonRows(documents, caseRecord.id);
  const delivery = buildDeliveryState(caseRecord, documents);

  console.log(`=== ${caseRecord.name} (${caseRecord.id.slice(0, 8)}) ===`);
  console.log(
    `rail: ${rail.map((entry) => `${entry.stage}:${entry.state}`).join(' ')}`,
  );
  console.log(
    `price comparison: ${comparison.length === 0 ? '(none)' : comparison.map((row) => `${row.documentName} ${formatWorkflowAmount(row.totalAmountMicros, row.currencyCode, 'en')} ${row.lifecycleStatus}`).join(' | ')}`,
  );
  console.log(
    `delivery: ${delivery.status} due=${delivery.dueAt ?? '(none)'} notes=${delivery.deliveryNoteCount} finalized=${delivery.finalizedDeliveryNoteCount}`,
  );
  console.log(
    `invoice readiness: cpo=${readiness.finalizedCustomerPurchaseOrderCount}/${readiness.customerPurchaseOrderCount} dn=${readiness.finalizedDeliveryNoteCount}/${readiness.deliveryNoteCount} invoice=${readiness.finalizedCustomerInvoiceCount}/${readiness.customerInvoiceCount} missing=[${readiness.missingReasons.join(', ')}]`,
  );
}
