# VPO2 — Vendor Purchase Order detail: frozen contract and ownership

- Date: 2026-08-25
- Owner: DeepSeek + Shahil (product rules approved by Shahil)
- BASE_SHA: `03d391db609afc805b5fc1756d344df1acc1e40c`
- Governing graph: `docs/execution/2026-08-25 - vendor-purchase-order detail parallel harness graph.md`
- Worktrees: `../twenty-vpo-codex` (deepseek/vpo-codex), `../twenty-vpo-claude`
  (deepseek/vpo-claude), `../twenty-vpo-integration` (deepseek/vpo-integration)

## Scope

One native PxD Vendor Purchase Order detail page: source-backed PO header, MAB progress rail,
structured order-lines table, supplier identity/compliance panel, human approval panel, evidence/
audit/related-case links, all runtime states, English/Arabic/RTL/a11y/200%-zoom acceptance.
The page is read-only; stage changes and approvals go through the audited command surface only.

## Frozen decisions (Shahil-approved 2026-08-25)

### D1 — documentLine schema (APPROVED)

Extend `documentLine` with: `commercialDocumentRecordId` (relation, one workspace boundary),
`position` (integer), `description`, `specification`, `quantity` (decimal, > 0), `unit`,
`unitPriceMicros` (integer), `lineTotalMicros` (integer), `currencyCode`,
`sourceFileReference`. All money is integer micros. Validation rejects negative/zero quantity,
mismatched line sums, and mixed currencies (fail closed, never silently converted). Migration is
app-level metadata + typed contract validation; no server capability is assumed until a failing
contract test proves one is needed.

### D2 — requiredBy (APPROVED)

`requiredBy` (Date) is stored on the **procurementCase** (deal-level commitment). Missing value
renders **Not recorded**; never derived silently.

### D3 — supplier risk (APPROVED)

**Not available in this release.** No proven PO-level compliance projection exists; the panel
renders **Not recorded** and never infers a risk or a vendor "Verified" badge from company
existence, CR, or VAT presence.

### D4 — PO-specific approval action code (APPROVED)

Add `purchaseOrder.approval` to the allowlisted approval action codes. Canonical payload digest
over `{procurementCaseRecordId, commercialDocumentRecordId, expectedVersion, totalAmountMicros,
currencyCode}`. Reuses the audited approval-request/decision/idempotency/CAS/audit boundary
(one request → one approval + one audit event; replay no-op; changed payload with same key → typed
409; stale version → `PASHX_RECORD_CONFLICT` with no partial write).

### D5 — role matrix and assigned-approver enforcement (APPROVED)

- `PashX MAB Admin` and `PashX MAB Operator`: may request, decide, and cancel PO approvals.
- Viewer and Evidence Agent: read-only.
- **Assigned-approver enforcement**: the requester may not approve their own request.
- Cross-user and cross-workspace attempts fail closed.

### D6 — PO edit (APPROVED)

**Native read-only drill-through only in this release.** No dedicated audited PO-edit command.
The accepted command boundary (WF2 finalize/cancel + approval surface) is unchanged.

### D7 — draft download (APPROVED)

**Unavailable/disabled** until a deterministic local document renderer is accepted. The action
renders its unavailable state with copy; it is not silently removed.

### D8 — supporting-evidence strip (CONFIRMED by graph)

Internal approval, supplier confirmation, receipt, vendor invoice, and verified payment render in
a separate supporting-evidence strip with explicit **Not recorded** until the corresponding
authoritative record exists. They never advance the case stage. **Payment requires a verified
`cashMovement`** (UI6 semantics: VERIFIED, positive, source-linked, evidence-linked); pending/
rejected/incomplete movements are excluded and counted.

### D9 — real 27-line gate (CONFIRMED by graph)

`MAB-PO-2026-4141` is the read-only acceptance anchor only. Its 27 source lines are **not**
imported or shown as structured facts until the human-reviewed document correction ledger marks
each line verified. Until then the page preserves the source document link and shows the line
table as incomplete/**Not recorded**. The accepted record is never used for mutation tests.

## File ownership (frozen)

**Codex lane — `deepseek/vpo-codex`, write authority:**
- `packages/pashx-mab-contract/` — typed schema, command payloads, errors, tests.
- `packages/twenty-apps/pashx-mab/` — objects (documentLine, procurementCase requiredBy), roles,
  page/front component, copy, read model, tests.
- `packages/twenty-server/src/modules/pashx-mab/` + integration tests — ONLY when a failing
  contract test proves an app-only implementation is insufficient.
- `docs/execution/evidence/` — source evidence.

**Claude lane — `deepseek/vpo-claude`, write authority:**
- The VPO2-approved harness and release-evidence paths only (sandbox runner, fixture inventory,
  release/rollback template, runtime evidence). Never edits Codex-owned feature files.

**Integration lane — `deepseek/vpo-integration`:** DeepSeek applies only PASS-reviewed commits;
mechanical conflict resolution only; no redesign during integration.

## Acceptance matrix (frozen)

| Area | Gate |
|---|---|
| Data/isolation | one workspace + one case boundary; every displayed value matches source + link; line arithmetic in integer micros; mixed currency/inconsistent totals fail closed; missing requiredBy/owner/risk/lines/attachment/evidence explicit; no fictional mockup values |
| Commands | request → exactly 1 approval + 1 audit; replay no-op; changed payload same key → 409; stale → RECORD_CONFLICT no partial write; approve/reject/cancel preserve actor/note/audit; unauthorized/cross-user/cross-workspace fail closed; timeout → safe identical retry |
| UI/a11y | ready/loading/empty/partial/unavailable/pending/approved/rejected/cancelled/conflict/validation-error/timeout/error/not-found/no-permission states; landmarks/headings/table headers/status announcements/named controls; visible focus, Tab order, 44px, reduced motion, no color-only state; Arabic meaning + full RTL + LTR isolation for refs/SAR; native 200% zoom no clipping/scroll; drill-through links exact native records |
| Build | contract/app/server suites; lint; typecheck; official app build; `git diff --check` — all green, zero new errors |

## Sanitized live-QA fixture rule (frozen)

Real `MAB-PO-2026-4141` is read-only. Mutation QA uses exactly one fixture family
`VPO-QA-DISPOSABLE-<run-id>`: one fictional supplier, one case, one PO, verified test lines, and
only the approval records required by the matrix. Every UUID captured immediately; cleanup by
captured IDs with REST 404 + SQL zero-row + pre/post count proof. No email, no finalizing real
evidence, no compliance change, no cash evidence, no touching the accepted PO. Assigned-approver
and cross-user rows need a second credentialed identity; without one those rows stay **BLOCKED**.

## Release/rollback boundary (frozen)

At VPO8 Claude resolves the next unused version at runtime (never assumes 0.2.15 while other
lanes are active). App-only changes use private publish/install; any server/renderer delta
requires separate host-build/deploy authority, immutable digest, prior-digest rollback. Identity,
duplicate metadata, unauthorized write, amount mismatch, broken idempotency/CAS/audit, missing
evidence, persistent health failure, or secret exposure → immediate rollback.

## Handoff

NODE: VPO2
BASE_SHA: 03d391db609afc805b5fc1756d344df1acc1e40c
STATUS: PASS
COMMITS: none (freeze document)
FILES_CHANGED: docs/execution/evidence/VPO2-vendor-purchase-order-frozen-contract.md
TESTS: n/a (freeze; base verified at VPO1: 127/127 app, 28/28 contract, lint 0, typecheck 0, build 26 files)
FIXTURES_CREATED: none
FIXTURES_CLEANED: none
LIVE_MUTATION: none
VERSION: 0.2.14 (installed base, unchanged)
SOURCE_DIGEST: 03d391db609afc805b5fc1756d344df1acc1e40c
MANIFEST_SHASUM: n/a
HOST_DIGEST: n/a
ROLLBACK: n/a
RISKS: assigned-approver/cross-user live rows need a second credentialed identity or stay BLOCKED; documentLine migration is app-level until a failing contract test proves otherwise
NEXT_OWNER: VPO3-C (Codex) + VPO3-A (Claude) concurrently
