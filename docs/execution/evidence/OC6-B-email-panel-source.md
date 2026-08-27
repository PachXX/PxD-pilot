# OC6-B — Command Centre synchronized-email panel (source)

- Date: 2026-08-27
- Coordinator: DeepSeek harness (local execution)
- State: **source landed and verified on `codex/mab-workflow-pipeline`; live acceptance pending**
- Scope: OC6-B email panel only. The OCR panel remains an honest unavailable state until OC5-OCR
  passes. Source-only; no publish, no live mailbox writes, no email send/delete.

## What changed

The Command Centre's synchronized-email "unavailable" row is replaced by a real, review-only
candidate panel built on the landed OC5 source (`loadEmailIntake` + classifier). The capability
status panel now lists only OCR as unavailable.

Commit `52fcceb76b` on `codex/mab-workflow-pipeline`:

- `src/command-centre/command-centre.model.ts` — `getEmailMessageHref` (native message drill-through)
  and `resolveEmailTaskTypeLabel` (frozen task vocabulary with honest fallback).
- `src/front-components/command-centre.copy.ts` — EN/AR panel copy: title, description, loading,
  error, partial, empty, review status, task-type labels for the four frozen task types, sender,
  received, open-message link.
- `src/front-components/command-centre.front-component.tsx` — `EmailCandidateCard` (sender, subject,
  proposed task type, received time, pending-review badge, message-record link) and independent
  panel state: queue failure and mailbox failure never mask each other.
- `src/front-components/command-centre.styles.ts` — email list/item/meta/tag styles following the
  panel foundations (44px targets, focus-visible outline, RTL, zoom-safe).
- `test/command-centre-ui.test.ts` — updated honesty assertions plus new email-panel tests.

## Contract preserved

- Review-only: every candidate renders `PENDING_REVIEW`; no approve, reject, accept, dismiss or
  create control exists anywhere in the panel; the body is never rendered or persisted.
- The only drill-through is the native synchronized message record.
- OCR remains `Unavailable` with the OC5-OCR reason; nothing is simulated.

## Verification (real, 2026-08-27)

- `packages/twenty-apps/pashx-mab` suite: **120/120 pass** (includes command-centre UI, model,
  email-intake loader and all workflow suites).
- Focused re-run: command-centre + email-intake suites **32/32 pass**.
- `yarn lint` (pashx-mab): **0 errors, 0 warnings**.
- Typecheck: no new errors from this change; the repo-wide `twenty-sdk` declaration gap
  (pre-existing, affects every front-component) and two pre-existing errors in
  `create-vendor-purchase-order.front-component.tsx` remain. `nx build twenty-sdk` timed out in
  this worktree and needs a separate infra pass.

## Remaining before OC6-B acceptance

1. Live browser verification of the email panel against the connected synchronized mailbox
   (DS5/DS6 conventions; disposable fixtures deleted by captured ID; rollback target recorded).
2. OC6-B OCR panel after OC5-OCR provider acceptance; OC6-C integrated/live acceptance; then OC7.
