# OC6-B — Command Centre synchronized-email panel (source)

- Date: 2026-08-28
- Coordinator: Codex release pass
- State: **app 0.2.18 published, auto-installed, and live-health verified**
- Scope: OC6-B email panel only. The OCR panel remains an honest unavailable state until OC5-OCR
  passes. Source-only; no publish, no live mailbox writes, no email send/delete.

## What changed

The Command Centre's synchronized-email "unavailable" row is replaced by a real, review-only
candidate panel built on the landed OC5 source (`loadEmailIntake` + classifier). The capability
status panel now lists only OCR as unavailable.

The original panel landed in `52fcceb76b`; the bounded release branch integrates it and the
OC5 loader on top of the current pilot head. Release hardening commit `0117391e70` adds:

- dedicated `pashx.email.intake.review` capability enforcement before mailbox data is loaded;
- approved-mailbox scope (`info@mabindus.com`) and verified `INCOMING` association filtering;
- deterministic newest-first ordering with a stable ID tie-break;
- an independent visible refresh-error state that does not silently present stale candidates;
- a reduced default read of 50 messages while preserving the explicit bounded/partial state.

Panel files:

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

## Verification and release (real, 2026-08-28)

- `packages/twenty-apps/pashx-mab` suite: **175/175 pass**.
- `yarn lint` (pashx-mab): **0 errors, 0 warnings**.
- Typecheck: **pass**.
- Official `twenty dev:build .`: **pass**, 28 application files.
- Pre-landing review caught and fixed outgoing/unrelated-mail scope and missing capability checks
  before release; read-only and prompt-injection boundaries otherwise passed.
- Published privately to `pashx-pilot`: `pashx-mab@0.2.18`, tarball SHA-1
  `e556e1f1b64f5a0f6d155460906447bfc0d89aac`.
- The server registry auto-installed application UUID
  `058263f0-1cc0-42e7-94a1-b4beb688e771`; the explicit install command correctly reported that
  0.2.18 was already installed.
- Cloud SQL verification: application version `0.2.18`, updated
  `2026-08-28 06:27:43.429107+00`.
- External `https://mab.pashx.com/healthz`: **200**; internal container health: **200**.
- Rollback target: `0.2.17`.

## Remaining gates

1. Physical Tab/VoiceOver and exact native 200% zoom remain manual OC7 observations.
2. OCR remains disabled until OC5-OCR-B2 provider acceptance; it is not part of this shipped
   email-only panel.
3. OC6-C integrated acceptance and OC7 remain separate gates.
