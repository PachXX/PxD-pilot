# WP2 — MAB pipeline controlled movement

- Date: 2026-08-25
- Owner: Codex
- State: **complete in source; release and live QA pending**
- Branch: `codex/mab-pipeline-move`
- Base: `761ce143ea` (approved MAB deals-pipeline vocabulary on the current app source)

## Root cause

The MAB deals pipeline was deliberately implemented as a read-only evidence board. Its component
had no drag handlers or transition control, and the page copy explicitly told operators that cards
could not be moved. The audited server transition command already existed, but the board did not
call it. This was therefore an application-boundary omission, not a browser or database failure.

## Repair

The board now supports two equivalent movement paths:

- drag a case card into its **immediate next** MAB stage; or
- activate the card's native, keyboard-accessible **Move to …** button.

Both paths call the existing transactional endpoint:

`POST /rest/pashx-mab/procurement-cases/:procurementCaseRecordId/transitions`

The client submits the case id, current and target stages, current `aggregateVersion`, contract
version, and a stable idempotency key. The server remains authoritative for role permission,
allowed transition order, required finalized evidence, human approvals, compare-and-swap version,
receipt and audit-event creation. No direct object update was added, and skipped or backward moves
remain unavailable.

The command dispatch occurs before the Remote DOM state update to preserve the previously accepted
host-fetch repair. A bounded 30-second result boundary is used. An unconfirmed result retains the
same idempotency key for a safe retry; success updates the displayed stage/version, while typed
server failures are shown in English or Arabic. One in-flight transition is allowed at a time.

## Accessibility and presentation

- Every draggable card has a native button alternative; drag is not required.
- Buttons retain the 44 px target and visible focus treatment.
- Move progress and success/error results use `aria-busy`, status, and alert semantics.
- Existing English/Arabic, RTL, dark-theme, reduced-motion, and exact-200%-reflow foundations are
  preserved.

## Verification

- `yarn workspace pashx-mab test` — **124/124 pass**.
- `yarn workspace pashx-mab-contract test` — **28/28 pass**, 100% line/branch/function coverage.
- `yarn workspace pashx-mab lint` — **0 warnings, 0 errors**.
- `yarn workspace pashx-mab typecheck` — pass.
- `yarn workspace pashx-mab twenty dev:build .` — **build succeeded (26 files)**.
- `git diff --check` — pass.

The isolated worktree reused only gitignored dependency/build outputs from the primary checkout;
no credentials, environment files, live records, package version, or deployment state changed.

## Release boundary

No publish, install, infrastructure change, or pilot-data mutation is included. The next release
owner must integrate this commit onto the clean `03d391db609afc805b5fc1756d344df1acc1e40c` line (or
its reviewed successor), bump the app exactly once, retain the installed rollback version, then
run live QA with a disposable case covering:

1. immediate-next-stage success and stored `aggregateVersion` increment;
2. identical safe replay with one audit event;
3. evidence/approval denial without a partial write;
4. stale-version conflict;
5. mouse drag, physical Tab/button, English/Arabic/RTL, and exact native 200% zoom.
