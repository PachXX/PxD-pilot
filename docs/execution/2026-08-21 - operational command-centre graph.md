# Operational Command Centre graph — insights, approvals, compliance, tasks, agents, email

- Date: 2026-08-21
- Status: **OC0–OC4 deployed and accepted; OC6-A app 0.2.10 live and fixture-dependent DS6 matrix complete; OC5, OC5-OCR, OC6-B/C and OC7 blocked**
- Architecture: `docs/architecture/ADR-0003-command-centre-operational-control-plane.md`

## User outcome

From one PxD Command Centre, an authorized MAB operator can understand what changed, see what needs
approval or compliance attention, open the next task and its evidence, and ask a task-specific agent
to prepare a bounded proposal from native records or synchronized email. The operator remains in
control of every consequential action.

## First-viewport composition

The approved mockup language remains the visual contract:

- dark native PxD/Twenty navigation and calm light workspace;
- one ruled signal band for Actions, Approvals, Compliance, and Blocked data;
- one dense priority ledger combining the next tasks in deterministic precedence;
- a narrow evidence-insights panel with source links and explicit generated timestamps;
- no generic dashboard-card mosaic, fake metrics, decorative AI copy, or unsupported navigation.

## Nodes

| Node | Owner | Depends on | Deliverable | State |
|---|---|---|---|---|
| **OC0** | Codex + Shahil | CC5/MI work may continue independently | Architecture, autonomy limits, email/privacy boundary, graph. | **approved 2026-08-21** |
| **OC1** | Codex | OC0 approved | Typed contracts, objects, capabilities, precedence, audit fields, and evaluation fixtures. | **complete in source 2026-08-21** |
| **OC2** | Codex | OC1 | Deterministic next-task and compliance projections; no AI dependency. | **foundation complete in source 2026-08-21** |
| **OC3** | Codex + Claude | OC1 | Approval request object, request/approve/reject/cancel commands, idempotency and audit. | **accepted for the single-user pilot 2026-08-23; REJECT and cross-user enforcement deferred to OC7** |
| **OC4** | Codex | OC1 + OC2 | Read-only evidence analyst and specialist task agents with least-privilege roles. | **accepted 2026-08-24; app 0.2.9 live, agents/role verified in Cloud SQL; model behavior deferred to OC7** |
| **OC5** | Codex + Claude | OC1 + native mailbox connected | Read-only synchronized-email candidates; review-before-task/approval creation. | blocked |
| **OC5-OCR** | Codex + Claude | OC1 + accepted OCR benchmark/provider | Text-layer-first document extraction, OCR fallback, page/region provenance, confidence and human review before create. | **contract/corpus inventory complete; local smoke benchmark 24/25 critical fields, provider acceptance blocked pending OC5-OCR-B2** |
| **OC6** | Codex | OC2 + OC3 + OC4 + OC5 + OC5-OCR | Native bilingual Command Centre panels matching approved mockups. | **OC6-A source accepted 2026-08-24; OC6-B/C remain blocked** |
| **OC7** | Codex + Claude + Shahil | OC6 | Contract, permission, idempotency, prompt-injection, privacy, RTL, accessibility, and live QA. | blocked |

### OC5-OCR-B2 acceptance split

| Subnode | Owner | Deliverable | Exit condition |
|---|---|---|---|
| **B2-A** | Codex | Sanitized, labeled 30-50-page corpus spanning English, Arabic, mixed language, scans, text-layer, hybrid, tables, and multi-page packets. | **human review in progress: native Google Sheet created 2026-08-24; 40/40 pages assigned to Shahil, 0/40 approved and ground-truth labels still pending** |
| **B2-B** | Codex + Shahil | Frozen scorecard and confusable-character policy. | **complete 2026-08-24; scorecard and no-silent-confusable policy approved and frozen** |
| **B2-C** | Claude | Lean bilingual pipeline benchmark on isolated disposable target-class compute; never the live app VM. | Cold/warm latency, peak memory/disk, timeout, cancellation, retry, corrupt-page behavior, and queue isolation are recorded. |
| **B2-D** | Codex + Claude + Shahil | Provider decision. | Evidence-backed accept/reject decision is recorded; only an accepted provider may unblock OC5-OCR. |

Until B2-D passes, OCR remains disabled and all existing extraction types remain review-only
contracts rather than a production capability.

### Parallel OC6 source split

The blocked integrations do not require all Command Centre source work to stop. DeepSeek may
coordinate **OC6-A** now: extend the existing native page with the already-authorized four-signal
queue (compliance, approvals, blocked data, operator actions) and stored read-only evidence
insights. Email and OCR appear only as honest unavailable states. **OC6-B** remains blocked on OC5
and OC5-OCR; **OC6-C** remains the final integrated/live acceptance after those gates pass.

**OC6-A source acceptance completed 2026-08-24.** Pending approvals and active stored insights are
integrated into the bounded read model and native bilingual page. Contract 15/15, application
50/50, lint and official Twenty app build pass. No publish/install occurred. Evidence:
`docs/execution/evidence/OC6-A-core-command-centre.md`.

DS5 completed on 2026-08-24: app `0.2.10` is published/installed, its source/tarball evidence is
recorded, health and logs pass, and `0.2.9` remains the rollback target. Codex then exercised the
authenticated operator DS6 matrix: role scope, four-signal counts, blocked-data drill-through,
English/Arabic RTL, accessibility semantics, 44px targets, refresh/success/empty/partial states,
console health and a 200%-reflow-equivalent viewport pass. After explicit fixture authority, one
disposable pending approval and one active insight proved priority, native record drill-through and
source traceability; both exact UUIDs were deleted and verified absent. Physical Tab/VoiceOver and
exact native 200% zoom remain manual observations, not automated claims. Evidence:
`docs/execution/evidence/OC6-A-DS6-live-qa.md`.

The bounded harness contract and Codex/Claude ownership split are recorded in
`docs/execution/2026-08-24 - deepseek-command-centre-handoff.md`.

## Approved-by-default safety constraints

- Agents draft and recommend; humans approve consequential writes.
- Agent output never becomes compliance or financial truth by itself.
- Every insight/task/approval links to immutable source identifiers.
- Email is read from Twenty-synchronized records only; no mailbox secret enters PxD.
- Initial release cannot send/delete email or autonomously finalize/approve/reject records.
- Prompt injection inside email or attachments is untrusted content, never an instruction.
- OCR text and extracted fields are proposals, never authoritative financial/compliance values;
  original file, page/region, engine version and confidence remain attached through review.
- OCR/provider work is asynchronous and outside every financial or approval transaction.
- Deterministic queues remain available when the agent service is unavailable.

## Proposed implementation order

1. OC1 + OC2: next tasks and compliance first, because they are deterministic and immediately
   useful.
2. OC3: approvals with full audit and idempotency.
3. OC4: evidence insights and one procurement-triage agent.
4. OC5: read-only email intake after a mailbox is connected and acceptance fixtures exist.
5. OC6 + OC7: integrated UI and live pilot acceptance.

## OC3 source evidence

- Added authenticated REST commands to request an approval and to approve, reject, or cancel a
  pending request. Operator cancellation requires ownership; approve/reject requires the decision
  capability and honors an assigned workspace-member approver.
- The native Twenty `approvalRequest` record is authoritative. Its state, latest human decision
  actor/time/note and latest audit-event ID are written with the idempotency receipt and immutable
  audit event inside one workspace QueryRunner transaction.
- Advisory locks are ordered idempotency key then approval aggregate. A matching retry returns the
  stored result without another object mutation or audit event; key reuse with a changed request
  remains a typed conflict; the status compare-and-swap permits exactly one terminal transition.
- Verification: contract 15/15 with 100% measured coverage; app 38/38; server approval/module 10/10;
  official Twenty app `dev:build` passes (17 files); targeted server TypeScript reports no OC3
  errors. Full repository typecheck/lint orchestration remains affected by pre-existing generated
  SDK declarations/legacy test lib targets and the missing local `@oxlint/plugins` dependency.
- Initial source verification occurred before live deployment; the final real Cloud SQL/REST
  acceptance is recorded below and in `docs/execution/evidence/OC3-capability-repair.md`.
- Live 0.2.7 QA then found HTTP 403 for the authenticated workspace owner. Generated-manifest and
  live-database checks proved all application-role relations were present; Shahil holds Twenty's
  standard non-editable Admin role, while `PashxCapabilityService` checked explicit custom
  relations only.
- The source repair recognizes only the canonical standard Admin universal identifier as workspace
  administrative authority. Application roles still require exact flag relations; no user/email
  allowlist or manual system-role relation was introduced. Regression coverage is 3/3 and the full
  PashX server suite is 13/13.
- App 0.2.8 is published and auto-installed under the unchanged application identity. Both server
  permission repairs are live in host digest `sha256:a33a2ff46b2f78714f3f4c57d7058cc4a20288e33634ed380aaae5de7493452f`;
  health and the single-user live matrix pass. Full evidence:
  `docs/execution/evidence/OC3-capability-repair.md`.
- REJECT was not separately exercised live because it shares the APPROVE transition path. Assigned-
  approver and cross-user cancellation enforcement require a second real user. These are explicit
  OC7 permission-matrix cases, not claimed as tested by OC3.

## OC5-OCR source evidence

- Added typed extraction paths and a deterministic per-page routing function. Contract tests are
  15/15 with 100% measured coverage after the OCR addition.
- Read-only inventory of all 14 staged PDFs found 65 pages, including 48 pages without an
  extractable text layer. Mixed PDFs route only missing/insufficient pages to OCR; the four XLSX
  sources stay structured and bypass OCR.
- The approved local benchmark exercised one customer invoice, one vendor invoice, and one delivery
  note with separate English/Arabic PP-OCRv5 proposals. It recovered 24/25 normalized exact
  critical fields; the miss was an `O/0` corruption in a purchase-order reference.
- Dual-pass CPU recognition averaged 157.718 seconds per page. The richer PP-StructureV3 candidate
  required a 946.422-second download-dominated cold start, 229.087-second first prediction, about
  1.0 GB of model cache, and exited with status 133 after producing its artifact.
- Evidence and the provider acceptance gate are recorded in
  `docs/execution/evidence/OC5-OCR-readiness.md`. The result is a **technical smoke pass only**. No
  provider is accepted or enabled; OC5-OCR-B2 requires a labeled representative corpus,
  field/Arabic/line-item thresholds, target-resource measurements, region fidelity, and an explicit
  acceptance decision.

## OC1/OC2 source evidence

- Added explicit Approval Request and Operational Insight objects. Approval records carry status,
  requested action, immutable payload digest, source IDs, requester/approver, decision timestamps,
  decision note, and a unique idempotency key. Insight records carry type, lifecycle, narrative,
  source IDs, generator version/time, and confidence.
- Added separate request, decide, insight-generation, and email-review capabilities. Operator may
  request/review; Finance may request/decide; Admin receives all capabilities; Viewer receives none.
- Operator and Finance can read approval/insight records but cannot update them directly. OC3
  commands will own state changes.
- Frozen operational precedence: compliance exception → approval required → blocked data → current
  operator action. Decided approvals are excluded; equal priorities sort deterministically.
- Verification: contract 9/9 with 100% measured coverage; app 38/38; lint clean; official Twenty
  build passes (17 files).

## Approval phrase

`I approve ADR-0003 and OC0: deterministic tasks/compliance, audited human approvals, read-only
evidence agents, and review-before-create synchronized email intake. Agents may not approve,
send/delete email, finalize financial documents, or change compliance state.`

## DeepSeek coordination status — 2026-08-25

Assigned as Command Centre coordinator. Mandate and lane protocol:
`docs/execution/2026-08-25 - command-centre coordinator brief.md`. Real-data gap matrix:
`docs/execution/evidence/CC-coordination-real-data-gap-matrix.md` (read-only probes, 2026-08-25).

- **Clean-base check:** branch `codex/pashx-pilot-cx3-cx4`, HEAD `b15b33c4d6`; worktree clean
  except the incidental app version bump (uncommitted) and the local `.env.test.cl2-backup`.
- **Live inventory (verified):** 3 cases (stage null — MI never infers), 8 documents, 25
  companies (7 suppliers + 3 customers with roles), 2 decided approvals (0 pending), 0 insights,
  0 expenses. Deleted OC3 fixture case `787c8781-…` must never reappear.
- **Live surface:** Command centre page `/page/cfb3c81e-3acd-47a3-83e9-6f35b358c386` runs the
  updated app; the Vendors page and supplier-RFQ command are source/sync-verified only and await
  the release gate.
- **Next nodes:** Codex lane = honest blocked-data recompute + stage-null rendering decision
  (data owner: Shahil); Claude lane = live QA after the next release-gated install.

### 2026-08-25 recompute — honest four-signal prediction

`scripts/recompute-command-centre-from-live.ts` ran the UI's own classifier + queue builder
against the live dump: **Compliance 0 · Approvals 0 · Blocked 3 · Actions 0**, ledger = the three
real imported cases (CASE_CUSTOMER_MISSING on `3af759e7`, CASE_OWNER_MISSING on `780c98af` and
`47e1d3ee`). DS6-era "Blocked data 10" is stale and must not be quoted. Full derivation:
`docs/execution/evidence/CC-coordination-real-data-gap-matrix.md` §6. Case workflow
surfaces verified the same way (§7): stage-null rails on all three real cases, real quote total
SAR 127,544.20, delivery NOT_STARTED everywhere, readiness gates derived from finalized
evidence only (ASHM shows 2 finalized invoices but no finalized CPO → not ready). Vendors page
verified (§8): exactly 7 role suppliers, DBMS Steel 1 open RFQ + 1 quote, RFQ-eligible cases 0
(all imported cases stage-null) — the RFQ flow renders its honest unavailable state until
stages are assigned or a properly-staged case is created.

### Coordinator status roll-up (2026-08-25, rounds 6–8 — full detail in the gap matrix)

- §9 profitability: SAR 153,651.50 revenue / 127,544.20 cost / 26,107.30 profit / 16.99% margin,
  4 DRAFT exclusions (verified with the frozen aggregate).
- §10 release-gate QA expectations frozen for the Claude lane (six deterministic checks).
- §11 stage candidates proposed for Shahil: MAB-PO → vendor-order, SEN-EPO → invoicing,
  ASHM → invoicing (contradiction: finalized invoices while CPO DRAFT).
- §12 vendor comparison verified: `no-finalized-quotes` on every case; live page wiring
  confirmed (`/page/cfb3c81e-…` → Command centre layout + queue tab).
- Round 6: live-state freshness re-check — predictions identical, WF5 residue absent.
- Round 7: lane worktrees reconciled to the established convention; in-flight
  `buildCommandCentreOverview` reviewed PASS.
- Round 8: executed the lane's uncommitted overview builder against the live dump — stage
  summary `unrecordedCount: 3`, work queue 3× BLOCKED_DATA, quotation states
  `AWAITING_FINALIZED_RESPONSES` with the real draft counts, cash `UNAVAILABLE` (capability-
  gated), 38 native links exact. Lane worktree left pristine.

### 2026-08-25 round-9 lane delta review

Logic deltas reviewed (compliance helper semantics preserved; overview loader wiring correct —
placeholders in the old loader are inert). Lane app suite 125 pass / 4 fail: the 4 failures are
stale assertions in the old command-centre UI tests, expected mid-flight; lane updates them
before landing. Full detail: gap matrix §14.

### 2026-08-25 round-10 release-readiness check

Overview loader field selection verified against the live GraphQL schema: every field
resolves (delivery/cash/terms/validity), real values confirmed — no schema-side unknown when
the lane's overview UI lands. Detail: gap matrix §15.

### 2026-08-25 release gate opened — verification result

Gate opened by Shahil. Live verification (evidence:
`docs/execution/evidence/CC-release-gate-0-2-15.md`): app **0.2.15 already deployed**
(registry refuses duplicates; shasum `b8d5fda1bf…`, 35 files); full shared-branch surface
live (incl. Vendors); WF2 endpoints live (transitions/delivery/finalize probed with
validation-only requests). **Release gap: `supplier-rfqs` endpoint is not on the live host
server** — app releases do not ship server code; a Claude-lane host redeploy is required
before the Vendors RFQ flow works live. Data unchanged; §10 predictions still hold.

### 2026-08-25 stage decision applied

Shahil approved the §11 candidates; applied and verified via the standard record API:
MAB-PO → vendor-order, SEN-EPO → invoicing, ASHM → invoicing (contradiction documented).
Case-workflow rails now show real current markers; band stays 0/0/3/0; RFQ eligibility
remains 0. Detail: gap matrix §16.

### 2026-08-25 round-12 stage visibility + QA expectation update

Applied stages confirmed through the live GraphQL UI path (MAB-PO vendor-order, SEN-EPO and
ASHM invoicing). §10 QA expectation item 2 updated from stage-null to the applied markers.
Supplier-RFQ host redeploy still pending (Claude lane). Detail: gap matrix §17.

### 2026-08-25 round-13 lane status signal

The Codex lane's app suite now passes **133/133** in its worktree (the four stale UI-test
failures from round 9 are resolved; the lane updated its tests with the UI rework). The lane
has its own working dependency install; 15 uncommitted files remain (overview UI in flight).
Supplier-RFQ host redeploy still pending (Claude lane). No new lane commits landed.

### 2026-08-25 round-14 capability fail-closed verification

Validation-only command probes on the staged live case `3af759e7` (vendor-order) using the
pilot API key return `PASHX_FORBIDDEN_CAPABILITY` for both `transitions` and `delivery` — the
capability gate fails closed live for non-operator principals, exactly as designed; no data was
written. Stage-enforcement logic itself remains verified by the local integration suites
(11–15, green); operator-session stage probes are part of the §10 QA (Claude lane).

### 2026-08-25 round-15 freshness re-check

State unchanged: no new commits; lane 15 files in flight; supplier-RFQ host redeploy pending;
live data 3/8/2 (no mutations). Fresh battery on current dumps: band 0/0/3/0 — predictions
hold. No new coordinator action required.

### 2026-08-25 round-16 overview source verification-ready

Coordinator ran the lane's full battery in `twenty-cc-live-codex`: app tests **133/133**,
lint **0/0** (94 files), official `dev:build` **26 files** (manifest + typecheck pass). The
overview UI source is verification-ready — the lane can commit/merge/release (0.2.16) on its
own schedule. Remaining lane threads: overview release → §10 browser/operator QA (Claude),
host redeploy for the supplier-RFQ endpoint (Claude, recipe in the release-gate evidence).

### 2026-08-25 round-17 overview UI landed + verified

The Codex lane landed **`6d01d8826d` "make command centre evidence-led"** on
`deepseek/cc-live-codex` (15 files, +2712/−613: overview builder + loader, reworked
bilingual UI, new overview tests); worktree clean. Coordinator re-verified the landed source
in the lane worktree: app tests **133/133**, lint **0/0**, official build **26 files**.
Next steps: merge the lane branch into `codex/pashx-pilot-cx3-cx4`, bump to 0.2.16, publish/
install, then §10 browser/operator QA (Claude lane). Host redeploy for the supplier-RFQ
endpoint remains pending (Claude lane, recipe in the release-gate evidence).

### 2026-08-25 round-18 overview merged into mainline

Coordinator merged `deepseek/cc-live-codex` into `codex/pashx-pilot-cx3-cx4`
(`7b4c88fd1a` merge(pashx): integrate evidence-led command centre overview into mainline).
Merge-tree preview was conflict-free; the merge delta is exactly the overview commit
(+2712/−613), version stays 0.2.15. Post-merge battery on the shared branch: app tests
**134/134**, lint **0/0**, official build **26 files**, contract **100% coverage**. Next:
bump to 0.2.16 → publish/install → §10 browser/operator QA (Claude lane); supplier-RFQ host
redeploy remains pending (Claude lane).

### 2026-08-25 round-19 release 0.2.16 installed

Bumped to 0.2.16 and published (`0e36b1fce3…` shasum); install confirmed the workspace runs
0.2.16 (parallel lane's release flow landed it concurrently). Live verified: healthz 200, all
pages present, data intact (3/8/2). Full evidence:
`docs/execution/evidence/CC-release-0-2-16.md`. Remaining (Claude lane): host redeploy for the
supplier-RFQ endpoint, §10 browser/operator QA; rollback target 0.2.15.
