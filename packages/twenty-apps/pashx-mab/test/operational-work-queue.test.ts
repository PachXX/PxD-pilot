import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  PashxApprovalQueueItem,
  PashxCommandCentreItem,
} from 'pashx-mab-contract';

import { buildOperationalWorkQueue } from '../src/command-centre/build-operational-work-queue';

const commandItem = (
  signal: PashxCommandCentreItem['signal'],
  recordId: string,
): PashxCommandCentreItem => ({
  signal,
  reasonCode:
    signal === 'COMPLIANCE_EXCEPTION'
      ? 'COMPLIANCE_REJECTED'
      : signal === 'BLOCKED_DATA'
        ? 'CASE_CUSTOMER_MISSING'
        : 'DRAFT_DOCUMENT_REVIEW_REQUIRED',
  recordType: 'procurementCase',
  recordId,
  procurementCaseId: recordId,
  caseName: recordId,
  customerRecordId: null,
  projectName: null,
  ownerRecordId: null,
  stage: 'intake',
  nextActionCode: null,
  actionDueAt: null,
  observedAt: '2026-08-21T12:00:00.000Z',
  sourceUpdatedAt: '2026-08-21T11:00:00.000Z',
});

const approval = (
  id: string,
  status: PashxApprovalQueueItem['status'],
): PashxApprovalQueueItem => ({
  id,
  name: id,
  status,
  requestedActionCode: 'ISSUE_VENDOR_PO',
  requesterRecordId: 'requester',
  approverRecordId: 'approver',
  requestedAt: '2026-08-21T10:00:00.000Z',
  sourceRecordIds: ['case-1'],
});

test('orders deterministic work by compliance, approval, blocked data, then action', () => {
  const queue = buildOperationalWorkQueue({
    commandItems: [
      commandItem('ACTION_REQUIRED', 'action'),
      commandItem('BLOCKED_DATA', 'blocked'),
      commandItem('COMPLIANCE_EXCEPTION', 'compliance'),
    ],
    approvals: [approval('approval', 'PENDING')],
  });
  assert.deepEqual(queue.map(({ signal }) => signal), [
    'COMPLIANCE_EXCEPTION',
    'APPROVAL_REQUIRED',
    'BLOCKED_DATA',
    'ACTION_REQUIRED',
  ]);
});

test('excludes decided approvals and sorts equal signals stably', () => {
  const queue = buildOperationalWorkQueue({
    commandItems: [],
    approvals: [
      approval('b', 'PENDING'),
      approval('ignored', 'APPROVED'),
      approval('a', 'PENDING'),
    ],
  });
  assert.deepEqual(
    queue.map((workItem) =>
      workItem.source === 'APPROVAL_REQUEST'
        ? workItem.item.id
        : workItem.item.recordId,
    ),
    ['a', 'b'],
  );
});
