# OC5 — read-only email-intake source landed

- Date: 2026-08-27
- Coordinator: DeepSeek harness (local execution)
- State: **source landed and verified on `codex/mab-workflow-pipeline`; live acceptance pending**
- Scope: source-only landing. No live mailbox write, no email send/delete, no pilot mutation.

## Gate update

The OC5 gate previously read "blocked — native mailbox connected required". The mailbox is now
connected (operator confirmation 2026-08-27), and OC5 source already existed on
`codex/pashx-pilot-cx3-cx4` (authored 2026-08-26). This change lands that source on the mainline
pipeline branch and verifies it.

## Landing

Cherry-picked onto `codex/mab-workflow-pipeline` (no conflicts), preserving original authorship:

| Commit | Change | Files |
|---|---|---|
| `c003d77c2f` | OC5 read-only email-intake candidate classifier | `packages/pashx-mab-contract/src/email-intake.ts`, `src/index.ts`, `test/email-intake.test.mjs` |
| `064ece8148` | OC5 read-only email-intake candidate loader | `packages/twenty-apps/pashx-mab/src/email-intake/load-email-intake.ts`, `test/email-intake-loader.test.ts` |

## Contract verification (OC5 review-only semantics)

- Deterministic keyword classifier over subject + body only: `PREPARE_QUOTATION`,
  `CAPTURE_PURCHASE_ORDER`, `CAPTURE_DELIVERY_NOTE`, `CAPTURE_INVOICE`; no match -> `null` proposal.
- Every candidate is born `PENDING_REVIEW`; nothing is auto-created or auto-accepted.
- Email body is untrusted input: literal keyword matching only, never executed or summarized; the
  body is never persisted on a candidate.
- Loader surfaces review-only candidates from synchronized inbound messages, excludes drafts and
  unrelated mail, tolerates missing sender, marks `isPartial` for multi-page message connections,
  and rejects unbounded query limits at the boundary.

## Test results (real, 2026-08-27)

- `packages/pashx-mab-contract` suite: **pass, coverage 100% lines / 100% branches / 100%
  functions** across all contract modules including `email-intake.js`.
- `packages/twenty-apps/pashx-mab` loader suite: **6/6 pass, exit 0**
  (`node --import tsx --test test/email-intake-loader.test.ts`).

## Remaining before OC5 acceptance

1. Live verification of the loader against the connected synchronized mailbox (read-only checks,
   disposable fixtures deleted by captured ID, rollback target recorded) — DS5/DS6 conventions.
2. Review-before-create UI/command wiring to task/approval creation (human approval required;
   OC5 candidates must never create records directly).
3. OC6-B Command Centre email panel can now proceed on this source.

## Privacy

Evidence uses message identifiers and generic descriptions only; no mailbox addresses, message
bodies, or credentials are recorded here. No secrets were committed.
