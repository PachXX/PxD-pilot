/**
 * WF2 scenario 2 — the transition engine fails closed on illegal moves, missing evidence, stale
 * versions, key reuse, and unauthorized principals.
 */
import { randomUUID } from 'node:crypto';

import {
  assertPashxAppInstalled,
  assertPashxWorkflowColumnsInstalled,
  cleanupPashxTestData,
  countReceipts,
  readAuditEvents,
  readProcurementCaseStage,
  readProcurementCaseVersion,
  seedCommercialDocument,
  seedProcurementCase,
} from 'test/integration/pashx-mab/utils/pashx-mab-test-context.util';
import {
  buildCaseTransitionRequest,
  postCaseTransition,
} from 'test/integration/pashx-mab/utils/post-workflow-command.util';

describe('WF2-2 case transition guards fail closed', () => {
  const intakeCaseId = randomUUID();
  const quotedCaseId = randomUUID();
  const closedCaseId = randomUUID();
  const reuseCaseId = randomUUID();
  const documentIds: string[] = [];
  const idempotencyKeys: string[] = [];

  const track = (body: { idempotencyKey: string }) => {
    idempotencyKeys.push(body.idempotencyKey);

    return body;
  };

  const post = async ({
    procurementCaseRecordId,
    expectedVersion,
    fromStage,
    toStage,
    bearer,
  }: {
    procurementCaseRecordId: string;
    expectedVersion: number;
    fromStage: string;
    toStage: string;
    bearer?: string;
  }) => {
    const body = track(
      buildCaseTransitionRequest({
        procurementCaseRecordId,
        expectedVersion,
        fromStage,
        toStage,
      }),
    );

    return {
      body,
      response: await postCaseTransition({
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
      id: intakeCaseId,
      aggregateVersion: 0,
      stage: 'INTAKE',
    });
    await seedProcurementCase({
      id: quotedCaseId,
      aggregateVersion: 3,
      stage: 'QUOTED',
    });
    await seedProcurementCase({
      id: closedCaseId,
      aggregateVersion: 8,
      stage: 'CLOSED',
    });
    await seedProcurementCase({
      id: reuseCaseId,
      aggregateVersion: 0,
      stage: 'INTAKE',
    });
    const reuseRfqId = randomUUID();
    documentIds.push(reuseRfqId);
    await seedCommercialDocument({
      id: reuseRfqId,
      name: `MAB-RFQ-${reuseCaseId.slice(0, 8)}`,
      documentType: 'CUSTOMER_RFQ',
      lifecycleStatus: 'FINALIZED',
      aggregateVersion: 1,
      procurementCaseRecordId: reuseCaseId,
    });

    // The quoted case carries its own finalized RFQ, quotations and PO evidence so only the
    // transition under test can fail.
    for (const [name, documentType, withTotal] of [
      ['MAB-RFQ-01', 'CUSTOMER_RFQ', false],
      ['MAB-VQ-01', 'VENDOR_QUOTE', true],
      ['MAB-CQ-01', 'CUSTOMER_QUOTE', true],
      ['MAB-CPO-01', 'CUSTOMER_PURCHASE_ORDER', true],
    ] as const) {
      const id = randomUUID();
      documentIds.push(id);
      await seedCommercialDocument({
        id,
        name,
        documentType,
        lifecycleStatus: 'FINALIZED',
        aggregateVersion: 1,
        procurementCaseRecordId: quotedCaseId,
        totalAmountMicros: withTotal ? '100000000000' : undefined,
      });
    }
  });

  afterAll(async () => {
    await cleanupPashxTestData({
      procurementCaseIds: [
        intakeCaseId,
        quotedCaseId,
        closedCaseId,
        reuseCaseId,
      ],
      commercialDocumentIds: documentIds,
      idempotencyKeys,
    });
  });

  it('rejects a skip from intake to quoted', async () => {
    const { response } = await post({
      procurementCaseRecordId: intakeCaseId,
      expectedVersion: 0,
      fromStage: 'intake',
      toStage: 'quoted',
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_INVALID_TRANSITION',
    });
  });

  it('rejects a backward move from quoted to sourcing', async () => {
    const { response } = await post({
      procurementCaseRecordId: quotedCaseId,
      expectedVersion: 3,
      fromStage: 'quoted',
      toStage: 'sourcing',
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_INVALID_TRANSITION',
    });
  });

  it('rejects a from-stage that does not match the live stage', async () => {
    const { response } = await post({
      procurementCaseRecordId: quotedCaseId,
      expectedVersion: 3,
      fromStage: 'sourcing',
      toStage: 'quoted',
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_INVALID_TRANSITION',
      fieldPaths: ['payload.fromStage'],
    });
    expect(await readProcurementCaseStage(quotedCaseId)).toBe('QUOTED');
  });

  it('rejects a gated move whose evidence exists but whose approval is absent', async () => {
    const { response } = await post({
      procurementCaseRecordId: quotedCaseId,
      expectedVersion: 3,
      fromStage: 'quoted',
      toStage: 'customer-order',
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_APPROVAL_GATE_UNSATISFIED',
    });
  });

  it('rejects a transition whose finalized evidence is missing', async () => {
    const { response } = await post({
      procurementCaseRecordId: intakeCaseId,
      expectedVersion: 0,
      fromStage: 'intake',
      toStage: 'sourcing',
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_TRANSITION_EVIDENCE_MISSING',
    });
  });

  it('rejects a stale expected version with the current version attached', async () => {
    const { response } = await post({
      procurementCaseRecordId: quotedCaseId,
      expectedVersion: 2,
      fromStage: 'quoted',
      toStage: 'customer-order',
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_STALE_VERSION',
      currentVersion: 3,
      retryable: true,
    });
  });

  it('rejects reusing an idempotency key with different payload data', async () => {
    const first = await post({
      procurementCaseRecordId: reuseCaseId,
      expectedVersion: 0,
      fromStage: 'intake',
      toStage: 'sourcing',
    });
    expect(first.response.status).toBe(201);
    expect(first.response.body).toMatchObject({ ok: true, replayed: false });

    const secondBody = track(
      buildCaseTransitionRequest({
        procurementCaseRecordId: reuseCaseId,
        expectedVersion: 0,
        fromStage: 'intake',
        toStage: 'sourcing',
        idempotencyKey: first.body.idempotencyKey,
      }),
    );
    const changed = {
      ...secondBody,
      payload: { ...secondBody.payload, toStage: 'quoted' },
    };
    const response = await postCaseTransition({
      procurementCaseRecordId: reuseCaseId,
      body: changed,
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_IDEMPOTENCY_KEY_REUSED',
    });
    // The original receipt stays intact and no second write occurred.
    expect(await countReceipts(first.body.idempotencyKey)).toBe(1);
    expect(await readProcurementCaseVersion(reuseCaseId)).toBe(1);
    expect(await readProcurementCaseStage(reuseCaseId)).toBe('SOURCING');
  });

  it('refuses an authenticated member without the case-edit capability', async () => {
    const { body, response } = await post({
      procurementCaseRecordId: quotedCaseId,
      expectedVersion: 3,
      fromStage: 'quoted',
      toStage: 'customer-order',
      bearer: APPLE_PHIL_GUEST_ACCESS_TOKEN,
    });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_FORBIDDEN_CAPABILITY',
    });
    expect(await countReceipts(body.idempotencyKey)).toBe(0);
    expect(await readProcurementCaseVersion(quotedCaseId)).toBe(3);
  });

  it('rejects a not-found case', async () => {
    const missingCaseId = randomUUID();
    const { response } = await post({
      procurementCaseRecordId: missingCaseId,
      expectedVersion: 0,
      fromStage: 'intake',
      toStage: 'sourcing',
    });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_RECORD_NOT_FOUND',
    });
  });

  it('wrote no audit events for any refused transition', async () => {
    expect(await readAuditEvents(intakeCaseId)).toEqual([]);
    expect(await readAuditEvents(quotedCaseId)).toEqual([]);
    expect(await readAuditEvents(closedCaseId)).toEqual([]);
    expect(await readProcurementCaseVersion(quotedCaseId)).toBe(3);
  });
});
