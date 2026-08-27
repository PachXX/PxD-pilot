# ADR-0003: Command Centre operational control plane

**Status:** Accepted 2026-08-21
**Date:** 2026-08-21
**Deciders:** Shahil, Codex; Claude reviews deployment/security consequences

## Context

The current PxD Command Centre is a bounded read-only three-signal queue. MAB now needs it to also
surface evidence-linked insights, new approval requests, compliance work, next tasks, task-specific
agents, and synchronized email intake. These capabilities cross authorization, privacy, audit, and
workflow-state boundaries. Treating generated text or email content as workflow truth would make
the demo visually richer but operationally unsafe.

## Decision

Build one native Twenty operational control plane with five distinct record types/boundaries:

1. **Signals and next tasks** remain deterministic projections from authoritative MAB records.
2. **Insights** are evidence-linked observations. Each stores rule/agent version, source record IDs,
   generated time, confidence category, and lifecycle; an insight never mutates its evidence.
3. **Approval requests** are explicit records with requested action, payload digest, requester,
   assigned approver, state, decision actor/time, and audit link. Approving executes a separately
   permission-checked domain command; it is not a direct browser field update.
4. **Compliance work** is derived from existing authoritative compliance status plus explicit
   exception records. Generated explanations may summarize evidence but cannot set compliance
   state.
5. **Task agents** are app-defined Twenty agents with least-privilege roles. Initial agents may
   read permitted records, classify email, summarize evidence, and draft proposed tasks/approvals.
   They cannot approve, send email, delete email, finalize financial documents, or change
   compliance state.

Email intake reads only messages already synchronized into the authenticated Twenty workspace.
PxD never collects mailbox passwords or bypasses Twenty message permissions. Raw message bodies
are not copied into analytics or prompts beyond the bounded task execution; stored outputs contain
source message IDs and minimal excerpts needed for review.

Document intake uses text-layer extraction first and benchmark-approved OCR only when required.
OCR runs asynchronously outside financial transactions and stores the source file ID, engine and
model version, page/region provenance, extracted-field confidence, and review state. OCR output is
an untrusted proposal: a human must review it before PxD creates a task, approval request, or
financial record, and the original document remains the evidence of record.

## Options considered

### Option A: Native evidence-backed control plane

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | Uses deployed Twenty app/agent infrastructure |
| Auditability | High |
| MAB workflow fit | High |

**Pros:** One permission model, native records, direct evidence links, reversible automation.
**Cons:** Requires explicit objects, commands, and acceptance gates before the full visual scope.

### Option B: Frontend-only AI dashboard

| Dimension | Assessment |
|---|---|
| Complexity | Low initially |
| Cost | Low initially, high remediation risk |
| Auditability | Low |
| MAB workflow fit | Poor |

**Pros:** Fast visual demo.
**Cons:** Generated claims are not durable evidence; approvals and email actions cannot be made
safe or idempotent in the browser.

### Option C: Separate external automation service

| Dimension | Assessment |
|---|---|
| Complexity | High |
| Cost | New service, secrets, operations, and monitoring |
| Auditability | Medium unless duplicated back into Twenty |
| MAB workflow fit | Medium |

**Pros:** Flexible integrations and independent scaling.
**Cons:** Splits authorization and evidence across systems before the pilot proves the need.

## Trade-off analysis

Option A adds more contract work than a mock dashboard, but it preserves the pilot's core promise:
every number, task, approval, and insight can be traced to a source record and every state-changing
action has an accountable human or domain command. The Twenty platform already supplies agents,
skills, roles, synchronized messages, and workspace-scoped records, so a second service is not yet
justified.

## Consequences

- The Command Centre may show generated explanations, but always beside source links and generated
  metadata.
- Human approval remains required for consequential writes.
- Email connection/setup remains a native Twenty admin/operator workflow.
- Agent failures degrade to deterministic queues; they never block access to source records.
- Every agent and rule version must be testable against fixed fixtures before pilot enablement.
- Outbound email and autonomous financial/compliance mutation remain separate future approvals.

## Action items

1. [x] Approve ADR-0003 boundaries and capability order.
2. [x] Freeze OC1 typed contracts for insight, approval, task, compliance exception, and email
       intake candidates.
3. [x] Build OC2 deterministic next-task/compliance projections and source tests.
4. [x] Build OC3 approval request object and permission-checked decision commands.
5. [x] Build OC4 read-only evidence insight agent and task-specific agent role.
6. [x] Build OC5 synchronized-email candidate classifier with review-before-create.
       Source landed 2026-08-27 on `codex/mab-workflow-pipeline` (cherry-picked from
       `codex/pashx-pilot-cx3-cx4`); classifier contract coverage 100/100/100 and loader 6/6 pass;
       live acceptance pending.
7. [ ] Build OC5-OCR text-first/OCR-fallback extraction with provenance, confidence, and
       review-before-create. Contract and local smoke benchmark are complete; provider acceptance
       remains blocked on the labeled OC5-OCR-B2 gate.
8. [ ] Integrate OC6 native Command Centre panels matching the approved PxD mockup language.
       OC6-A core approvals/insights source passed on 2026-08-24; email/OCR integration and live
       acceptance remain open.
9. [ ] Run OC7 bilingual, accessibility, privacy, agent-evaluation, idempotency, and live QA gates.
