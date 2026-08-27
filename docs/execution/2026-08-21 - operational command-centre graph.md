# Operational Command Centre graph — insights, approvals, compliance, tasks, agents, email

- Date: 2026-08-21
- Status: **OC0–OC4 deployed and accepted; OC6-A app 0.2.10 live and fixture-dependent DS6 matrix complete; OC5 source landed and tests pass (mailbox connected, classifier + loader cherry-picked to `codex/mab-workflow-pipeline` 2026-08-27, live acceptance pending); OC5-OCR, OC6-B/C and OC7 blocked**
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
| **OC5** | Codex + Claude | OC1 + native mailbox connected | Read-only synchronized-email candidates; review-before-task/approval creation. | **mailbox connected; source landed 2026-08-27: classifier + read-only candidate loader cherry-picked from `codex/pashx-pilot-cx3-cx4` onto `codex/mab-workflow-pipeline`; contract coverage 100/100/100 and loader 6/6 pass; live acceptance pending** |
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
