# CC3 — native Twenty Command Centre interface

- Date: 2026-08-21
- Owner: Codex
- Outcome: **complete in source**
- Runtime boundary: no publish, install, migration, deployment, infrastructure, or live-data action.

## Delivered

- Standalone native Twenty page layout and position-zero navigation entry named **Command centre**.
- Read-only three-signal queue ordered by the approved precedence: compliance exception, blocked
  data, then the signed-in user's actions.
- Direct `_top` links to the authoritative Procurement Case, Commercial Document, or Expense
  record. The interface exposes no workflow mutation or optimistic state transition.
- Summary counts, grouped evidence rows, server observation time, and bounded partial-result notice.
- Loading, empty, initial error, stale-refresh error, partial, and success presentations.
- Stale request protection prevents an earlier response from replacing a later refresh.

## Verification

- `yarn workspace pashx-mab-contract test`: 9/9 pass; 100% measured contract coverage.
- `yarn workspace pashx-mab test`: 31/31 pass.
- contract and app lint: zero errors and zero warnings.
- `yarn workspace pashx-mab twenty dev:build .`: manifest, application files, and typecheck pass;
  17 files built.

## Freeze disposition

The implementation remains source-only. The live pilot stays pinned to app `0.2.5` and host digest
`sha256:c48dd052dcf79ca6fa18cee90d47d66b10a16ab813688106650ee06b1e66156d`.

## 2026-08-21 visual-contract correction

The initial CC3 source passed its functional contract but failed Shahil's approved-mockup visual
comparison after app `0.2.6` was installed. The corrected source now uses the same structural
language as the retained PxD references:

- a restrained header with MAB orientation, page purpose, observation time, and record coverage;
- one ruled three-signal summary band rather than three floating dashboard cards;
- one semantic priority ledger ordered by compliance exception, blocked data, then current-user
  action, with native evidence links and no mutation controls;
- one narrow queue-context panel that explains the bounded read and repeats only authoritative CC2
  counts;
- IBM Plex typography, calm canvas, white ruled surfaces, minimal 6px radii, no shadows, and
  semantic red/amber/green reserved for status;
- a one-column mobile composition whose ledger rows expose explicit labels without losing meaning.

This correction does not add Approvals, Quotations, AI insights, OCR, Inbox, stage transitions, or
fake navigation. Those remain outside CC1-CC5.

Verification after correction:

- `yarn workspace pashx-mab test`: 31/31 pass;
- `yarn workspace pashx-mab lint`: zero warnings and zero errors;
- `yarn workspace pashx-mab twenty dev:build .`: manifest, application files, and CLI typecheck
  pass; 17 files built;
- focused diff whitespace check: pass.

The raw workspace `tsc` command still reports the already-recorded monorepo SDK declaration and
pre-existing source-target errors; the official Twenty CLI build resolves the generated SDK
boundary and passes. Live visual parity is not claimed until a new immutable app version is
published and inspected.
