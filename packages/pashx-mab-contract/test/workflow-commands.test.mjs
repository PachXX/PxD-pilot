import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PASHX_CASE_TRANSITION_ACTION_CODE,
  validateCancelDocumentRequest,
  validateFinalizeDocumentRequest,
  validateRecordDeliveryRequest,
  validateTransitionCaseRequest,
} from '../dist/index.js';

const CONTRACT_VERSION = 1;
const CASE_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const DOCUMENT_ID = '11111111-2222-4333-8444-555555555555';
const DELIVERY_NOTE_ID = '99999999-8888-4777-8666-777777777777';

const validTransitionRequest = () => ({
  contractVersion: CONTRACT_VERSION,
  procurementCaseRecordId: CASE_ID,
  idempotencyKey: 'transition-key-1',
  expectedVersion: 3,
  payload: { fromStage: 'quoted', toStage: 'customer-order' },
});

const validFinalizeRequest = () => ({
  contractVersion: CONTRACT_VERSION,
  commercialDocumentRecordId: DOCUMENT_ID,
  idempotencyKey: 'finalize-key-1',
  expectedVersion: 1,
});

const validDeliveryRequest = () => ({
  contractVersion: CONTRACT_VERSION,
  procurementCaseRecordId: CASE_ID,
  idempotencyKey: 'delivery-key-1',
  expectedVersion: 5,
  payload: {
    deliveryNoteRecordId: DELIVERY_NOTE_ID,
    deliveryStatus: 'full',
    dueAt: '2026-08-30T14:00:00.000Z',
  },
});

test('transition action code is the allowlisted approval action', () => {
  assert.equal(PASHX_CASE_TRANSITION_ACTION_CODE, 'case.transition');
});

test('case transition validator accepts a well-formed request', () => {
  assert.deepEqual(validateTransitionCaseRequest(validTransitionRequest()), {
    valid: true,
    value: validTransitionRequest(),
  });
});

test('case transition validator rejects a non-record input at $', () => {
  assert.deepEqual(validateTransitionCaseRequest('nope'), {
    valid: false,
    fieldPaths: ['$'],
  });
  assert.deepEqual(validateTransitionCaseRequest(null), {
    valid: false,
    fieldPaths: ['$'],
  });
});

test('case transition validator reports every invalid field', () => {
  const input = validTransitionRequest();

  assert.deepEqual(validateTransitionCaseRequest({ ...input, contractVersion: 2 }), {
    valid: false,
    fieldPaths: ['contractVersion'],
  });
  assert.deepEqual(
    validateTransitionCaseRequest({ ...input, procurementCaseRecordId: 'not-a-uuid' }),
    { valid: false, fieldPaths: ['procurementCaseRecordId'] },
  );
  assert.deepEqual(
    validateTransitionCaseRequest({ ...input, idempotencyKey: '  ' }),
    { valid: false, fieldPaths: ['idempotencyKey'] },
  );
  assert.deepEqual(
    validateTransitionCaseRequest({ ...input, expectedVersion: -1 }),
    { valid: false, fieldPaths: ['expectedVersion'] },
  );
  assert.deepEqual(
    validateTransitionCaseRequest({ ...input, expectedVersion: 1.5 }),
    { valid: false, fieldPaths: ['expectedVersion'] },
  );
  assert.deepEqual(
    validateTransitionCaseRequest({ ...input, payload: undefined }),
    { valid: false, fieldPaths: ['payload'] },
  );
  assert.deepEqual(
    validateTransitionCaseRequest({
      ...input,
      payload: { fromStage: 'bogus', toStage: 'customer-order' },
    }),
    { valid: false, fieldPaths: ['payload.fromStage'] },
  );
  assert.deepEqual(
    validateTransitionCaseRequest({
      ...input,
      payload: { fromStage: 'quoted', toStage: 'bogus' },
    }),
    { valid: false, fieldPaths: ['payload.toStage'] },
  );
  assert.deepEqual(
    validateTransitionCaseRequest({
      ...input,
      contractVersion: 2,
      idempotencyKey: '',
      payload: { fromStage: 'bogus', toStage: 'bogus' },
    }),
    {
      valid: false,
      fieldPaths: [
        'contractVersion',
        'idempotencyKey',
        'payload.fromStage',
        'payload.toStage',
      ],
    },
  );
});

test('finalize validator accepts a well-formed request and shares cancel shape', () => {
  const request = validFinalizeRequest();

  assert.deepEqual(validateFinalizeDocumentRequest(request), {
    valid: true,
    value: request,
  });
  assert.equal(validateCancelDocumentRequest, validateFinalizeDocumentRequest);
  assert.deepEqual(validateCancelDocumentRequest(request), {
    valid: true,
    value: request,
  });
});

test('finalize validator reports every invalid field', () => {
  const input = validFinalizeRequest();

  assert.deepEqual(validateFinalizeDocumentRequest([]), {
    valid: false,
    fieldPaths: ['$'],
  });
  assert.deepEqual(validateFinalizeDocumentRequest({ ...input, contractVersion: 0 }), {
    valid: false,
    fieldPaths: ['contractVersion'],
  });
  assert.deepEqual(
    validateFinalizeDocumentRequest({ ...input, commercialDocumentRecordId: 42 }),
    { valid: false, fieldPaths: ['commercialDocumentRecordId'] },
  );
  assert.deepEqual(
    validateFinalizeDocumentRequest({ ...input, idempotencyKey: null }),
    { valid: false, fieldPaths: ['idempotencyKey'] },
  );
  assert.deepEqual(
    validateFinalizeDocumentRequest({ ...input, expectedVersion: '1' }),
    { valid: false, fieldPaths: ['expectedVersion'] },
  );
  assert.deepEqual(
    validateFinalizeDocumentRequest({
      contractVersion: 0,
      commercialDocumentRecordId: 'bad',
      idempotencyKey: '',
      expectedVersion: -2,
    }),
    {
      valid: false,
      fieldPaths: [
        'contractVersion',
        'commercialDocumentRecordId',
        'idempotencyKey',
        'expectedVersion',
      ],
    },
  );
});

test('delivery record validator accepts partial and full well-formed requests', () => {
  const request = validDeliveryRequest();

  assert.deepEqual(validateRecordDeliveryRequest(request), {
    valid: true,
    value: request,
  });
  assert.deepEqual(
    validateRecordDeliveryRequest({
      ...request,
      payload: { ...request.payload, deliveryStatus: 'partial' },
    }),
    {
      valid: true,
      value: {
        ...request,
        payload: { ...request.payload, deliveryStatus: 'partial' },
      },
    },
  );
});

test('delivery record validator reports every invalid field', () => {
  const input = validDeliveryRequest();

  assert.deepEqual(validateRecordDeliveryRequest('nope'), {
    valid: false,
    fieldPaths: ['$'],
  });
  assert.deepEqual(validateRecordDeliveryRequest({ ...input, contractVersion: 3 }), {
    valid: false,
    fieldPaths: ['contractVersion'],
  });
  assert.deepEqual(
    validateRecordDeliveryRequest({ ...input, procurementCaseRecordId: 'short' }),
    { valid: false, fieldPaths: ['procurementCaseRecordId'] },
  );
  assert.deepEqual(
    validateRecordDeliveryRequest({ ...input, idempotencyKey: 123 }),
    { valid: false, fieldPaths: ['idempotencyKey'] },
  );
  assert.deepEqual(
    validateRecordDeliveryRequest({ ...input, expectedVersion: Number.NaN }),
    { valid: false, fieldPaths: ['expectedVersion'] },
  );
  assert.deepEqual(
    validateRecordDeliveryRequest({ ...input, payload: undefined }),
    { valid: false, fieldPaths: ['payload'] },
  );
  assert.deepEqual(
    validateRecordDeliveryRequest({
      ...input,
      payload: { ...input.payload, deliveryNoteRecordId: 'invalid' },
    }),
    { valid: false, fieldPaths: ['payload.deliveryNoteRecordId'] },
  );
  assert.deepEqual(
    validateRecordDeliveryRequest({
      ...input,
      payload: { ...input.payload, deliveryStatus: 'notStarted' },
    }),
    { valid: false, fieldPaths: ['payload.deliveryStatus'] },
  );
  assert.deepEqual(
    validateRecordDeliveryRequest({
      ...input,
      payload: { ...input.payload, dueAt: '2026-08-30' },
    }),
    { valid: false, fieldPaths: ['payload.dueAt'] },
  );
  assert.deepEqual(
    validateRecordDeliveryRequest({
      ...input,
      payload: { ...input.payload, dueAt: '2026-13-40T99:00:00.000Z' },
    }),
    { valid: false, fieldPaths: ['payload.dueAt'] },
  );
  assert.deepEqual(
    validateRecordDeliveryRequest({
      ...input,
      payload: { ...input.payload, dueAt: 42 },
    }),
    { valid: false, fieldPaths: ['payload.dueAt'] },
  );
  assert.deepEqual(
    validateRecordDeliveryRequest({
      contractVersion: 3,
      procurementCaseRecordId: 'bad',
      idempotencyKey: '',
      expectedVersion: -1,
      payload: {
        deliveryNoteRecordId: 'bad',
        deliveryStatus: 'none',
        dueAt: 'yesterday',
      },
    }),
    {
      valid: false,
      fieldPaths: [
        'contractVersion',
        'procurementCaseRecordId',
        'idempotencyKey',
        'expectedVersion',
        'payload.deliveryNoteRecordId',
        'payload.deliveryStatus',
        'payload.dueAt',
      ],
    },
  );
});
