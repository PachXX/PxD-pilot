# Command Centre coordinator — DeepSeek harness brief

- Date: 2026-08-25
- Coordinator: DeepSeek harness
- Application/source lane: Codex (isolated worktrees)
- QA/release lane: Claude (isolated worktrees, live evidence)
- Product authority: Shahil
- Status: **assigned 2026-08-25 — clean-base check and real-data gap matrix complete; source/QA lanes may run; publish/install and live mutations remain a separate approval gate**

## Mandate

Coordinate the Command Centre (live page
`https://34-18-165-1.nip.io/page/cfb3c81e-3acd-47a3-83e9-6f35b358c386`, STANDALONE_PAGE instance of
the `Command centre` layout) so it presents **real source-backed MAB data only**:

- Use all verified MAB cases, documents, companies, approvals, compliance, tasks, insights,
  workflow, delivery/invoice and cash evidence.
- Never fabricate numbers and never reintroduce deleted demo records.
- Match the approved Command Centre mockup: English/Arabic, RTL, accessibility, 200% zoom,
  native drill-through, ruled signal band + deterministic ledger + narrow evidence-insights
  panel (ADR-0003/OC6 language).
- Keep honest unavailable states for anything not backed by stored data (insights, expenses,
  OCR/email remain unavailable until their gates pass).

## Authority order

1. `docs/execution/2026-08-21 - operational command-centre graph.md`
2. `docs/architecture/ADR-0003-command-centre-operational-control-plane.md`
3. `docs/execution/2026-08-24 - MAB operating workflow graph.md` and its WF1–WF5 evidence
4. `DESIGN.md` and the approved mockup language
5. `CLAUDE.md`
6. Existing source and tests

If these disagree, stop at the smallest conflicting decision and record it.

## Lane protocol (isolated worktrees)

Established worktrees (reconciled 2026-08-25 — do not create parallel ones):

- **Codex lane (source/UI):** `twenty-cc-live-codex` on `deepseek/cc-live-codex` — bounded
  changes to `packages/pashx-mab-contract`, `packages/twenty-apps/pashx-mab`,
  `packages/twenty-server/src/modules/pashx-mab` and their tests. Exit: narrow tests → package
  suites → lint → typecheck → official app `dev:build`.
- **Claude lane (QA/release):** `twenty-cc-live-claude` on `deepseek/cc-live-claude` —
  browser/runtime acceptance, publish/install, Cloud SQL read-only verification, rollback
  evidence. Exit: live evidence doc committed.
- **Integration base:** `twenty-cc-live-integration` on `deepseek/cc-live-integration`.

### 2026-08-25 coordinator review — in-flight Codex-lane overview builder

`command-centre/build-command-centre-overview.ts` (worktree, uncommitted): **PASS** — composes
only frozen models (`buildOperationalWorkQueue`, `buildVendorComparisonSummary` /
`buildVendorComparisonRecommendation`, `aggregateVerifiedCashFlow`); quotation recommendation
maps to honest statuses; cash state is capability-gated (`UNAVAILABLE`) with `NOT_RECORDED`
when no contributions; stage summaries count stage-null cases as `unrecordedCount` (matching the
gap matrix §7); native links only. No fabrication path found. Live pilot has no cash capability
yet, so the cash band will render its honest unavailable state.
- One node `in_progress` per lane at a time; parallel work only on disjoint files with
  independent exit conditions.
- No lane may publish, install, mutate live data, enable OCR/email, or change compliance state
  without the explicit release gate below.

## Gates

- **Source gate:** source + sandbox verification only; no live side effects.
- **Release gate (separate approval):** Shahil's explicit authority for publish/install and any
  live mutation, recorded in the evidence doc before the action. Disposable fixtures only;
  deleted by captured UUID and verified absent (DS6/WF5 protocol).

## Shared-context update protocol

After every node, append one entry to the shared ledger with: node, lane, changed files,
commands, evidence, failures, next ready node, blockers. Evidence docs live under
`docs/execution/evidence/` and the ledger is `docs/execution/2026-08-24 - MAB operating workflow
graph.md` plus the operational command-centre graph.

## Hard stops

- Do not fabricate demo counts, insights, approvals, email candidates or source links.
- Do not reintroduce deleted demo records (e.g. OC3 fixtures) as current data.
- Do not infer case stage, due dates, compliance or approval state from filenames.
- Do not send/delete email, finalize financial documents, approve/reject for a human, or change
  compliance state.
- Do not claim UI values that the bounded read model cannot produce.

## Initial findings (real-data gap matrix)

Full matrix: `docs/execution/evidence/CC-coordination-real-data-gap-matrix.md`. Headline:

- Live verified inventory (read-only probes 2026-08-25): **3 cases, 8 documents, 25 companies,
  2 decided approvals (0 pending), 0 insights, 0 expenses**.
- Imported cases carry **no stage** (MI rule: never infer from filenames) — the Case workflow
  rail and Command Centre classifiers must render this as an honest data-completeness signal,
  not fabricate a stage.
- The live install predates the Vendors page and the supplier-RFQ command; both are verified in
  source + local sync only.
- Google Sheet `1MpVpiBdkYO9u7uMMjfjubNGycLJivHCIEGMlnuxdOAk`: only the Clients tab is publicly
  exportable; Suppliers/Users/Documents tabs require authenticated access — inventory for the
  matrix comes from the MI3–MI5 evidence and the live imported records instead.
