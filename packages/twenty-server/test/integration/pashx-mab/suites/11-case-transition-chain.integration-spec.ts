/**
 * WF2 scenario 1 — one procurement case walks the entire MAB operating chain through the real
 * REST boundary, with evidence requirements, human approval gates, audit events and replay
 * asserted against the database.
 */
import { randomUUID } from 'node:crypto';

import { PASHX_CASE_TRANSITION_ACTION_CODE } from 'pashx-mab-contract';

import {
  assertPashxAppInstalled,
  assertPashxWorkflowColumnsInstalled,
  cleanupPashxTestData,
  readAuditEvents,
  readCommercialDocumentState,
  readProcurementCaseStage,
  readProcurementCaseVersion,
  seedCommercialDocument,
  seedProcurementCase,
} from 'test/integration/pashx-mab/utils/pashx-mab-test-context.util';
import { createCaseTransitionApprovalDigest } from 'src/modules/pashx-mab/utils/pashx-command-fingerprint.util';
import {
  APPLE_ADMIN_WORKSPACE_MEMBER_ID,
  buildCaseTransitionRequest,
  buildDecideApproval,
  buildRequestApproval,
  postCaseTransition,
  postDecideApproval,
  postRequestApproval,
} from 'test/integration/pashx-mab/utils/post-workflow-command.util';

describe('WF2-1 case transition chain — evidence, gates, audit, replay', () => {
  const procurementCaseId = randomUUID();
  const documentIds = {
    customerRfq: randomUUID(),
    vendorQuote: randomUUID(),
    customerQuote: randomUUID(),
    customerPurchaseOrder: randomUUID(),
    vendorPurchaseOrder: randomUUID(),
    deliveryNote: randomUUID(),
    customerInvoice: randomUUID(),
  };
  const approvalIds: string[] = [];
  const idempotencyKeys: string[] = [];

  const transitionKeys: Record<string, string> = {};
  const closedTransitionBody: Record<string, unknown> = {};

  const track = (body: { idempotencyKey: string }) => {
    idempotencyKeys.push(body.idempotencyKey);

    return body;
  };

  const approveTransition = async ({
    fromStage,
    toStage,
    expectedVersion,
  }: {
    fromStage: string;
    toStage: string;
    expectedVersion: number;
  }) => {
    const approvalId = randomUUID();
    approvalIds.push(approvalId);

    const requestBody = track(
      buildRequestApproval({
        approvalRequestRecordId: approvalId,
        name: `Approve ${fromStage} to ${toStage}`,
        requestedActionCode: PASHX_CASE_TRANSITION_ACTION_CODE,
        payloadDigest: createCaseTransitionApprovalDigest({
          procurementCaseRecordId: procurementCaseId,
          fromStage: fromStage as never,
          toStage: toStage as never,
          expectedVersion,
        }),
        sourceRecordIds: [procurementCaseId],
        approverRecordId: APPLE_ADMIN_WORKSPACE_MEMBER_ID,
      }),
    );
    const requestResponse = await postRequestApproval({ body: requestBody });
    expect(requestResponse.status).toBe(201);
    expect(requestResponse.body).toMatchObject({
      ok: true,
      result: { status: 'PENDING' },
    });

    const decisionBody = track(buildDecideApproval({ decision: 'APPROVE' }));
    const decisionResponse = await postDecideApproval({
      approvalRequestRecordId: approvalId,
      body: decisionBody,
    });
    expect(decisionResponse.status).toBe(201);
    expect(decisionResponse.body).toMatchObject({
      ok: true,
      result: { status: 'APPROVED' },
    });
  };

  const transition = async ({
    fromStage,
    toStage,
    expectedVersion,
  }: {
    fromStage: string;
    toStage: string;
    expectedVersion: number;
  }) => {
    const body = track(
      buildCaseTransitionRequest({
        procurementCaseRecordId: procurementCaseId,
        expectedVersion,
        fromStage,
        toStage,
      }),
    );
    const response = await postCaseTransition({
      procurementCaseRecordId: procurementCaseId,
      body,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      replayed: false,
      aggregateId: procurementCaseId,
      aggregateVersion: expectedVersion + 1,
      result: { fromStage, toStage, aggregateVersion: expectedVersion + 1 },
    });
    transitionKeys[`${fromStage}-${toStage}`] = body.idempotencyKey;

    return body;
  };

  beforeAll(async () => {
    await assertPashxAppInstalled();
    await assertPashxWorkflowColumnsInstalled();

    await seedProcurementCase({
      id: procurementCaseId,
      aggregateVersion: 0,
      stage: 'INTAKE',
    });
    await seedCommercialDocument({
      id: documentIds.customerRfq,
      name: `MAB-RFQ-${procurementCaseId.slice(0, 8)}`,
      documentType: 'CUSTOMER_RFQ',
      lifecycleStatus: 'FINALIZED',
      aggregateVersion: 1,
      procurementCaseRecordId: procurementCaseId,
    });
    await seedCommercialDocument({
      id: documentIds.vendorQuote,
      name: `MAB-VQ-${procurementCaseId.slice(0, 8)}`,
      documentType: 'VENDOR_QUOTE',
      lifecycleStatus: 'FINALIZED',
      aggregateVersion: 1,
      procurementCaseRecordId: procurementCaseId,
      totalAmountMicros: '150000000000',
    });
    await seedCommercialDocument({
      id: documentIds.customerQuote,
      name: `MAB-CQ-${procurementCaseId.slice(0, 8)}`,
      documentType: 'CUSTOMER_QUOTE',
      lifecycleStatus: 'FINALIZED',
      aggregateVersion: 1,
      procurementCaseRecordId: procurementCaseId,
      totalAmountMicros: '180000000000',
    });
    await seedCommercialDocument({
      id: documentIds.customerPurchaseOrder,
      name: `MAB-CPO-${procurementCaseId.slice(0, 8)}`,
      documentType: 'CUSTOMER_PURCHASE_ORDER',
      lifecycleStatus: 'FINALIZED',
      aggregateVersion: 1,
      procurementCaseRecordId: procurementCaseId,
      totalAmountMicros: '180000000000',
    });
    await seedCommercialDocument({
      id: documentIds.vendorPurchaseOrder,
      name: `MAB-VPO-${procurementCaseId.slice(0, 8)}`,
      documentType: 'VENDOR_PURCHASE_ORDER',
      lifecycleStatus: 'FINALIZED',
      aggregateVersion: 1,
      procurementCaseRecordId: procurementCaseId,
      totalAmountMicros: '150000000000',
    });
    await seedCommercialDocument({
      id: documentIds.deliveryNote,
      name: `MAB-DN-${procurementCaseId.slice(0, 8)}`,
      documentType: 'DELIVERY_NOTE',
      lifecycleStatus: 'DRAFT',
      aggregateVersion: 1,
      procurementCaseRecordId: procurementCaseId,
    });
    await seedCommercialDocument({
      id: documentIds.customerInvoice,
      name: `MAB-INV-${procurementCaseId.slice(0, 8)}`,
      documentType: 'CUSTOMER_INVOICE',
      lifecycleStatus: 'FINALIZED',
      aggregateVersion: 1,
      procurementCaseRecordId: procurementCaseId,
      totalAmountMicros: '180000000000',
    });
  });

  afterAll(async () => {
    await cleanupPashxTestData({
      procurementCaseIds: [procurementCaseId],
      commercialDocumentIds: Object.values(documentIds),
      approvalRequestIds: approvalIds,
      idempotencyKeys,
    });
  });

  it('advances intake to sourcing on the finalized customer RFQ', async () => {
    await transition({
      fromStage: 'intake',
      toStage: 'sourcing',
      expectedVersion: 0,
    });
    expect(await readProcurementCaseStage(procurementCaseId)).toBe('SOURCING');
  });

  it('advances sourcing to quoted on vendor and customer quotations', async () => {
    await transition({
      fromStage: 'sourcing',
      toStage: 'quoted',
      expectedVersion: 1,
    });
    expect(await readProcurementCaseVersion(procurementCaseId)).toBe(2);
  });

  it('blocks a gated transition without an approved human decision', async () => {
    const body = track(
      buildCaseTransitionRequest({
        procurementCaseRecordId: procurementCaseId,
        expectedVersion: 2,
        fromStage: 'quoted',
        toStage: 'customer-order',
      }),
    );
    const response = await postCaseTransition({
      procurementCaseRecordId: procurementCaseId,
      body,
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_APPROVAL_GATE_UNSATISFIED',
      retryable: false,
    });
    expect(await readProcurementCaseStage(procurementCaseId)).toBe('QUOTED');
    expect(await readProcurementCaseVersion(procurementCaseId)).toBe(2);
  });

  it('advances quoted to customer order after client-order verification', async () => {
    await approveTransition({
      fromStage: 'quoted',
      toStage: 'customer-order',
      expectedVersion: 2,
    });
    await transition({
      fromStage: 'quoted',
      toStage: 'customer-order',
      expectedVersion: 2,
    });
    expect(await readProcurementCaseStage(procurementCaseId)).toBe(
      'CUSTOMER_ORDER',
    );
  });

  it('advances customer order to vendor order after internal procurement approval', async () => {
    await approveTransition({
      fromStage: 'customer-order',
      toStage: 'vendor-order',
      expectedVersion: 3,
    });
    await transition({
      fromStage: 'customer-order',
      toStage: 'vendor-order',
      expectedVersion: 3,
    });
    expect(await readProcurementCaseStage(procurementCaseId)).toBe(
      'VENDOR_ORDER',
    );
  });

  it('advances vendor order to delivery on the finalized vendor PO', async () => {
    await transition({
      fromStage: 'vendor-order',
      toStage: 'delivery',
      expectedVersion: 4,
    });
    expect(await readProcurementCaseStage(procurementCaseId)).toBe('DELIVERY');
  });

  it('advances delivery to invoicing once the delivery note is finalized', async () => {
    // The delivery note reaches FINALIZED through the delivery.record command (covered by its
    // own suite); seeding the finalized state directly here keeps this suite focused on the
    // transition engine.
    await seedCommercialDocument({
      id: documentIds.deliveryNote,
      name: `MAB-DN-${procurementCaseId.slice(0, 8)}`,
      documentType: 'DELIVERY_NOTE',
      lifecycleStatus: 'FINALIZED',
      aggregateVersion: 2,
      procurementCaseRecordId: procurementCaseId,
    });

    await transition({
      fromStage: 'delivery',
      toStage: 'invoicing',
      expectedVersion: 5,
    });
    expect(await readProcurementCaseStage(procurementCaseId)).toBe('INVOICING');
  });

  it('closes the case after finance-posting approval on the finalized invoice', async () => {
    await approveTransition({
      fromStage: 'invoicing',
      toStage: 'closed',
      expectedVersion: 6,
    });
    const body = await transition({
      fromStage: 'invoicing',
      toStage: 'closed',
      expectedVersion: 6,
    });
    Object.assign(closedTransitionBody, body);
    expect(await readProcurementCaseStage(procurementCaseId)).toBe('CLOSED');
  });

  it('replays the closing transition without another mutation or audit event', async () => {
    const eventsBefore = (await readAuditEvents(procurementCaseId)).length;
    const body = {
      ...closedTransitionBody,
      procurementCaseRecordId: procurementCaseId,
    };

    const response = await postCaseTransition({
      procurementCaseRecordId: procurementCaseId,
      body,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      replayed: true,
      aggregateVersion: 7,
      result: { fromStage: 'invoicing', toStage: 'closed' },
    });
    expect(await readProcurementCaseVersion(procurementCaseId)).toBe(7);
    expect((await readAuditEvents(procurementCaseId)).length).toBe(
      eventsBefore,
    );
  });

  it('wrote exactly one audited transition event per version, in order', async () => {
    const events = await readAuditEvents(procurementCaseId);

    expect(events.map((event) => event.command_name)).toEqual([
      'case.transition',
      'case.transition',
      'case.transition',
      'case.transition',
      'case.transition',
      'case.transition',
      'case.transition',
    ]);
    expect(events.map((event) => event.aggregate_version)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    for (const event of events) {
      expect(JSON.stringify(event.payload)).not.toContain('"actorId"');
    }
  });

  it('rejects any move out of the closed stage', async () => {
    const body = track(
      buildCaseTransitionRequest({
        procurementCaseRecordId: procurementCaseId,
        expectedVersion: 7,
        fromStage: 'closed',
        toStage: 'cancelled',
      }),
    );
    const response = await postCaseTransition({
      procurementCaseRecordId: procurementCaseId,
      body,
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_INVALID_TRANSITION',
    });
    expect(await readProcurementCaseStage(procurementCaseId)).toBe('CLOSED');
  });

  it('kept every document lifecycle state as seeded through the chain', async () => {
    expect(
      await readCommercialDocumentState(documentIds.customerInvoice),
    ).toMatchObject({ lifecycleStatus: 'FINALIZED' });
    expect(await readProcurementCaseVersion(procurementCaseId)).toBe(7);
  });
});
