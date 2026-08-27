/**
 * WF2 scenario 4 — delivery.record through the real REST boundary: partial/full status, due
 * date, delivery-note finalization, versioning, replay, stage guards and permissions.
 */
import { randomUUID } from 'node:crypto';

import {
  assertPashxAppInstalled,
  assertPashxWorkflowColumnsInstalled,
  cleanupPashxTestData,
  countReceipts,
  readAuditEvents,
  readCommercialDocumentState,
  readProcurementCaseDelivery,
  readProcurementCaseVersion,
  seedCommercialDocument,
  seedProcurementCase,
} from 'test/integration/pashx-mab/utils/pashx-mab-test-context.util';
import {
  buildDeliveryRequest,
  postDeliveryRecord,
} from 'test/integration/pashx-mab/utils/post-workflow-command.util';

describe('WF2-4 delivery record command', () => {
  const deliveryCaseId = randomUUID();
  const vendorOrderCaseId = randomUUID();
  const otherCaseId = randomUUID();
  const deliveryNoteId = randomUUID();
  const wrongTypeNoteId = randomUUID();
  const foreignNoteId = randomUUID();
  const idempotencyKeys: string[] = [];
  let firstDeliveryKey: string | undefined;

  const track = (body: { idempotencyKey: string }) => {
    idempotencyKeys.push(body.idempotencyKey);

    return body;
  };

  const post = ({
    procurementCaseRecordId,
    expectedVersion,
    deliveryNoteRecordId,
    deliveryStatus,
    bearer,
  }: {
    procurementCaseRecordId: string;
    expectedVersion: number;
    deliveryNoteRecordId: string;
    deliveryStatus?: 'partial' | 'full';
    bearer?: string;
  }) => {
    const body = track(
      buildDeliveryRequest({
        procurementCaseRecordId,
        expectedVersion,
        deliveryNoteRecordId,
        deliveryStatus: deliveryStatus ?? 'full',
      }),
    );

    return {
      body,
      responsePromise: postDeliveryRecord({
        procurementCaseRecordId,
        body,
        bearer,
      }),
    };
  };

  beforeAll(async () => {
    await assertPashxAppInstalled();
    await assertPashxWorkflowColumnsInstalled();

    await seedProcurementCase({
      id: deliveryCaseId,
      aggregateVersion: 5,
      stage: 'DELIVERY',
    });
    await seedProcurementCase({
      id: vendorOrderCaseId,
      aggregateVersion: 4,
      stage: 'VENDOR_ORDER',
    });
    await seedProcurementCase({
      id: otherCaseId,
      aggregateVersion: 2,
      stage: 'DELIVERY',
    });

    await seedCommercialDocument({
      id: deliveryNoteId,
      name: `MAB-DN-A-${deliveryNoteId.slice(0, 8)}`,
      documentType: 'DELIVERY_NOTE',
      lifecycleStatus: 'DRAFT',
      aggregateVersion: 1,
      procurementCaseRecordId: deliveryCaseId,
    });
    await seedCommercialDocument({
      id: wrongTypeNoteId,
      name: `MAB-VQ-${wrongTypeNoteId.slice(0, 8)}`,
      documentType: 'VENDOR_QUOTE',
      lifecycleStatus: 'DRAFT',
      aggregateVersion: 1,
      procurementCaseRecordId: deliveryCaseId,
      totalAmountMicros: '100000000000',
    });
    await seedCommercialDocument({
      id: foreignNoteId,
      name: `MAB-DN-B-${foreignNoteId.slice(0, 8)}`,
      documentType: 'DELIVERY_NOTE',
      lifecycleStatus: 'DRAFT',
      aggregateVersion: 1,
      procurementCaseRecordId: otherCaseId,
    });
  });

  afterAll(async () => {
    await cleanupPashxTestData({
      procurementCaseIds: [deliveryCaseId, vendorOrderCaseId, otherCaseId],
      commercialDocumentIds: [deliveryNoteId, wrongTypeNoteId, foreignNoteId],
      idempotencyKeys,
    });
  });

  it('records a partial delivery, finalizes the note and bumps the case version', async () => {
    const { body, responsePromise } = post({
      procurementCaseRecordId: deliveryCaseId,
      expectedVersion: 5,
      deliveryNoteRecordId: deliveryNoteId,
      deliveryStatus: 'partial',
    });
    const response = await responsePromise;
    firstDeliveryKey = body.idempotencyKey;

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      replayed: false,
      aggregateId: deliveryCaseId,
      aggregateVersion: 6,
      result: {
        procurementCaseRecordId: deliveryCaseId,
        deliveryNoteRecordId: deliveryNoteId,
        deliveryStatus: 'partial',
        aggregateVersion: 6,
      },
    });
    const delivery = await readProcurementCaseDelivery(deliveryCaseId);
    expect(delivery?.deliveryStatus).toBe('PARTIAL');
    expect(delivery?.deliveryDueAt).not.toBeNull();
    expect(await readCommercialDocumentState(deliveryNoteId)).toMatchObject({
      lifecycleStatus: 'FINALIZED',
      aggregateVersion: 2,
    });
    expect(await readProcurementCaseVersion(deliveryCaseId)).toBe(6);
    const events = await readAuditEvents(deliveryCaseId);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      command_name: 'delivery.record',
      aggregate_version: 6,
    });
    expect(await countReceipts(body.idempotencyKey)).toBe(1);
  });

  it('replays the same delivery request without another write', async () => {
    const body = track(
      buildDeliveryRequest({
        procurementCaseRecordId: deliveryCaseId,
        expectedVersion: 5,
        deliveryNoteRecordId: deliveryNoteId,
        deliveryStatus: 'partial',
        idempotencyKey: firstDeliveryKey,
      }),
    );
    const response = await postDeliveryRecord({
      procurementCaseRecordId: deliveryCaseId,
      body,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ ok: true, replayed: true });
    expect(await readAuditEvents(deliveryCaseId)).toHaveLength(1);
    expect(await countReceipts(body.idempotencyKey)).toBe(1);
  });

  it('rejects recording delivery on an already finalized note', async () => {
    const { responsePromise } = post({
      procurementCaseRecordId: deliveryCaseId,
      expectedVersion: 6,
      deliveryNoteRecordId: deliveryNoteId,
    });
    const response = await responsePromise;

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_FINALIZED_DOCUMENT_IMMUTABLE',
    });
  });

  it('rejects recording delivery outside the delivery stage', async () => {
    const { responsePromise } = post({
      procurementCaseRecordId: vendorOrderCaseId,
      expectedVersion: 4,
      deliveryNoteRecordId: deliveryNoteId,
    });
    const response = await responsePromise;

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_INVALID_TRANSITION',
    });
    expect(await readProcurementCaseVersion(vendorOrderCaseId)).toBe(4);
  });

  it('rejects a note owned by another case', async () => {
    const { responsePromise } = post({
      procurementCaseRecordId: deliveryCaseId,
      expectedVersion: 6,
      deliveryNoteRecordId: foreignNoteId,
    });
    const response = await responsePromise;

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_RECORD_NOT_FOUND',
      fieldPaths: ['payload.deliveryNoteRecordId'],
    });
  });

  it('rejects a non-delivery-note document as delivery evidence', async () => {
    const { responsePromise } = post({
      procurementCaseRecordId: deliveryCaseId,
      expectedVersion: 6,
      deliveryNoteRecordId: wrongTypeNoteId,
    });
    const response = await responsePromise;

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_INVALID_INPUT',
      fieldPaths: ['payload.deliveryNoteRecordId'],
    });
  });

  it('rejects a stale case version', async () => {
    const { responsePromise } = post({
      procurementCaseRecordId: otherCaseId,
      expectedVersion: 1,
      deliveryNoteRecordId: foreignNoteId,
    });
    const response = await responsePromise;

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_STALE_VERSION',
      currentVersion: 2,
    });
  });

  it('refuses an authenticated member without the delivery capability', async () => {
    const { body, responsePromise } = post({
      procurementCaseRecordId: deliveryCaseId,
      expectedVersion: 6,
      deliveryNoteRecordId: deliveryNoteId,
      bearer: APPLE_PHIL_GUEST_ACCESS_TOKEN,
    });
    const response = await responsePromise;

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_FORBIDDEN_CAPABILITY',
    });
    expect(await countReceipts(body.idempotencyKey)).toBe(0);
  });
});
