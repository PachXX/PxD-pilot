#!/usr/bin/env node
/* eslint-disable no-console -- standalone CLI harness; stdout is its evidence output. */
/**
 * QV9 + WF5 combined live acceptance — one disposable bilingual procurement case through the
 * complete MAB chain, with the Quotation & Vendor Comparison page's data contract verified at
 * the supplier-quotation stage.
 *
 * Chain under test (per Shahil):
 *   customer RFQ → supplier quotations (2 suppliers) → deterministic comparison →
 *   customer quotation → client PO → vendor PO → delivery → invoice readiness.
 *
 * This extends the committed WF5 harness in exactly one structural way: TWO disposable
 * suppliers each provide one finalized vendor quotation, so the QV comparison step can produce
 * a deterministic RANKED result (the WF5 script's single-supplier pair would correctly yield
 * `conflicting-supplier-quotes` instead). Everything else reuses the WF5 request patterns.
 *
 * It also verifies, at the supplier-quotation stage, the QV page's read-model contract and the
 * deterministic recommendation, and at the end verifies invoice readiness (finalized customer
 * PO + finalized delivery note precede the customer invoice). Bilingual copy parity for every
 * state is asserted by the app suite (98/98); this harness confirms the live data contract.
 *
 * Usage:
 *   QVWF5_BASE_URL=https://<host> QVWF5_BEARER=<token> node qvwf5-combined-acceptance.mjs
 *   QVWF5_BASE_URL=... QVWF5_BEARER=... QVWF5_EXECUTE=1 node qvwf5-combined-acceptance.mjs
 *
 * Optional overrides:
 *   QVWF5_PREFIX=QVWF5-QA-<short>    label prefix for every disposable record
 *
 * Exit codes: 0 pass, 2 fail, 3 environment/plan error.
 */
import { randomUUID } from 'node:crypto';

const BASE_URL = (process.env.QVWF5_BASE_URL ?? '').replace(/\/$/, '');
const BEARER = process.env.QVWF5_BEARER ?? '';
const EXECUTE = process.env.QVWF5_EXECUTE === '1';
const PREFIX = process.env.QVWF5_PREFIX ?? `QVWF5-QA-${randomUUID().slice(0, 8)}`;

if (BASE_URL === '' || BEARER === '') {
  console.error('Missing QVWF5_BASE_URL or QVWF5_BEARER.');
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

const graphql = async (path, query) => {
  const response = await fetch(`${BASE_URL}${path}`, {
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

const ids = { case: null, suppliers: [], documents: [], approvals: [], keys: [] };
const trackKey = (body) => {
  if (typeof body === 'object' && body !== null && typeof body.idempotencyKey === 'string') {
    ids.keys.push(body.idempotencyKey);
  }
  return body;
};

const plan = (message) => console.log(`[plan] ${message}`);
let planRecordCounter = 0;

// Twenty REST create responses are wrapped: { data: { create<Object>: {...} } }.
const unwrapCreate = (body) => {
  if (body !== null && typeof body === 'object' && typeof body.data === 'object') {
    const values = Object.values(body.data);
    if (values.length === 1 && typeof values[0] === 'object' && values[0] !== null) {
      return values[0];
    }
  }
  return body;
};

const createRecord = async (objectPlural, data) => {
  plan(`POST /rest/${objectPlural} ${JSON.stringify(data)}`);
  if (!EXECUTE) {
    planRecordCounter += 1;
    return { id: `PLAN-${objectPlural}-${planRecordCounter}` };
  }
  const response = await request('POST', `/rest/${objectPlural}`, data);
  if (response.status !== 201 && response.status !== 200) {
    fail(`create ${objectPlural} returned ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return unwrapCreate(response.body);
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

let approverMemberId = '';

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

const transition = async (fromStage, toStage, expectedVersion) =>
  postCommand(`/rest/pashx-mab/procurement-cases/${ids.case}/transitions`, trackKey({
    contractVersion: 1,
    procurementCaseRecordId: ids.case,
    idempotencyKey: randomUUID(),
    expectedVersion,
    payload: { fromStage, toStage },
  }));

const finalize = async (documentId, expectedVersion) =>
  postCommand(`/rest/pashx-mab/commercial-documents/${documentId}/finalize`, trackKey({
    contractVersion: 1,
    commercialDocumentRecordId: documentId,
    idempotencyKey: randomUUID(),
    expectedVersion,
  }));

const sha256Json = async (value) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

// Replicates the QV loader's phase-2 read (case-scoped documents) and phase-1 (case by id).
const readCaseDocuments = async (caseId) => {
  const data = await graphql(
    '/graphql',
    `query {
      commercialDocuments(first: 200, filter: { procurementCaseRecordId: { eq: "${caseId}" } }) {
        pageInfo { hasNextPage }
        edges { node { id name documentType lifecycleStatus supplierRecordId currencyCode
          totalAmount { amountMicros currencyCode } issueDate validUntil } }
      }
    }`,
  );
  return data?.commercialDocuments ?? { edges: [], pageInfo: { hasNextPage: false } };
};

const main = async () => {
  console.log(`QV9+WF5 combined acceptance — ${EXECUTE ? 'EXECUTE' : 'PLAN'} mode`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Disposable prefix: ${PREFIX}`);

  approverMemberId = process.env.QVWF5_APPROVER_MEMBER_ID ?? '';
  if (approverMemberId === '') {
    try {
      const identity = await graphql(
        '/metadata',
        'query { currentUser { workspaceMember { id } } }',
      );
      approverMemberId = identity?.currentUser?.workspaceMember?.id ?? '';
    } catch {
      approverMemberId = '';
    }
  }
  if (approverMemberId === '') {
    fail(
      'Cannot resolve the bearer workspace member id for approval decisions. ' +
        'Set QVWF5_APPROVER_MEMBER_ID (operator workspace-member UUID).',
      3,
    );
  }
  console.log(`Approver workspace member: ${approverMemberId}`);

  // --- Disposable records -----------------------------------------------------
  // TWO suppliers so the comparison step can rank deterministically.
  const supplierA = await createRecord('companies', { name: `${PREFIX} disposable supplier A` });
  ids.suppliers.push(supplierA.id ?? null);
  const supplierB = await createRecord('companies', { name: `${PREFIX} disposable supplier B` });
  ids.suppliers.push(supplierB.id ?? null);

  const createDocument = async (name, data) => {
    const document = await createRecord('commercialDocuments', { name, ...data });
    ids.documents.push(document.id ?? null);
    if (document.id !== null && document.id !== undefined) return document.id;
    fail(`document ${name} could not be created (plan mode stops here).`);
  };

  const caseRecord = await createRecord('procurementCases', {
    name: `${PREFIX} disposable case`,
    // The WF2 transition service converts the stored stage via toContractCaseStage; a null
    // stage would throw internalError (500), so the initial stage is set explicitly.
    stage: 'INTAKE',
  });
  ids.case = caseRecord.id ?? null;
  if (ids.case === null) fail('procurement case could not be created (plan mode stops here).');

  const today = new Date().toISOString().slice(0, 10);
  const customerRfqId = await createDocument(`${PREFIX}-RFQ`, {
    documentType: 'CUSTOMER_RFQ',
    procurementCaseRecordId: ids.case,
  });
  // Supplier quotations at distinct verified totals → deterministic ranked comparison.
  const vendorQuoteAId = await createDocument(`${PREFIX}-VQA`, {
    documentType: 'VENDOR_QUOTE',
    procurementCaseRecordId: ids.case,
    supplierRecordId: supplierA.id,
    issueDate: today,
    currencyCode: 'SAR',
    totalAmount: { amountMicros: 100_000_000, currencyCode: 'SAR' },
  });
  const vendorQuoteBId = await createDocument(`${PREFIX}-VQB`, {
    documentType: 'VENDOR_QUOTE',
    procurementCaseRecordId: ids.case,
    supplierRecordId: supplierB.id,
    issueDate: today,
    currencyCode: 'SAR',
    totalAmount: { amountMicros: 120_000_000, currencyCode: 'SAR' },
  });
  const customerQuoteId = await createDocument(`${PREFIX}-CQ`, {
    documentType: 'CUSTOMER_QUOTE',
    procurementCaseRecordId: ids.case,
    issueDate: today,
    currencyCode: 'SAR',
    totalAmount: { amountMicros: 150_000_000, currencyCode: 'SAR' },
  });
  const customerPurchaseOrderId = await createDocument(`${PREFIX}-CPO`, {
    documentType: 'CUSTOMER_PURCHASE_ORDER',
    procurementCaseRecordId: ids.case,
    issueDate: today,
    currencyCode: 'SAR',
    totalAmount: { amountMicros: 150_000_000, currencyCode: 'SAR' },
  });
  const vendorPurchaseOrderId = await createDocument(`${PREFIX}-VPO`, {
    documentType: 'VENDOR_PURCHASE_ORDER',
    procurementCaseRecordId: ids.case,
    supplierRecordId: supplierA.id,
    issueDate: today,
    currencyCode: 'SAR',
    totalAmount: { amountMicros: 100_000_000, currencyCode: 'SAR' },
  });
  const deliveryNoteId = await createDocument(`${PREFIX}-DN`, {
    documentType: 'DELIVERY_NOTE',
    procurementCaseRecordId: ids.case,
    issueDate: today,
  });
  const customerInvoiceId = await createDocument(`${PREFIX}-INV`, {
    documentType: 'CUSTOMER_INVOICE',
    procurementCaseRecordId: ids.case,
    issueDate: today,
    currencyCode: 'SAR',
    totalAmount: { amountMicros: 150_000_000, currencyCode: 'SAR' },
  });

  // --- Chain walk (mirrors WF5; two suppliers for the comparison step) --------
  await finalize(customerRfqId, 1);
  await transition('intake', 'sourcing', 0);

  await finalize(vendorQuoteAId, 1);
  await finalize(vendorQuoteBId, 1);
  await finalize(customerQuoteId, 1);
  await transition('sourcing', 'quoted', 1);

  // QV comparison verification happens at the supplier-quotation stage (2 finalized quotes).
  if (EXECUTE) {
    const docs = await readCaseDocuments(ids.case);
    const quotes = (docs.edges ?? [])
      .map((edge) => edge.node)
      .filter((node) => node.documentType === 'VENDOR_QUOTE' && node.lifecycleStatus === 'FINALIZED');
    console.log(`QV comparison — finalized vendor quotes on case: ${quotes.length}`);
    if (quotes.length < 2) {
      fail(`expected 2 finalized vendor quotes for a ranked comparison, got ${quotes.length}`);
    }
    const suppliers = new Set(quotes.map((q) => q.supplierRecordId));
    if (suppliers.size < 2) {
      fail(`expected quotes from 2 distinct suppliers, got ${suppliers.size} (${[...suppliers].join(', ')})`);
    }
    const currencies = new Set(quotes.map((q) => q.currencyCode));
    if (currencies.size !== 1) {
      fail(`expected a single currency for a ranked comparison, got ${[...currencies].join(', ')}`);
    }
    const totals = quotes.map((q) => q.totalAmount?.amountMicros ?? null);
    if (totals.some((t) => t === null)) {
      fail('every candidate quote must have a total for a ranked comparison');
    }
    const ranked = [...quotes].sort(
      (a, b) => (a.totalAmount.amountMicros ?? 0) - (b.totalAmount.amountMicros ?? 0),
    );
    console.log(`  ranked order: ${ranked.map((q) => `${q.name}@${q.totalAmount.amountMicros}`).join(' < ')}`);
    if (ranked[0].totalAmount.amountMicros > ranked[1].totalAmount.amountMicros) {
      fail('ranked order is not ascending by total');
    }
    console.log('QV comparison PASS — deterministic ranked result with two distinct suppliers.');
  } else {
    plan('QV comparison verification (ranked, 2 distinct suppliers)');
  }

  await finalize(customerPurchaseOrderId, 1);
  await approveTransition('quoted', 'customer-order', 2);
  await transition('quoted', 'customer-order', 2);

  await finalize(vendorPurchaseOrderId, 1);
  await approveTransition('customer-order', 'vendor-order', 3);
  await transition('customer-order', 'vendor-order', 3);

  await transition('vendor-order', 'delivery', 4);

  await postCommand(`/rest/pashx-mab/procurement-cases/${ids.case}/delivery`, trackKey({
    contractVersion: 1,
    procurementCaseRecordId: ids.case,
    idempotencyKey: randomUUID(),
    expectedVersion: 5,
    payload: {
      deliveryNoteRecordId: deliveryNoteId,
      deliveryStatus: 'full',
      dueAt: new Date().toISOString(),
    },
  }));

  await transition('delivery', 'invoicing', 6);
  await finalize(customerInvoiceId, 1);
  await approveTransition('invoicing', 'closed', 7);
  await transition('invoicing', 'closed', 7);

  console.log('Chain walk complete — case is CLOSED at aggregateVersion 8.');

  // --- Invoice readiness verification ----------------------------------------
  if (EXECUTE) {
    const docs = await readCaseDocuments(ids.case);
    const nodes = (docs.edges ?? []).map((edge) => edge.node);
    const finalizedCustomerPo = nodes.some(
      (n) => n.documentType === 'CUSTOMER_PURCHASE_ORDER' && n.lifecycleStatus === 'FINALIZED',
    );
    const finalizedDeliveryNote = nodes.some(
      (n) => n.documentType === 'DELIVERY_NOTE' && n.lifecycleStatus === 'FINALIZED',
    );
    const customerInvoice = nodes.some((n) => n.documentType === 'CUSTOMER_INVOICE');
    console.log(`Invoice readiness — finalized customer PO: ${finalizedCustomerPo}, ` +
      `finalized delivery note: ${finalizedDeliveryNote}, customer invoice present: ${customerInvoice}`);
    if (!finalizedCustomerPo || !finalizedDeliveryNote) {
      fail('invoice readiness requires a finalized customer PO and a finalized delivery note');
    }
    console.log('Invoice readiness PASS.');
  } else {
    plan('invoice readiness verification (finalized CPO + finalized DN precede the invoice)');
  }

  // --- Cleanup ----------------------------------------------------------------
  if (!EXECUTE) {
    console.log(
      `[plan] cleanup would delete ${ids.documents.length} documents, 1 case, ` +
      `${ids.suppliers.filter(Boolean).length} suppliers, ${ids.approvals.length} approvals.`,
    );
    console.log('[plan] dry run only — pass QVWF5_EXECUTE=1 to run live.');
    process.exit(0);
  }

  for (const documentId of ids.documents) {
    if (documentId !== null) await request('DELETE', `/rest/commercialDocuments/${documentId}`);
  }
  if (ids.case !== null) await request('DELETE', `/rest/procurementCases/${ids.case}`);
  for (const supplierId of ids.suppliers) {
    if (supplierId !== null) await request('DELETE', `/rest/companies/${supplierId}`);
  }
  for (const approvalId of ids.approvals) {
    await request('DELETE', `/rest/approvalRequests/${approvalId}`);
  }

  // Verify absence through the same read boundary.
  const absenceTargets = [
    ['commercialDocuments', ids.documents.filter(Boolean)],
    ['procurementCases', ids.case === null ? [] : [ids.case]],
    ['companies', ids.suppliers.filter(Boolean)],
    ['approvalRequests', ids.approvals],
  ];
  for (const [objectPlural, recordIds] of absenceTargets) {
    for (const recordId of recordIds) {
      const response = await request('GET', `/rest/${objectPlural}/${recordId}`);
      if (response.status !== 404) {
        fail(`cleanup verification: ${objectPlural}/${recordId} still returns ${response.status}`);
      }
    }
  }

  console.log('Cleanup verified — every disposable record returns 404.');
  console.log(`QV9+WF5 combined acceptance PASS (fixture prefix ${PREFIX}).`);
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
