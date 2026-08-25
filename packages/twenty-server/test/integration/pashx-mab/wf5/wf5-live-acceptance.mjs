#!/usr/bin/env node
/* eslint-disable no-console -- standalone CLI harness; stdout is its evidence output. */
/**
 * WF5 live acceptance harness — one disposable procurement case through the whole MAB chain.
 *
 * Codex-owned source harness for the WF5 bilingual acceptance node. It drives the real REST
 * boundary of the installed PashX MAB application (app 0.2.11+) against one clearly labelled
 * disposable case and a full WF1 document set, then deletes every created record and verifies
 * absence. It never touches accepted pilot evidence.
 *
 * Usage:
 *   WF5_BASE_URL=https://<host> WF5_BEARER=<token> node wf5-live-acceptance.mjs        # plan
 *   WF5_BASE_URL=... WF5_BEARER=... WF5_EXECUTE=1 node wf5-live-acceptance.mjs          # execute
 *
 * Optional overrides:
 *   WF5_APPROVER_MEMBER_ID=<uuid>   workspace member used as the approval approver (defaults to
 *                                   the bearer's own workspace member via GraphQL currentUser)
 *   WF5_PREFIX=WF5-QA-<short>       label prefix for every disposable record
 *
 * Exit codes: 0 pass, 2 fail, 3 environment/plan error.
 */
import { randomUUID } from 'node:crypto';

const BASE_URL = (process.env.WF5_BASE_URL ?? '').replace(/\/$/, '');
const BEARER = process.env.WF5_BEARER ?? '';
const EXECUTE = process.env.WF5_EXECUTE === '1';
const PREFIX = process.env.WF5_PREFIX ?? `WF5-QA-${randomUUID().slice(0, 8)}`;

if (BASE_URL === '' || BEARER === '') {
  console.error(
    'Missing WF5_BASE_URL or WF5_BEARER. Plan mode also requires them to read identity.',
  );
  process.exit(3);
}

const fail = (message, code = 2) => {
  console.error(`FAIL: ${message}`);
  process.exit(code);
};

const request = async (method, path, body) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${BEARER}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = text === '' ? null : JSON.parse(text);
  } catch {
    parsed = text;
  }

  return { status: response.status, body: parsed };
};

const graphql = async (query) => {
  const response = await fetch(`${BASE_URL}/graphql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${BEARER}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const json = await response.json();
  if (json.errors !== undefined && json.errors.length > 0) {
    fail(`GraphQL error: ${json.errors[0].message}`);
  }

  return json.data;
};

const ids = { case: null, supplier: null, documents: [], approvals: [], keys: [] };
const trackKey = (body) => {
  if (typeof body === 'object' && body !== null && typeof body.idempotencyKey === 'string') {
    ids.keys.push(body.idempotencyKey);
  }

  return body;
};

const plan = (message) => console.log(`[plan] ${message}`);

const createRecord = async (objectPlural, data) => {
  plan(`POST /rest/${objectPlural} ${JSON.stringify(data)}`);
  if (!EXECUTE) return { id: null };
  const response = await request('POST', `/rest/${objectPlural}`, data);
  if (response.status !== 201 && response.status !== 200) {
    fail(`create ${objectPlural} returned ${response.status}: ${JSON.stringify(response.body)}`);
  }

  return response.body;
};

const postCommand = async (path, body) => {
  trackKey(body);
  plan(`POST ${path} ${JSON.stringify(body)}`);
  if (!EXECUTE) return { status: 201, body: { ok: true, replayed: false, result: null } };
  const response = await request('POST', path, body);
  if (response.status !== 201) {
    fail(`command ${path} returned ${response.status}: ${JSON.stringify(response.body)}`);
  }

  return response;
};

const approveTransition = async (fromStage, toStage, expectedVersion) => {
  const approvalRequestRecordId = randomUUID();
  ids.approvals.push(approvalRequestRecordId);
  const digest = await sha256Json({
    procurementCaseRecordId: ids.case,
    fromStage,
    toStage,
    expectedVersion,
  });
  const requestBody = trackKey({
    contractVersion: 1,
    approvalRequestRecordId,
    idempotencyKey: randomUUID(),
    name: `${PREFIX} approve ${fromStage} to ${toStage}`,
    requestedActionCode: 'case.transition',
    payloadDigest: digest,
    sourceRecordIds: [ids.case],
    approverRecordId: approverMemberId,
  });
  const decisionBody = trackKey({
    contractVersion: 1,
    idempotencyKey: randomUUID(),
    expectedStatus: 'PENDING',
    decision: 'APPROVE',
    decisionNote: `${PREFIX} live acceptance approve`,
  });
  plan(`POST /rest/pashx-mab/approval-requests ${JSON.stringify(requestBody)}`);
  plan(
    `POST /rest/pashx-mab/approval-requests/${approvalRequestRecordId}/decisions ${JSON.stringify(decisionBody)}`,
  );
  if (EXECUTE) {
    const created = await request('POST', '/rest/pashx-mab/approval-requests', requestBody);
    if (created.status !== 201) {
      fail(`approval request returned ${created.status}: ${JSON.stringify(created.body)}`);
    }
    const decided = await request(
      'POST',
      `/rest/pashx-mab/approval-requests/${approvalRequestRecordId}/decisions`,
      decisionBody,
    );
    if (decided.status !== 201) {
      fail(`approval decision returned ${decided.status}: ${JSON.stringify(decided.body)}`);
    }
  }
};

const transition = async (fromStage, toStage, expectedVersion) => {
  const body = trackKey({
    contractVersion: 1,
    procurementCaseRecordId: ids.case,
    idempotencyKey: randomUUID(),
    expectedVersion,
    payload: { fromStage, toStage },
  });

  return postCommand(`/rest/pashx-mab/procurement-cases/${ids.case}/transitions`, body);
};

const finalize = async (documentId, expectedVersion) =>
  postCommand(`/rest/pashx-mab/commercial-documents/${documentId}/finalize`, {
    contractVersion: 1,
    commercialDocumentRecordId: documentId,
    idempotencyKey: randomUUID(),
    expectedVersion,
  });

const sha256Json = async (value) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(value)),
  );

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

let approverMemberId = process.env.WF5_APPROVER_MEMBER_ID ?? '';

const main = async () => {
  console.log(`WF5 live acceptance — ${EXECUTE ? 'EXECUTE' : 'PLAN'} mode`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Disposable prefix: ${PREFIX}`);

  const identity = await graphql(
    'query { currentUser { workspaceMember { id } } }',
  );
  approverMemberId =
    approverMemberId || identity?.currentUser?.workspaceMember?.id;
  if (approverMemberId === undefined || approverMemberId === null) {
    fail('Cannot resolve the bearer workspace member id for approval decisions.');
  }
  console.log(`Approver workspace member: ${approverMemberId}`);

  // --- Disposable records -----------------------------------------------------
  const supplier = await createRecord('companies', {
    name: `${PREFIX} disposable supplier`,
  });
  ids.supplier = supplier.id ?? null;

  const createDocument = async (name, data) => {
    const document = await createRecord('commercialDocuments', {
      name,
      ...data,
    });
    ids.documents.push(document.id ?? null);
    if (document.id !== null && document.id !== undefined) {
      return document.id;
    }
    fail(`document ${name} could not be created (plan mode stops here).`);
  };

  const caseRecord = await createRecord('procurementCases', {
    name: `${PREFIX} disposable case`,
  });
  ids.case = caseRecord.id ?? null;
  if (ids.case === null) fail('procurement case could not be created (plan mode stops here).');

  const customerRfqId = await createDocument(`${PREFIX}-RFQ`, {
    documentType: 'CUSTOMER_RFQ',
    procurementCaseRecordId: ids.case,
  });
  const vendorQuoteAId = await createDocument(`${PREFIX}-VQA`, {
    documentType: 'VENDOR_QUOTE',
    procurementCaseRecordId: ids.case,
    supplierRecordId: ids.supplier,
    issueDate: new Date().toISOString().slice(0, 10),
    currencyCode: 'SAR',
    totalAmount: { amountMicros: 100_000_000, currencyCode: 'SAR' },
  });
  const vendorQuoteBId = await createDocument(`${PREFIX}-VQB`, {
    documentType: 'VENDOR_QUOTE',
    procurementCaseRecordId: ids.case,
    supplierRecordId: ids.supplier,
    issueDate: new Date().toISOString().slice(0, 10),
    currencyCode: 'SAR',
    totalAmount: { amountMicros: 120_000_000, currencyCode: 'SAR' },
  });
  const customerQuoteId = await createDocument(`${PREFIX}-CQ`, {
    documentType: 'CUSTOMER_QUOTE',
    procurementCaseRecordId: ids.case,
    issueDate: new Date().toISOString().slice(0, 10),
    currencyCode: 'SAR',
    totalAmount: { amountMicros: 150_000_000, currencyCode: 'SAR' },
  });
  const customerPurchaseOrderId = await createDocument(`${PREFIX}-CPO`, {
    documentType: 'CUSTOMER_PURCHASE_ORDER',
    procurementCaseRecordId: ids.case,
    issueDate: new Date().toISOString().slice(0, 10),
    currencyCode: 'SAR',
    totalAmount: { amountMicros: 150_000_000, currencyCode: 'SAR' },
  });
  const vendorPurchaseOrderId = await createDocument(`${PREFIX}-VPO`, {
    documentType: 'VENDOR_PURCHASE_ORDER',
    procurementCaseRecordId: ids.case,
    supplierRecordId: ids.supplier,
    issueDate: new Date().toISOString().slice(0, 10),
    currencyCode: 'SAR',
    totalAmount: { amountMicros: 100_000_000, currencyCode: 'SAR' },
  });
  const deliveryNoteId = await createDocument(`${PREFIX}-DN`, {
    documentType: 'DELIVERY_NOTE',
    procurementCaseRecordId: ids.case,
    issueDate: new Date().toISOString().slice(0, 10),
  });
  const customerInvoiceId = await createDocument(`${PREFIX}-INV`, {
    documentType: 'CUSTOMER_INVOICE',
    procurementCaseRecordId: ids.case,
    issueDate: new Date().toISOString().slice(0, 10),
    currencyCode: 'SAR',
    totalAmount: { amountMicros: 150_000_000, currencyCode: 'SAR' },
  });

  // --- Chain walk -------------------------------------------------------------
  await finalize(customerRfqId, 1);
  await transition('intake', 'sourcing', 0);

  await finalize(vendorQuoteAId, 1);
  await finalize(vendorQuoteBId, 1);
  await finalize(customerQuoteId, 1);
  await transition('sourcing', 'quoted', 1);

  await finalize(customerPurchaseOrderId, 1);
  await approveTransition('quoted', 'customer-order', 2);
  await transition('quoted', 'customer-order', 2);

  await finalize(vendorPurchaseOrderId, 1);
  await approveTransition('customer-order', 'vendor-order', 3);
  await transition('customer-order', 'vendor-order', 3);

  await transition('vendor-order', 'delivery', 4);

  await postCommand(`/rest/pashx-mab/procurement-cases/${ids.case}/delivery`, {
    contractVersion: 1,
    procurementCaseRecordId: ids.case,
    idempotencyKey: randomUUID(),
    expectedVersion: 5,
    payload: {
      deliveryNoteRecordId: deliveryNoteId,
      deliveryStatus: 'full',
      dueAt: new Date().toISOString(),
    },
  });

  await transition('delivery', 'invoicing', 6);
  await finalize(customerInvoiceId, 1);
  await approveTransition('invoicing', 'closed', 7);
  await transition('invoicing', 'closed', 7);

  console.log(`Chain walk complete — case is CLOSED at aggregateVersion 8.`);

  // --- Cleanup ----------------------------------------------------------------
  if (!EXECUTE) {
    console.log(`[plan] cleanup would delete ${ids.documents.length} documents, 1 case, 1 supplier, ${ids.approvals.length} approvals.`);
    console.log(`[plan] dry run only — pass WF5_EXECUTE=1 with Shahil's fixture authority to run live.`);
    process.exit(0);
  }

  for (const documentId of ids.documents) {
    if (documentId === null) continue;
    await request('DELETE', `/rest/commercialDocuments/${documentId}`);
  }
  if (ids.case !== null) await request('DELETE', `/rest/procurementCases/${ids.case}`);
  if (ids.supplier !== null) await request('DELETE', `/rest/companies/${ids.supplier}`);
  for (const approvalId of ids.approvals) {
    await request('DELETE', `/rest/approvalRequests/${approvalId}`);
  }

  // Verify absence through the same read boundary.
  for (const [objectPlural, id] of [
    ['commercialDocuments', ...ids.documents.filter(Boolean)],
    ['procurementCases', ...(ids.case === null ? [] : [ids.case])],
    ['companies', ...(ids.supplier === null ? [] : [ids.supplier])],
    ['approvalRequests', ...ids.approvals],
  ]) {
    for (const recordId of id) {
      const response = await request('GET', `/rest/${objectPlural}/${recordId}`);
      if (response.status !== 404) {
        fail(`cleanup verification: ${objectPlural}/${recordId} still returns ${response.status}`);
      }
    }
  }

  console.log('Cleanup verified — every disposable record returns 404.');
  console.log(`WF5 live acceptance PASS (fixture prefix ${PREFIX}).`);
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
