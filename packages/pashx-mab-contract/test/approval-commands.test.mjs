import assert from 'node:assert/strict';
import test from 'node:test';
import {
  approvalStatusForDecision,
  validateDecideApproval,
  validateRequestApproval,
} from '../dist/index.js';

const id = '11111111-1111-4111-8111-111111111111';
test('approval request requires stable ids, digest, evidence and bounded text', () => {
  const valid = validateRequestApproval({
    contractVersion: 1,
    approvalRequestRecordId: id,
    idempotencyKey: 'request:1',
    name: 'Issue vendor PO',
    requestedActionCode: 'ISSUE_VENDOR_PO',
    payloadDigest: 'a'.repeat(64),
    sourceRecordIds: [id],
    approverRecordId: id,
  });
  assert.equal(valid.valid, true);
  const invalid = validateRequestApproval({
    contractVersion: 1,
    sourceRecordIds: [],
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.fieldPaths.includes('payloadDigest'));
  assert.ok(invalid.fieldPaths.includes('sourceRecordIds'));
  assert.deepEqual(validateRequestApproval(null), {
    valid: false,
    fieldPaths: ['$'],
  });
  const malformed = validateRequestApproval({
    contractVersion: 2,
    approvalRequestRecordId: 'bad',
    idempotencyKey: '',
    name: '',
    requestedActionCode: '',
    payloadDigest: 'bad',
    sourceRecordIds: ['bad'],
    approverRecordId: 'bad',
  });
  assert.equal(malformed.valid, false);
  assert.ok(malformed.fieldPaths.includes('approverRecordId'));
});

test('approval decisions are explicit pending-state transitions with rationale', () => {
  for (const [decision, status] of [
    ['APPROVE', 'APPROVED'],
    ['REJECT', 'REJECTED'],
    ['CANCEL', 'CANCELLED'],
  ]) {
    const result = validateDecideApproval({
      contractVersion: 1,
      idempotencyKey: `decision:${decision}`,
      expectedStatus: 'PENDING',
      decision,
      decisionNote: 'Evidence reviewed.',
    });
    assert.equal(result.valid, true);
    assert.equal(approvalStatusForDecision(decision), status);
  }
  const stale = validateDecideApproval({
    contractVersion: 1,
    idempotencyKey: 'stale',
    expectedStatus: 'APPROVED',
    decision: 'APPROVE',
    decisionNote: 'again',
  });
  assert.equal(stale.valid, false);
  assert.ok(stale.fieldPaths.includes('expectedStatus'));
  assert.deepEqual(validateDecideApproval([]), {
    valid: false,
    fieldPaths: ['$'],
  });
  const malformed = validateDecideApproval({
    contractVersion: 2,
    idempotencyKey: '',
    expectedStatus: 'PENDING',
    decision: 'OTHER',
    decisionNote: '',
  });
  assert.equal(malformed.valid, false);
});
