/* eslint-disable no-console -- standalone coordinator verification tool. */
/**
 * Recompute the Command Centre's honest four-signal ledger from a live data dump.
 *
 * Coordinator tool: proves that every number the Command Centre would render is derivable
 * from stored records. It feeds the SAME pure classifier and work-queue builder the UI uses
 * (`classifyCommandCentre` + `buildOperationalWorkQueue`) with records read from the live
 * REST inventory, so the output is the bounded read model's prediction — nothing invented.
 *
 * Usage:
 *   node --import tsx scripts/recompute-command-centre-from-live.ts <dumpDir> [currentUserRecordId]
 *
 * <dumpDir> must contain procurementCases.json, commercialDocuments.json, expenses.json and
 * approvalRequests.json in the REST list shape { data: { <plural>: [...] } }.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type PashxApprovalQueueItem } from 'pashx-mab-contract';

import { buildOperationalWorkQueue } from '../src/command-centre/build-operational-work-queue';
import { classifyCommandCentre } from '../src/command-centre/classify-command-centre';
import type {
  CommandCentreCaseRecord,
  CommandCentreDocumentRecord,
  CommandCentreExpenseRecord,
} from '../src/command-centre/command-centre.types';

const dumpDir = process.argv[2];
const currentUserRecordId = process.argv[3] ?? '';

if (dumpDir === undefined) {
  console.error(
    'Usage: node --import tsx scripts/recompute-command-centre-from-live.ts <dumpDir> [currentUserRecordId]',
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

const cases: CommandCentreCaseRecord[] = readDump('procurementCases').map(
  (row: Record<string, unknown>) => ({
    id: String(row.id),
    name: String(row.name),
    customerRecordId: toNullable(row.customerRecordId),
    projectName: toNullable(row.projectName),
    ownerRecordId: toNullable(row.ownerRecordId),
    stage: toNullable(row.stage) as CommandCentreCaseRecord['stage'],
    nextActionCode: toNullable(
      row.nextActionCode,
    ) as CommandCentreCaseRecord['nextActionCode'],
    actionDueAt: toNullable(row.actionDueAt),
    blockedReasonCode: toNullable(
      row.blockedReasonCode,
    ) as CommandCentreCaseRecord['blockedReasonCode'],
    updatedAt: String(row.updatedAt),
  }),
);

const documents: CommandCentreDocumentRecord[] = readDump(
  'commercialDocuments',
).map((row: Record<string, unknown>) => ({
  id: String(row.id),
  procurementCaseRecordId: String(row.procurementCaseRecordId),
  documentType: String(row.documentType),
  lifecycleStatus: String(row.lifecycleStatus),
  complianceStatus: toNullable(row.complianceStatus),
  supplierRecordId: toNullable(row.supplierRecordId),
  issueDate: toNullable(row.issueDate),
  currencyCode: toNullable(row.currencyCode),
  updatedAt: String(row.updatedAt),
}));

const expenses: CommandCentreExpenseRecord[] = readDump('expenses').map(
  (row: Record<string, unknown>) => ({
    id: String(row.id),
    procurementCaseRecordId: String(row.procurementCaseRecordId),
    approvalStatus: String(row.approvalStatus),
    updatedAt: String(row.updatedAt),
  }),
);

const approvals: PashxApprovalQueueItem[] = readDump('approvalRequests').map(
  (row: Record<string, unknown>) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    status: String(row.status) as PashxApprovalQueueItem['status'],
    requestedActionCode: String(row.requestedActionCode ?? ''),
    requesterRecordId: String(row.requesterRecordId ?? ''),
    approverRecordId: toNullable(row.approverRecordId),
    requestedAt: String(row.requestedAt ?? ''),
    sourceRecordIds: Array.isArray(row.sourceRecordIds)
      ? row.sourceRecordIds.filter((id): id is string => typeof id === 'string')
      : [],
  }),
);

const observedAt = new Date().toISOString();
const commandItems = classifyCommandCentre({
  cases,
  documents,
  expenses,
  currentUserRecordId,
  observedAt,
});
const queue = buildOperationalWorkQueue({ commandItems, approvals });

const countBySignal = (signal: string): number =>
  queue.filter((item) => item.signal === signal).length;

console.log(`Observed ${observedAt}`);
console.log(
  `Current user record id: ${currentUserRecordId === '' ? '(none supplied)' : currentUserRecordId}`,
);
console.log('--- four-signal band (frozen precedence) ---');
for (const signal of [
  'COMPLIANCE_EXCEPTION',
  'APPROVAL_REQUIRED',
  'BLOCKED_DATA',
  'ACTION_REQUIRED',
]) {
  console.log(`${signal}: ${countBySignal(signal)}`);
}
console.log('--- priority ledger ---');
for (const item of queue) {
  if (item.source === 'APPROVAL_REQUEST') {
    console.log(
      `[${item.signal}] approval ${item.item.id} "${item.item.name}" requested ${item.item.requestedAt}`,
    );
  } else {
    console.log(
      `[${item.signal}] ${item.item.recordType} ${item.item.recordId} ${item.item.reasonCode} case=${item.item.procurementCaseId} "${item.item.caseName}" updated ${item.item.sourceUpdatedAt}`,
    );
  }
}
console.log(`Total work items: ${queue.length}`);
