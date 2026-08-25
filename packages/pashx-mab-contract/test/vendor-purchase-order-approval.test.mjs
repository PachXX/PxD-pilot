import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  PASHX_PURCHASE_ORDER_APPROVAL_ACTION_CODE,
  buildPurchaseOrderApprovalPayloadDigest,
  serializePurchaseOrderApprovalPayload,
  validatePurchaseOrderApprovalPayload,
} from '../dist/index.js';

const CASE_ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const DOCUMENT_ID = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';

const payload = () => ({
  procurementCaseRecordId: CASE_ID,
  commercialDocumentRecordId: DOCUMENT_ID,
  expectedVersion: 3,
  totalAmountMicros: 127544200000,
  currencyCode: 'SAR',
});

const nodeSha256 = (value) =>
  createHash('sha256').update(value, 'utf8').digest('hex');

test('purchase order approval uses the allowlisted action code', () => {
  assert.equal(PASHX_PURCHASE_ORDER_APPROVAL_ACTION_CODE, 'purchaseOrder.approval');
});

test('canonical serialization freezes the digest key order', () => {
  assert.equal(
    serializePurchaseOrderApprovalPayload(payload()),
    JSON.stringify({
      procurementCaseRecordId: CASE_ID,
      commercialDocumentRecordId: DOCUMENT_ID,
      expectedVersion: 3,
      totalAmountMicros: 127544200000,
      currencyCode: 'SAR',
    }),
  );
});

test('digest matches the canonical node sha-256 over the frozen payload', async () => {
  const serialized = serializePurchaseOrderApprovalPayload(payload());
  const digest = await buildPurchaseOrderApprovalPayloadDigest(payload());

  assert.equal(digest, nodeSha256(serialized));
  assert.match(digest, /^[0-9a-f]{64}$/);
});

test('digest changes when any payload field changes', async () => {
  const base = await buildPurchaseOrderApprovalPayloadDigest(payload());
  const mutations = [
    { procurementCaseRecordId: 'cccccccc-3333-4333-8333-cccccccccccc' },
    { commercialDocumentRecordId: 'dddddddd-4444-4444-8444-dddddddddddd' },
    { expectedVersion: 4 },
    { totalAmountMicros: 127544200001 },
    { currencyCode: 'USD' },
  ];

  for (const mutation of mutations) {
    assert.notEqual(
      await buildPurchaseOrderApprovalPayloadDigest({
        ...payload(),
        ...mutation,
      }),
      base,
    );
  }
});

test('payload validation accepts a well-formed payload', () => {
  assert.deepEqual(validatePurchaseOrderApprovalPayload(payload()), {
    valid: true,
    value: payload(),
  });
});

test('payload validation rejects malformed fields without throwing', () => {
  assert.deepEqual(validatePurchaseOrderApprovalPayload(null), {
    valid: false,
    fieldPaths: ['$'],
  });
  assert.deepEqual(
    validatePurchaseOrderApprovalPayload({
      ...payload(),
      procurementCaseRecordId: 'bad',
      commercialDocumentRecordId: 'bad',
      expectedVersion: -1,
      totalAmountMicros: 1.5,
      currencyCode: 'sar',
    }),
    {
      valid: false,
      fieldPaths: [
        'procurementCaseRecordId',
        'commercialDocumentRecordId',
        'expectedVersion',
        'totalAmountMicros',
        'currencyCode',
      ],
    },
  );
});
