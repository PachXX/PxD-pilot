import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  PASHX_COMMAND_CENTRE_REASON_CODES,
  PASHX_INSIGHT_CONFIDENCE_LEVELS,
  PASHX_INSIGHT_TYPES,
  PASHX_OPERATIONAL_WORK_SIGNALS,
  PASHX_PROCUREMENT_CASE_STAGES,
  type PashxApprovalQueueItem,
  type PashxCommandCentreItem,
  type PashxEvidenceInsight,
  type PashxOperationalCommandCentreResult,
  type PashxOperationalWorkItem,
} from 'pashx-mab-contract';

import {
  formatCommandCentreDateTime,
  getCommandCentreRecordHref,
  getInsightRecordHref,
  getOperationalWorkItemHref,
  groupCommandCentreItems,
  groupOperationalWorkItems,
  resolveInsightSourceLinks,
} from '../src/command-centre/command-centre.model';
import {
  commandCentreCopy,
  toCommandCentreLocale,
} from '../src/front-components/command-centre.copy';
import { commandCentreStyles } from '../src/front-components/command-centre.styles';

const componentSource = readFileSync(
  new URL(
    '../src/front-components/command-centre.front-component.tsx',
    import.meta.url,
  ),
  'utf8',
);
const pageLayoutSource = readFileSync(
  new URL('../src/page-layouts/command-centre.page-layout.ts', import.meta.url),
  'utf8',
);
const navigationSource = readFileSync(
  new URL(
    '../src/navigation-menu-items/command-centre.navigation-menu-item.ts',
    import.meta.url,
  ),
  'utf8',
);

const commandItem = (
  signal: PashxCommandCentreItem['signal'],
  recordId: string,
): PashxCommandCentreItem => ({
  signal,
  reasonCode: 'CASE_CUSTOMER_MISSING',
  recordType: 'procurementCase',
  recordId,
  procurementCaseId: recordId,
  caseName: `Case ${recordId}`,
  customerRecordId: null,
  projectName: null,
  ownerRecordId: null,
  stage: 'intake',
  nextActionCode: 'COMPLETE_CASE_DATA',
  actionDueAt: null,
  observedAt: '2026-08-21T10:00:00.000Z',
  sourceUpdatedAt: '2026-08-21T09:00:00.000Z',
});

const approval = (
  id: string,
  overrides: Partial<PashxApprovalQueueItem> = {},
): PashxApprovalQueueItem => ({
  id,
  name: `Approval ${id}`,
  status: 'PENDING',
  requestedActionCode: 'ISSUE_VENDOR_PO',
  requesterRecordId: 'member-1',
  approverRecordId: 'member-2',
  requestedAt: '2026-08-24T08:00:00.000Z',
  sourceRecordIds: ['case-1'],
  ...overrides,
});

const insight = (
  overrides: Partial<PashxEvidenceInsight> = {},
): PashxEvidenceInsight => ({
  id: 'insight-1',
  insightType: 'OBSERVATION',
  narrative: 'Delivery window drifted by three days.',
  sourceRecordIds: ['case-1', 'unknown-record'],
  generatorVersion: 'evidence-analyst@0.2.9',
  generatedAt: '2026-08-24T09:00:00.000Z',
  confidence: 'HIGH',
  ...overrides,
});

const result = (
  overrides: Partial<PashxOperationalCommandCentreResult> = {},
): PashxOperationalCommandCentreResult => ({
  commandItems: [commandItem('BLOCKED_DATA', 'case-1')],
  approvals: [approval('approval-1')],
  insights: [insight()],
  isPartial: false,
  asOf: '2026-08-24T10:00:00.000Z',
  ...overrides,
});

test('frozen operational precedence is compliance, approvals, blocked data, actions', () => {
  assert.deepEqual(PASHX_OPERATIONAL_WORK_SIGNALS, [
    'COMPLIANCE_EXCEPTION',
    'APPROVAL_REQUIRED',
    'BLOCKED_DATA',
    'ACTION_REQUIRED',
  ]);
});

test('operational groups preserve approved precedence and items within each signal', () => {
  const groups = groupOperationalWorkItems([
    { signal: 'ACTION_REQUIRED', source: 'COMMAND_CENTRE', item: commandItem('ACTION_REQUIRED', 'action') },
    { signal: 'COMPLIANCE_EXCEPTION', source: 'COMMAND_CENTRE', item: commandItem('COMPLIANCE_EXCEPTION', 'compliance') },
    { signal: 'APPROVAL_REQUIRED', source: 'APPROVAL_REQUEST', item: approval('approval') },
    { signal: 'BLOCKED_DATA', source: 'COMMAND_CENTRE', item: commandItem('BLOCKED_DATA', 'blocked') },
  ]);

  assert.deepEqual(
    groups.map(({ signal }) => signal),
    [
      'COMPLIANCE_EXCEPTION',
      'APPROVAL_REQUIRED',
      'BLOCKED_DATA',
      'ACTION_REQUIRED',
    ],
  );
  assert.deepEqual(groups[1]?.items.map(({ source }) => source), [
    'APPROVAL_REQUEST',
  ]);
});

test('command-item groups retain the three-signal model', () => {
  const groups = groupCommandCentreItems([
    commandItem('ACTION_REQUIRED', 'action'),
    commandItem('BLOCKED_DATA', 'blocked'),
  ]);
  assert.deepEqual(
    groups.map(({ signal }) => signal),
    ['COMPLIANCE_EXCEPTION', 'BLOCKED_DATA', 'ACTION_REQUIRED'],
  );
});

test('evidence links target native Twenty records and dates are render-safe', () => {
  assert.equal(
    getCommandCentreRecordHref(commandItem('BLOCKED_DATA', 'case-1')),
    '/object/procurementCase/case-1',
  );
  const workItem: PashxOperationalWorkItem = {
    signal: 'APPROVAL_REQUIRED',
    source: 'APPROVAL_REQUEST',
    item: approval('approval-1'),
  };
  assert.equal(
    getOperationalWorkItemHref(workItem),
    '/object/approvalRequest/approval-1',
  );
  assert.equal(
    getOperationalWorkItemHref({
      signal: 'BLOCKED_DATA',
      source: 'COMMAND_CENTRE',
      item: commandItem('BLOCKED_DATA', 'case-1'),
    }),
    '/object/procurementCase/case-1',
  );
  assert.equal(
    getInsightRecordHref(insight()),
    '/object/operationalInsight/insight-1',
  );
  assert.equal(formatCommandCentreDateTime('', 'en'), '—');
  assert.equal(formatCommandCentreDateTime('bad-date', 'ar'), '—');
  assert.match(
    formatCommandCentreDateTime('2026-08-21T10:00:00.000Z', 'en'),
    /21 Aug 2026.*13:00/,
  );
  assert.match(
    formatCommandCentreDateTime('2026-08-21T10:00:00.000Z', 'ar'),
    /\p{Script=Arabic}/u,
  );
});

test('insight source links resolve only against loaded records and stay honest otherwise', () => {
  const links = resolveInsightSourceLinks(insight(), result());
  assert.deepEqual(links, [
    { kind: 'link', objectName: 'procurementCase', recordId: 'case-1', href: '/object/procurementCase/case-1' },
    { kind: 'plain', recordId: 'unknown-record' },
  ]);
});

test('insight sources resolve approvals and insights as well as command records', () => {
  const links = resolveInsightSourceLinks(
    insight({ sourceRecordIds: ['approval-1', 'insight-1'] }),
    result(),
  );
  assert.deepEqual(links, [
    { kind: 'link', objectName: 'approvalRequest', recordId: 'approval-1', href: '/object/approvalRequest/approval-1' },
    { kind: 'link', objectName: 'operationalInsight', recordId: 'insight-1', href: '/object/operationalInsight/insight-1' },
  ]);
});

test('English and Arabic copy exhaust every signal, reason, stage, insight type, and confidence', () => {
  assert.deepEqual(
    Object.keys(commandCentreCopy.en).sort(),
    Object.keys(commandCentreCopy.ar).sort(),
  );
  for (const locale of ['en', 'ar'] as const) {
    const copy = commandCentreCopy[locale];
    assert.deepEqual(
      Object.keys(copy.signals),
      [...PASHX_OPERATIONAL_WORK_SIGNALS],
    );
    assert.deepEqual(
      Object.keys(copy.signalDescriptions),
      [...PASHX_OPERATIONAL_WORK_SIGNALS],
    );
    assert.deepEqual(
      Object.keys(copy.reasons).sort(),
      [...PASHX_COMMAND_CENTRE_REASON_CODES].sort(),
    );
    assert.deepEqual(
      Object.keys(copy.stages).sort(),
      [...PASHX_PROCUREMENT_CASE_STAGES].sort(),
    );
    assert.deepEqual(
      Object.keys(copy.insightTypeLabels).sort(),
      [...PASHX_INSIGHT_TYPES].sort(),
    );
    assert.deepEqual(
      Object.keys(copy.confidenceLabels).sort(),
      [...PASHX_INSIGHT_CONFIDENCE_LEVELS].sort(),
    );
    for (const value of [
      ...Object.values(copy.signals),
      ...Object.values(copy.signalDescriptions),
      ...Object.values(copy.reasons),
      ...Object.values(copy.stages),
      ...Object.values(copy.insightTypeLabels),
      ...Object.values(copy.confidenceLabels),
      copy.insightsTitle,
      copy.insightsEmpty,
      copy.unavailableTitle,
      copy.unavailableState,
      copy.emailUnavailableReason,
      copy.ocrUnavailableReason,
      copy.insightTypeUnknown,
      copy.confidenceUnknown,
      copy.confidenceLabel,
    ]) {
      assert.notEqual(value.trim(), '');
    }
  }
  assert.match(commandCentreCopy.ar.title, /\p{Script=Arabic}/u);
  assert.equal(toCommandCentreLocale('ar-SA'), 'ar');
  assert.equal(toCommandCentreLocale('en-GB'), 'en');
});

test('unavailable states are honest: never simulated email or OCR capabilities', () => {
  assert.match(commandCentreCopy.en.unavailableState, /Unavailable/);
  assert.match(commandCentreCopy.ar.unavailableState, /\p{Script=Arabic}/u);
  assert.match(commandCentreCopy.en.emailUnavailableReason, /OC5/);
  assert.match(commandCentreCopy.en.ocrUnavailableReason, /OC5-OCR/);
  assert.doesNotMatch(componentSource, /PashxEmailIntakeCandidate/);
  assert.doesNotMatch(componentSource, /proposal/i);
  assert.doesNotMatch(componentSource, /simulate/i);
});

test('native page is source-only, evidence-linked, and exposes complete runtime states', () => {
  for (const pattern of [
    /lang=\{locale\}/,
    /dir=\{locale === 'ar' \? 'rtl' : 'ltr'\}/,
    /data-color-scheme=\{colorScheme\}/,
    /aria-busy=\{loading\}/,
    /aria-live="polite"/,
    /role="alert"/,
    /role="status"/,
    /workQueue\.length === 0/,
    /result\?\.isPartial/,
    /target="_top"/,
    /getOperationalWorkItemHref\(item\)/,
    /<table className="pxd-command__table">/,
    /<th scope="col">/,
    /workQueue\.map/,
    /buildOperationalWorkQueue\(\{/,
    /resolveInsightSourceLinks\(/,
    /getInsightRecordHref\(/,
    /result\.insights/,
    /copy\.unavailableState/,
    /copy\.emailUnavailableReason/,
    /copy\.ocrUnavailableReason/,
  ]) {
    assert.match(componentSource, pattern);
  }
  assert.doesNotMatch(componentSource, /tabIndex=\{?[1-9]/);
  assert.doesNotMatch(
    componentSource,
    /\.(create|update|delete|destroy|mutate)\s*\(/,
  );
  // Precedence lives in the shared queue builder, never re-implemented in JSX.
  assert.doesNotMatch(componentSource, /SIGNAL_PRIORITY|signalRank/);
  assert.match(pageLayoutSource, /PageLayoutType\.STANDALONE_PAGE/);
  assert.match(navigationSource, /NavigationMenuItemType\.PAGE_LAYOUT/);
  assert.match(navigationSource, /position: 0/);
});

test('styles preserve keyboard, touch, RTL, dark-theme, reduced-motion, and zoom foundations', () => {
  for (const pattern of [
    /:focus-visible/,
    /outline: 3px solid/,
    /min-height: 44px/,
    /font-size: 16px/,
    /\.pxd-command\[dir="rtl"\]/,
    /\.pxd-command\[data-color-scheme="dark"\]/,
    /prefers-reduced-motion: reduce/,
    /overflow-wrap: anywhere/,
    /@media \(max-width: 900px\)/,
    /@media \(max-width: 560px\)/,
    /grid-template-columns: minmax\(0, 3fr\) minmax\(240px, 1fr\)/,
    /border-collapse: collapse/,
    /repeat\(4, minmax\(0, 1fr\)\)/,
    /\.pxd-command__signal-dot--approval_required/,
    /unicode-bidi: isolate/,
  ]) {
    assert.match(commandCentreStyles, pattern);
  }
  assert.doesNotMatch(commandCentreStyles, /outline:\s*none/);
  assert.doesNotMatch(commandCentreStyles, /box-shadow/);
  assert.doesNotMatch(commandCentreStyles, /border-radius:\s*(?:1[0-9]|[2-9][0-9])px/);
});
