# QV2 — frozen scope, architecture, file ownership and acceptance matrix

- Date: 2026-08-25
- Owner: DeepSeek harness (coordination synthesis)
- Inputs: QV1-C plan (Codex lane, PASS), QV1-A plan (Claude lane, PASS)
- BASE_SHA: `26d55fde1a85a4a24f35898bc751a62832c04fcc`
- Lanes: `deepseek/qv-codex` (Codex source), `deepseek/qv-claude` (Claude harness),
  `deepseek/qv-integration` (reviewed integration)

## Scope (frozen)

One read-only native page **"Vendor comparison"** that answers four questions for one selected
Procurement Case:

1. Which suppliers were invited and which replied?
2. How do price, delivery, commercial terms and evidence compare?
3. What is the deterministic recommendation, and what evidence or compliance issue limits it?
4. Is the customer quotation ready for a human to review and issue?

In scope: case header (client RFQ, due date, stage, evidence completeness), summary signals
(suppliers invited, responses received, response deadline, price variance), comparison table
(supplier with CR/VAT identity, quoted total + ISO currency, lead time, payment terms, validity,
status, source-evidence link), deterministic scoring with the visible formula, customer-quotation
summary, next-task/approval/compliance signals with native drill-through, and all runtime states.

Out of scope (unchanged): vendor CRUD, supplier selection, quotation approval, financial
finalization, compliance-state change, email/OCR, publish/install/deploy, version bump, live-data
mutation. The page is app-level; no server capability is required by any failing contract test.

## Architecture (frozen)

- **Read-model:** `loadVendorComparison(caseId)` — two-phase bounded read. Phase 1: case by
  `id eq`. Phase 2: `commercialDocuments` by `procurementCaseRecordId eq` (bounded limit,
  `pageInfo` → partial state). Phase 3: `companies` by `id IN [derived supplier/customer ids]`.
  All filters server-side; the UI never joins unrelated workspace records or other cases. This
  supersedes WF3's workspace-wide `load-case-workflow` (QV1-A threat T1).
- **Comparison contract (pure function over frozen inputs):**
  `buildVendorComparisonRecommendation(finalizedQuotes, asOf)`.
  - Candidates = finalized `vendorQuote` documents scoped to the case.
  - No finalized quotes → **No recommendation** (`no-finalized-quotes`).
  - Mixed currencies among candidates → **No recommendation** (`mixed-currency`, currencies listed).
  - Any candidate missing `totalAmount` → **No recommendation** (`missing-total`, refs listed).
  - Two or more finalized quotes from the same supplier → **No recommendation**
    (`conflicting-supplier-quotes`, refs listed).
  - Expired candidates (`validUntil < asOf`) are excluded, counted and shown; if none remain →
    **No recommendation** (`all-expired`).
  - Fewer than 2 comparable candidates remain → **No recommendation** (`insufficient-comparable`).
  - Ranking over the remaining set: `totalAmountMicros` asc → `leadTimeDays` asc (nulls last,
    visibly marked as missing) → document reference asc → id asc. Total order, no tie output.
  - The formula text is rendered on the page (bilingual) and lists every exclusion with its reason.
    AI must never produce or override the ranking; the explanation is static copy, not generated.
  - Payment terms are displayed but NOT ordinally ranked (no canonical vocabulary exists; an
    ordinal map would fabricate ranking semantics).
- **Summary signals:** invited = distinct suppliers referenced by finalized `supplierRfq`
  documents of the case; responses = distinct suppliers with finalized `vendorQuote`; response
  deadline = `procurementCase.supplierResponseDeadlineAt`; price variance = (max−min)/min over
  finalized same-currency quotes when ≥2 exist, otherwise not applicable. All signals are
  displayed with their formula and never fabricated.
- **Customer-quotation summary:** finalized customer-quote state with native drill-through;
  source-quotation linkage renders **"none selected"** honestly (linkage field is deferred — see
  gaps). Human-only selection and approval gates are preserved: the page has no write path.
- **No-permission vs empty:** Twenty ORM returns scoped-empty; the page uses one honest combined
  state whose copy does not claim a cause it cannot prove.
- **Identity:** navigation position 3 (after case workflow), icon from the existing Twenty icon
  set, no new assets, no version bump, no `application.config.ts` change.

## Metadata authorization (adjudicated by QV2)

Authorized, app-level only, additive fields (no server change, no existing-field modification):

- `commercialDocument`: `leadTimeDays` (Number), `paymentTerms` (Text), `validUntil` (Date).
- `procurementCase`: `supplierResponseDeadlineAt` (Date).
- `packages/pashx-mab-contract/src/metadata.ts`: fresh unique UUID identifiers for the fields
  above and for the `vendorComparison` front-component, page-layout, tab, widget and
  navigation-menu-item identifiers.

Rationale: the target page contract requires lead time, payment terms, validity and a response
deadline; price-only comparison would degrade the page below its contract. Manifest fields are
app-level metadata (the WF2 delivery fields took the same path) and apply only at the next
authorized publish/install (QV7/QV8). No live mutation occurs in this track.

Deferred (recorded gaps, not silently dropped):

- customerQuote → source-vendorQuote linkage (needs a server invariant decision; the summary
  shows "none selected").
- source-attachment presence column (polymorphic relation not readable; native drill-through
  satisfies "source-evidence link").
- payment-terms ordinal vocabulary (product decision; terms display-only today).

## File ownership (frozen)

**Codex lane — `deepseek/qv-codex`, write authority:**
- NEW `packages/twenty-apps/pashx-mab/src/vendor-comparison/` (types, model, loader)
- NEW `packages/twenty-apps/pashx-mab/src/front-components/vendor-comparison.{copy.ts,front-component.tsx,styles.ts}`
- NEW `packages/twenty-apps/pashx-mab/src/navigation-menu-items/vendor-comparison.navigation-menu-item.ts`
- NEW `packages/twenty-apps/pashx-mab/src/page-layouts/vendor-comparison.page-layout.ts`
- NEW `packages/twenty-apps/pashx-mab/test/vendor-comparison.{model,ui,accessibility}.test.ts`
- EDIT (additive only) `packages/twenty-apps/pashx-mab/src/objects/commercial-document.object.ts`,
  `packages/twenty-apps/pashx-mab/src/objects/procurement-case.object.ts`,
  `packages/pashx-mab-contract/src/metadata.ts`
- NEW `docs/execution/evidence/QV3-C-vendor-comparison-source.md`

Off-limits to QV3-C: `packages/twenty-server/**`, other front-components, `case-workflow/**`,
command-centre, profitability files, fields/roles/permission-flags/locales, `application.config.ts`,
version bumps, infra/deploy/operations docs, and the other two worktrees.

**Claude lane — `deepseek/qv-claude`, write authority:**
- NEW `packages/twenty-apps/pashx-mab/test/qv-sandbox-harness/**` (runner scripts, fixture
  inventory, cleanup verification; never imports production source as implementation)
- NEW `docs/execution/evidence/QV3-A-qv-sandbox-harness.md`
- NEW `docs/execution/evidence/QV8-release-evidence-template.md`

Off-limits to QV3-A: all Codex-owned app source, `twenty-server/**`, infra/deploy writes, live
pilot access, and the other two worktrees.

**Integration lane — `deepseek/qv-integration`:** DeepSeek cherry-picks only commits that passed
the reciprocal QV4 review gate. This QV2 document is the coordinator's frozen artifact.

## Acceptance matrix (frozen)

| Area | Gate |
|---|---|
| Ranking unit tests | ties; missing total → No rec; mixed currency → No rec; same-supplier conflict → No rec; expired exclusion; all-expired → No rec; single candidate → No rec; null lead-time ordering; deterministic total order |
| Isolation tests | loader emits `procurementCaseRecordId eq`, case `id eq`, companies `id IN`; no cross-case/cross-workspace join; other-case documents never rank |
| States | loading, empty, partial-evidence, conflict, error, no-permission — each with honest bilingual copy |
| Bilingual/a11y | EN/AR copy key parity, RTL switch, aria (live regions, table semantics), keyboard order, 44px targets, contrast floors, reduced-motion, IBM Plex via public assets |
| Build | app `yarn test` green; contract `yarn test` green; `yarn twenty dev:build .` succeeds; oxlint 0/0 on new files; `git diff --check` pass |
| Typecheck | NOT a gate (7 pre-existing baseline errors); new vendor-comparison files must add zero new errors (verified by targeted tsc or diffed error list) |
| Read-only proof | component source has no `fetch(`, no mutation imports, native `target="_top"` links only |
| No mutation | no version bump, no publish/install, no live-data mutation, no fixture mixing with accepted pilot evidence |

## QV3-C / QV3-A launch instructions

Launch concurrently after this freeze. QV3-C works ONLY in `twenty-qv-codex`
(branch `deepseek/qv-codex`); QV3-A works ONLY in `twenty-qv-claude`
(branch `deepseek/qv-claude`). Each installs its own dependencies inside its worktree
(`corepack yarn install` or focused workspace installs — never copy the primary `node_modules`).
Each commits on its own branch and returns the machine-readable handoff block. No pushes to the
integration or primary branches. Any missing `BASE_SHA`, live mutation, secret exposure,
unrelated file change or absent cleanup proof is an automatic `BLOCKED`.
