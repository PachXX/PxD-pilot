# WF2 — permission-checked, idempotent, audited workflow commands

- Date: 2026-08-24
- Owner: Codex, executed via the DeepSeek harness
- State: **complete in source; not published or installed**
- Depends on: WF1 typed document/transition contract

## Outcome

Four new capability-gated REST commands enforce the WF1 MAB operating graph transactionally.
Every write carries an idempotency receipt and an immutable audit event in the same workspace
transaction, follows the OC3 advisory-lock and optimistic-concurrency pattern, and refuses any
principal without the exact PashX capability. The full chain is proven end to end: intake →
sourcing → quoted → customer order → vendor order → delivery → invoicing → closed, including both
human approval gates and the delivery recording that finalizes the delivery note.

### Commands

| Endpoint | Capability | Command | Enforced invariant |
|---|---|---|---|
| `POST /rest/pashx-mab/procurement-cases/:id/transitions` | `caseEdit` | `case.transition` | WF1 stage graph only; no skip, backward, closed→active, or cancelled→active; required finalized evidence per stage; gated stages demand an APPROVED `case.transition` approval carrying the canonical digest and the case in its source records |
| `POST /rest/pashx-mab/commercial-documents/:id/finalize` | `documentEdit` | `document.finalize` | draft → finalized; owning case required; WF1 rules `requiresSupplier`/`requiresTotal`; finalized documents immutable |
| `POST /rest/pashx-mab/commercial-documents/:id/cancel` | `documentEdit` | `document.cancel` | draft → cancelled; cancelled documents reject every later move |
| `POST /rest/pashx-mab/procurement-cases/:id/delivery` | `deliveryRecord` | `delivery.record` | case must be in `delivery`; the linked delivery note must be a draft on the same case; writes `deliveryStatus` (PARTIAL/FULL) + `deliveryDueAt`, finalizes the note, bumps the case version |

Cancellation of an active stage is the one transition allowed outside the forward graph, per WF1.
Gated transitions (`client-order-verification`, `internal-procurement-approval`,
`finance-posting-approval`) reuse the OC3 approval request/decide flow; the digest includes the
case id, both stages and the `expectedVersion`, so a stale approval cannot fire against a newer
case version.

## Decisions recorded

- **`sourceAttachmentRequired` is not enforced at finalize.** The workflow rules require a source
  attachment for every document role, but attachment linkage is a polymorphic custom relation
  with no stable transactional read path in this codebase revision. Finalize enforces the
  deterministic single-row rules (`requiresSupplier`, `requiresTotal`) and WF3 surfaces attachment
  presence as evidence quality; the requirement stays visible for WF4 live QA rather than being
  silently dropped.
- **The transition approval digest lives server-side** (`pashx-command-fingerprint.util.ts`), not
  in the shared contract: the contract is bundled into the browser app, which cannot resolve
  `node:crypto`. This matches the boundary the other command fingerprints already respect. A
  browser-side digest helper belongs to the WF3 approval UI if one is ever authorized.
- **New error codes** `PASHX_TRANSITION_EVIDENCE_MISSING`, `PASHX_DOCUMENT_EVIDENCE_MISSING`,
  `PASHX_APPROVAL_GATE_UNSATISFIED` (all 409, non-retryable) with bilingual messages.

## Changed source

- `packages/pashx-mab-contract/src/workflow-commands.ts` (+ validators, request/result types,
  `PASHX_CASE_TRANSITION_ACTION_CODE`), `domain.ts` (`PASHX_CASE_DELIVERY_STATUSES`),
  `errors.ts`, `metadata.ts` (delivery field/option identifiers), `index.ts`
- `packages/pashx-mab-contract/test/workflow-commands.test.mjs`
- `packages/twenty-apps/pashx-mab/src/objects/procurement-case.object.ts`
  (`deliveryStatus`, `deliveryDueAt`)
- `packages/twenty-server/src/modules/pashx-mab/`:
  - services `pashx-case-transition.service.ts`, `pashx-document-lifecycle.service.ts`,
    `pashx-delivery-record.service.ts`, `pashx-workflow-persistence.service.ts`
  - controllers `pashx-case-transition.controller.ts`, `pashx-document-lifecycle.controller.ts`,
    `pashx-delivery-record.controller.ts`
  - utils `pashx-command-http.util.ts`, extended `pashx-command-fingerprint.util.ts`,
    `pashx-manifest-value.util.ts` (stage/delivery maps + reverse lookups),
    `pashx-command-support.service.ts` (generic replay/persist), module wiring
  - unit specs for all three services + module smoke update
- `packages/twenty-server/test/integration/pashx-mab/`:
  - utils `post-workflow-command.util.ts`, extended `pashx-mab-test-context.util.ts`
  - suites `11-case-transition-chain`, `12-case-transition-guards`,
    `13-document-lifecycle`, `14-delivery-record`

## Verification

- `yarn workspace pashx-mab-contract test` — **27/27 pass**, 100% line/branch/function coverage
  including `workflow-commands.js`.
- `yarn workspace pashx-mab test` — **53/53 pass**; lint clean; `twenty dev:build .` passes
  (18 files) with manifest typecheck.
- Server unit: `yarn jest --config ./jest.config.mjs pashx-mab` — **54/54 pass (8 suites)**.
- `yarn nx typecheck:ci twenty-server` — pass. `lint:diff-with-main` + oxlint/oxfmt on the new
  files — pass.
- Integration (real Postgres workspace transaction, real REST boundary):
  `NODE_ENV=test nx jest --config ./jest-integration.config.ts --runInBand pashx-mab` —
  **14/14 suites, 109/109 assertions**. The pre-existing CL2 suites 01–10 still pass unchanged;
  suites 11–14 walk the full chain, every guard, both approval gates, delivery recording, replay,
  key reuse, stale versions, permission layers and audit-event counts against stored rows.
- Local execution notes (for the next integration run): the app must be synced into the test
  workspace (`yarn workspace pashx-mab twenty dev . -r cl2-local` against a `NODE_ENV=test`
  server on port 4000) before the WF2 suites; `assertPashxWorkflowColumnsInstalled` fails fast
  if `deliveryStatus`/`deliveryDueAt` are missing. The CURRENCY composite is stored as
  `totalAmountAmountMicros`/`totalAmountCurrencyCode` and read as `totalAmount.amountMicros`
  through the workspace ORM.

## Boundary and next node

WF2 contains no publish, install, live-data mutation, or version bump — that remains WF4
(Claude). **WF3 is ready:** the native case timeline, price comparison, delivery and
invoice-readiness surface in the Evidence Ledger design language, with visual parity against the
approved mockups flagged for review.
