# Vendor directory and supplier RFQ request — PxD extension lane

- Date: 2026-08-25
- Owner: Codex, executed via the DeepSeek harness
- Product authority: Shahil (scope approved 2026-08-25: vendor directory + RFQ request, no vendor CRUD)
- Status: **complete in source; synced into the local test workspace; live execution follows the WF5/DS6 protocol**

## Outcome

A new native **Vendors** page (standalone, navigation position 5 after the parallel lane's pages)
manages every existing supplier and requests RFQs against a client requirement:

- **Supplier directory** — all companies carrying the MAB `SUPPLIER` role, with CR/VAT,
  open supplier-RFQ count, replied quotation count and the active case names behind open
  requests; every row drills through to the native company record.
- **Request RFQ flow** — the operator picks a procurement case that is in Intake or Sourcing
  and carries a client RFQ (the client requirement), selects suppliers and a reply due date;
  one typed `supplierRfq` document (WF1 step-2 role) is created per supplier by a new
  permission-checked, idempotent, audited command.
- **Honest boundary** — the pilot cannot send email or WhatsApp yet. The request is recorded,
  numbered (`MAB-SRFQ-<period>-<nnnn>`) and audited; outbound sending is displayed as
  explicitly unavailable.

## New command: `document.create` for supplier RFQs

`POST /rest/pashx-mab/procurement-cases/:id/supplier-rfqs` (capability `procurementIssue`)

- Request: one `idempotencyKey`, the case `expectedVersion`, `dueAt` (ISO UTC) and 1–20
  `vendorRows`, each with a client-generated `supplierRfqRecordId` and `supplierRecordId`.
- Enforced rules (in transaction, advisory locks on idempotency key + case aggregate):
  - case exists and version matches (optimistic concurrency);
  - case stage is `intake` or `sourcing` only;
  - at least one `customerRfq` document exists on the case (new error
    `PASHX_CLIENT_REQUIREMENT_MISSING`, 409);
  - every supplier resolves to an existing company record (404 otherwise);
  - duplicate rows (same supplier or same document id) are rejected at the contract validator;
  - one numbered supplier RFQ document is created per row in `DRAFT` and the case version bumps
    once for the whole batch; receipt + immutable audit event (`document.create`) written in the
    same transaction; identical replay returns the stored result without new writes.
- The vendor directory page lists open requests (draft supplier RFQs) and replied quotations
  (vendor quote documents), which then feed the Case workflow price comparison.

## Changed source

- `packages/pashx-mab-contract/src/workflow-commands.ts` — request/result types, row limit,
  `validateRequestSupplierRfqsRequest`; `errors.ts` — `PASHX_CLIENT_REQUIREMENT_MISSING`
  (bilingual); `metadata.ts` — `vendorDirectory` front-component/page-layout/navigation ids;
  `test/workflow-commands.test.mjs` — full validator coverage (100% branch/line/function).
- `packages/twenty-server/src/modules/pashx-mab/`:
  - `services/pashx-supplier-rfq.service.ts` (+ unit spec),
    `pashx-workflow-persistence.service.ts` (company repo, `loadCompany`,
    `countCaseDocumentsByType`), `pashx-command-support.service.ts`
    (`allocateSupplierRfqNumber`), `pashx-command-fingerprint.util.ts`
    (`createSupplierRfqsFingerprint`), `utils/pashx-command-http.util.ts` (new 409 mapping),
    `controllers/pashx-supplier-rfq.controller.ts`, module wiring, smoke spec.
  - `test/integration/pashx-mab/suites/15-supplier-rfq-request.integration-spec.ts` (9
    scenarios) + `utils/post-workflow-command.util.ts` builders.
- `packages/twenty-apps/pashx-mab/`:
  - `src/vendor-directory/` — `vendor-directory.types.ts`, `load-vendor-directory.ts`
    (bounded loader, supplier-role filter, RFQ-eligible case derivation, per-vendor activity),
  - `src/front-components/vendor-directory.*` (component, bilingual copy, styles),
  - `src/page-layouts/vendor-directory.page-layout.ts`,
    `src/navigation-menu-items/vendor-directory.navigation-menu-item.ts` (position 5),
  - `test/vendor-directory-ui.test.ts` (16 specs).

## Verification

- `yarn workspace pashx-mab-contract test` — **100% coverage maintained**.
- `yarn workspace pashx-mab test` — **123/123 pass** (including the 16 new vendor specs);
  lint 0/0; standalone typecheck clean; `twenty dev:build .` — **26 files** with manifest
  typecheck.
- Server: `yarn jest --config ./jest.config.mjs pashx-mab` — **63/63 (9 suites)**;
  `yarn nx typecheck:ci twenty-server` — pass; oxlint/oxfmt clean.
- Integration (real Postgres workspace, real REST boundary): suite 15 **9/9**; full
  pashx-mab module run 01–15 recorded in the evidence log (expected **15/15 suites,
  118/118 assertions**).
- Local sync: `twenty dev . -r cl2-local` — **46/46 entities synced**; `core.pageLayout`
  contains the `Vendors` STANDALONE_PAGE; `core.navigationMenuItem` order is deterministic:
  Command centre 0, Operational profitability 1, MAB pipeline 2, Case workflow 3, Vendor
  comparison 4, Vendors 5.
- No publish/install/live-data mutation occurred. Note: the parallel quotation-vendor lane
  added its own metadata concurrently; the navigation positions were reconciled to unique
  values during this node.

## Boundary and next step

Vendor CRUD stays out (approved scope); supplier RFQ replies arrive as vendor-quote documents
and surface in the Case workflow comparison. Live execution (browser English/Arabic + cleanup)
follows the WF5/DS6 protocol with Shahil's fixture authority. Source repairs from live
execution return to Codex with evidence.
