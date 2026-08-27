/**
 * WF2-15 — supplier RFQ request command through the real REST boundary: one case with a client
 * RFQ requests quotations from several vendors; each supplier RFQ document is created with a
 * deterministic number, the case version bumps once, and every guard fails closed.
 */
import { randomUUID } from 'node:crypto';

import {
  assertPashxAppInstalled,
  assertPashxWorkflowColumnsInstalled,
  cleanupPashxTestData,
  countReceipts,
  readAuditEvents,
  readCommercialDocumentState,
  readCounter,
  readProcurementCaseVersion,
  seedCommercialDocument,
  seedProcurementCase,
  seedSupplierCompany,
  CURRENT_PERIOD,
} from 'test/integration/pashx-mab/utils/pashx-mab-test-context.util';
import {
  buildSupplierRfqsRequest,
  postSupplierRfqs,
} from 'test/integration/pashx-mab/utils/post-workflow-command.util';

describe('WF2-15 supplier RFQ request command', () => {
  const caseId = randomUUID();
  const keyReuseCaseId = randomUUID();
  const quotedCaseId = randomUUID();
  const supplierA = randomUUID();
  const supplierB = randomUUID();
  const idempotencyKeys: string[] = [];
  const createdRfqIds: string[] = [];
  let counterBefore: number;

  const track = (body: { idempotencyKey: string }) => {
    idempotencyKeys.push(body.idempotencyKey);

    return body;
  };

  const build = (
    {
      procurementCaseRecordId = caseId,
      expectedVersion,
      idempotencyKey,
    }: {
      procurementCaseRecordId?: string;
      expectedVersion: number;
      idempotencyKey?: string;
    },
    rowIds: readonly [string, string] = [randomUUID(), randomUUID()],
  ) => {
    createdRfqIds.push(...rowIds);

    return track(
      buildSupplierRfqsRequest({
        procurementCaseRecordId,
        expectedVersion,
        vendorRows: [
          { supplierRfqRecordId: rowIds[0], supplierRecordId: supplierA },
          {
            supplierRfqRecordId: rowIds[1],
            supplierRecordId: supplierB,
            vendorReference: 'MAB-SO-001',
          },
        ],
        ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
      }),
    );
  };

  const seedCaseWithClientRfq = async (
    id: string,
    aggregateVersion: number,
  ) => {
    await seedProcurementCase({ id, aggregateVersion, stage: 'INTAKE' });
    await seedCommercialDocument({
      id: randomUUID(),
      name: `MAB-CRFQ-${id.slice(0, 8)}`,
      documentType: 'CUSTOMER_RFQ',
      lifecycleStatus: 'DRAFT',
      aggregateVersion: 1,
      procurementCaseRecordId: id,
    });
  };

  beforeAll(async () => {
    await assertPashxAppInstalled();
    await assertPashxWorkflowColumnsInstalled();

    await seedCaseWithClientRfq(caseId, 2);
    await seedCaseWithClientRfq(keyReuseCaseId, 0);
    await seedProcurementCase({
      id: quotedCaseId,
      aggregateVersion: 4,
      stage: 'QUOTED',
    });
    await seedSupplierCompany(supplierA);
    await seedSupplierCompany(supplierB);
    counterBefore = (await readCounter('supplierRfq', CURRENT_PERIOD)) ?? 0;
  });

  afterAll(async () => {
    await cleanupPashxTestData({
      procurementCaseIds: [caseId, keyReuseCaseId, quotedCaseId],
      commercialDocumentIds: createdRfqIds,
      supplierIds: [supplierA, supplierB],
      idempotencyKeys,
    });
  });

  it('creates one supplier RFQ per vendor with numbered names, receipt and audit', async () => {
    const rowIds = [randomUUID(), randomUUID()] as const;
    createdRfqIds.push(...rowIds);
    const body = track(
      buildSupplierRfqsRequest({
        procurementCaseRecordId: caseId,
        expectedVersion: 2,
        vendorRows: [
          { supplierRfqRecordId: rowIds[0], supplierRecordId: supplierA },
          {
            supplierRfqRecordId: rowIds[1],
            supplierRecordId: supplierB,
            vendorReference: 'MAB-SO-001',
          },
        ],
      }),
    );
    const response = await postSupplierRfqs({
      procurementCaseRecordId: caseId,
      body,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ok: true,
      replayed: false,
      aggregateId: caseId,
      aggregateVersion: 3,
      result: {
        procurementCaseRecordId: caseId,
        supplierRfqRecordIds: [...rowIds],
        supplierRecordIds: [supplierA, supplierB],
        aggregateVersion: 3,
      },
    });
    expect(response.body.result.dueAt).toEqual(expect.any(String));

    const documentA = await readCommercialDocumentState(rowIds[0]);
    expect(documentA).toMatchObject({
      documentType: 'SUPPLIER_RFQ',
      lifecycleStatus: 'DRAFT',
      aggregateVersion: 1,
      procurementCaseRecordId: caseId,
      supplierRecordId: supplierA,
    });
    expect(documentA?.name).toMatch(
      new RegExp(`^MAB-SRFQ-${CURRENT_PERIOD}-\\d{4,}$`),
    );
    const documentB = await readCommercialDocumentState(rowIds[1]);
    expect(documentB?.name).not.toBe(documentA?.name);
    expect(await readProcurementCaseVersion(caseId)).toBe(3);
    expect(await readCounter('supplierRfq', CURRENT_PERIOD)).toBe(
      counterBefore + 2,
    );
    expect(await countReceipts(body.idempotencyKey)).toBe(1);

    const events = await readAuditEvents(caseId);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      command_name: 'document.create',
      aggregate_version: 3,
    });
    expect(JSON.stringify(events[0].payload)).not.toContain('"actorId"');
  });

  it('replays the same request without creating further documents', async () => {
    const firstKey = idempotencyKeys[0];
    const rowIds = createdRfqIds.slice(0, 2) as [string, string];
    const body = track(
      buildSupplierRfqsRequest({
        procurementCaseRecordId: caseId,
        expectedVersion: 2,
        idempotencyKey: firstKey,
        vendorRows: [
          { supplierRfqRecordId: rowIds[0], supplierRecordId: supplierA },
          {
            supplierRfqRecordId: rowIds[1],
            supplierRecordId: supplierB,
            vendorReference: 'MAB-SO-001',
          },
        ],
      }),
    );
    const response = await postSupplierRfqs({
      procurementCaseRecordId: caseId,
      body,
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ ok: true, replayed: true });
    expect(await countReceipts(body.idempotencyKey)).toBe(1);
    expect(await readAuditEvents(caseId)).toHaveLength(1);
  });

  it('rejects reusing the key with a different payload', async () => {
    const first = build({
      procurementCaseRecordId: keyReuseCaseId,
      expectedVersion: 0,
    });
    const firstResponse = await postSupplierRfqs({
      procurementCaseRecordId: keyReuseCaseId,
      body: first,
    });
    expect(firstResponse.status).toBe(201);
    expect(await readProcurementCaseVersion(keyReuseCaseId)).toBe(1);

    const second = track(
      buildSupplierRfqsRequest({
        procurementCaseRecordId: keyReuseCaseId,
        expectedVersion: 0,
        idempotencyKey: first.idempotencyKey,
        vendorRows: [
          { supplierRfqRecordId: randomUUID(), supplierRecordId: supplierA },
        ],
      }),
    );
    const response = await postSupplierRfqs({
      procurementCaseRecordId: keyReuseCaseId,
      body: second,
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_IDEMPOTENCY_KEY_REUSED',
    });
    expect(await readProcurementCaseVersion(keyReuseCaseId)).toBe(1);
  });

  it('rejects a request outside intake or sourcing', async () => {
    const body = build({
      procurementCaseRecordId: quotedCaseId,
      expectedVersion: 4,
    });
    const response = await postSupplierRfqs({
      procurementCaseRecordId: quotedCaseId,
      body,
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_INVALID_TRANSITION',
    });
    expect(await readProcurementCaseVersion(quotedCaseId)).toBe(4);
  });

  it('rejects a request without a recorded client RFQ', async () => {
    const requirementMissingCaseId = randomUUID();
    await seedProcurementCase({
      id: requirementMissingCaseId,
      aggregateVersion: 0,
      stage: 'INTAKE',
    });
    const body = build({
      procurementCaseRecordId: requirementMissingCaseId,
      expectedVersion: 0,
    });
    const response = await postSupplierRfqs({
      procurementCaseRecordId: requirementMissingCaseId,
      body,
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_CLIENT_REQUIREMENT_MISSING',
    });
    await cleanupPashxTestData({
      procurementCaseIds: [requirementMissingCaseId],
      commercialDocumentIds: createdRfqIds.splice(createdRfqIds.length - 2, 2),
    });
  });

  it('rejects an unknown supplier company', async () => {
    const missingSupplierId = randomUUID();
    const body = build({ procurementCaseRecordId: caseId, expectedVersion: 3 });
    body.payload.vendorRows = [
      {
        supplierRfqRecordId: body.payload.vendorRows[0].supplierRfqRecordId,
        supplierRecordId: missingSupplierId,
      },
    ];
    const response = await postSupplierRfqs({
      procurementCaseRecordId: caseId,
      body,
    });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_RECORD_NOT_FOUND',
    });
    expect(await readProcurementCaseVersion(caseId)).toBe(3);
  });

  it('rejects a stale expected version with the current version attached', async () => {
    const body = build({ procurementCaseRecordId: caseId, expectedVersion: 2 });
    const response = await postSupplierRfqs({
      procurementCaseRecordId: caseId,
      body,
    });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_STALE_VERSION',
      currentVersion: 3,
      retryable: true,
    });
  });

  it('rejects duplicate rows for the same supplier', async () => {
    const body = build({ procurementCaseRecordId: caseId, expectedVersion: 3 });
    body.payload.vendorRows = [
      {
        supplierRfqRecordId: body.payload.vendorRows[0].supplierRfqRecordId,
        supplierRecordId: supplierA,
      },
      {
        supplierRfqRecordId: body.payload.vendorRows[1].supplierRfqRecordId,
        supplierRecordId: supplierA,
      },
    ];
    const response = await postSupplierRfqs({
      procurementCaseRecordId: caseId,
      body,
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_INVALID_INPUT',
      fieldPaths: ['payload.vendorRows'],
    });
  });

  it('refuses an authenticated member without the procurement-issue capability', async () => {
    const body = build({ procurementCaseRecordId: caseId, expectedVersion: 3 });
    const response = await postSupplierRfqs({
      procurementCaseRecordId: caseId,
      body,
      bearer: APPLE_PHIL_GUEST_ACCESS_TOKEN,
    });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      ok: false,
      code: 'PASHX_FORBIDDEN_CAPABILITY',
    });
    expect(await countReceipts(body.idempotencyKey)).toBe(0);
  });
});
