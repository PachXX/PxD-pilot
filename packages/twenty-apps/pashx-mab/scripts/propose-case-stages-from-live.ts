/* eslint-disable no-console -- standalone coordinator decision-support tool. */
/**
 * Propose candidate stages for imported cases from finalized document evidence.
 *
 * Decision-support only: derives a FORWARD candidate stage per case from finalized documents
 * against the frozen WF1 transition requirements, then prints it with the evidence and any
 * contradictions. It NEVER writes anything, never infers from filenames, and never proposes
 * closed/cancelled. Applying any proposal requires Shahil's explicit confirmation.
 *
 * Usage:
 *   node --import tsx scripts/propose-case-stages-from-live.ts <dumpDir>
 *
 * <dumpDir> must contain procurementCases.json and commercialDocuments.json in the REST list
 * shape { data: { <plural>: [...] } }.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PASHX_PROCUREMENT_CASE_STAGES } from 'pashx-mab-contract';

const dumpDir = process.argv[2];

if (dumpDir === undefined) {
  console.error(
    'Usage: node --import tsx scripts/propose-case-stages-from-live.ts <dumpDir>',
  );
  process.exit(2);
}

const readDump = (objectPlural: string): unknown[] => {
  const parsed = JSON.parse(
    readFileSync(join(dumpDir, `${objectPlural}.json`), 'utf8'),
  ) as { data: Record<string, unknown[]> };

  return parsed.data[objectPlural] ?? [];
};

const toCamel = (value: string): string =>
  value
    .toLowerCase()
    .replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());

// Frozen WF1 evidence step: which finalized document role advances the case to which stage.
// Keyed by contract document type; values are the earliest stage the finalized evidence proves.
const FINALIZED_EVIDENCE_STAGE: Readonly<Record<string, string>> = {
  customerRfq: 'sourcing',
  vendorQuote: 'quoted',
  customerQuote: 'quoted',
  customerPurchaseOrder: 'customer-order',
  vendorPurchaseOrder: 'vendor-order',
  deliveryNote: 'invoicing',
  customerInvoice: 'invoicing',
};

const stageRank = new Map(
  PASHX_PROCUREMENT_CASE_STAGES.map((stage, index) => [stage, index]),
);

const cases = readDump('procurementCases') as Record<string, unknown>[];
const documents = readDump('commercialDocuments') as Record<string, unknown>[];

for (const caseRecord of cases) {
  const caseId = String(caseRecord.id);
  const finalized = documents.filter(
    (document) =>
      String(document.procurementCaseRecordId) === caseId &&
      String(document.lifecycleStatus) === 'FINALIZED',
  );
  const evidence: string[] = [];
  let candidateRank = -1;

  for (const document of finalized) {
    const contractType = toCamel(String(document.documentType));
    const impliedStage = FINALIZED_EVIDENCE_STAGE[contractType];

    if (impliedStage !== undefined) {
      evidence.push(`${String(document.name)} (${contractType})`);
      candidateRank = Math.max(
        candidateRank,
        stageRank.get(impliedStage) ?? -1,
      );
    }
  }

  // Contradiction check: a finalized customer invoice with a DRAFT customer PO means the
  // imports do not form a clean forward chain; flag it instead of claiming readiness.
  const hasFinalizedInvoice = finalized.some(
    (document) => toCamel(String(document.documentType)) === 'customerInvoice',
  );
  const hasDraftCustomerPo = documents.some(
    (document) =>
      String(document.procurementCaseRecordId) === caseId &&
      toCamel(String(document.documentType)) === 'customerPurchaseOrder' &&
      String(document.lifecycleStatus) !== 'FINALIZED',
  );
  const contradiction =
    hasFinalizedInvoice && hasDraftCustomerPo
      ? ' (contradiction: finalized invoice(s) while the customer PO is not finalized)'
      : '';

  console.log(`=== ${String(caseRecord.name)} (${caseId.slice(0, 8)}) ===`);
  if (evidence.length === 0) {
    console.log('  candidate: none — no finalized workflow evidence');
  } else {
    const candidate =
      PASHX_PROCUREMENT_CASE_STAGES[candidateRank] ?? 'invoicing';
    console.log(`  candidate: ${candidate}${contradiction}`);
    console.log(`  evidence: ${evidence.join(', ')}`);
  }
  console.log(
    '  status: PROPOSAL ONLY — requires Shahil confirmation before any write',
  );
}
