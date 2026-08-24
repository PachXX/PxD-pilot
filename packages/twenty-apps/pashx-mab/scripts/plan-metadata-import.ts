import { readFileSync } from 'node:fs';

import { MAB_COMPANY_SOURCES } from '../src/metadata-import/mab-metadata-source';
import {
  type ExistingMabCompany,
  planMabCompanyImport,
} from '../src/metadata-import/plan-company-import';

const inputPath = process.argv[2];
if (inputPath === undefined) {
  throw new Error('Usage: yarn metadata:plan <existing-companies.json>');
}

const parsed = JSON.parse(readFileSync(inputPath, 'utf8')) as unknown;
if (!Array.isArray(parsed)) {
  throw new Error('Existing-company inventory must be a JSON array.');
}

const plan = planMabCompanyImport(
  MAB_COMPANY_SOURCES,
  parsed as readonly ExistingMabCompany[],
);
const summary = Object.fromEntries(
  ['CREATE', 'UPDATE', 'SKIP', 'CONFLICT'].map((action) => [
    action,
    plan.filter((item) => item.action === action).length,
  ]),
);

process.stdout.write(`${JSON.stringify({ summary, plan }, null, 2)}\n`);
if (summary.CONFLICT !== 0) process.exitCode = 2;
