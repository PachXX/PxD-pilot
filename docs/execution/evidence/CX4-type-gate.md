# CX4 — Twenty Server Type Gate Evidence

- Owner: Codex
- Node: CX4
- Parent node: CX4
- State: CX4-a, CX4-b, and CX4-d complete; CX4-c CI expectation repaired and rerun pending; parent CX4 review
- Updated: 2026-08-11 16:48 CEST
- Infrastructure consumer: Claude Code CL2/CL3

## Outcome

Twenty Server now has a standalone production-source TypeScript gate. It is a
separate Nx target and CI step, so it cannot be skipped by Nx affected-project
selection or hidden by the normal SWC build's `typeCheck: false` behavior.

The gate generates declaration artifacts for the workspace packages consumed
by the server, then runs `tsc --noEmit` against `tsconfig.typecheck.json` with an
8 GB heap ceiling. The config includes server ambient declarations and excludes
source-adjacent unit tests; those remain owned by Jest rather than contaminating
the production compile boundary.

## Defects found and repaired

| Finding | Repair |
|---|---|
| `PashxMabException` was referenced without an import in Vendor PO creation | Added the missing value import; this is the same class of SWC-only runtime failure that motivated CX4. |
| Dynamic workspace records made aggregate-version writes unsafely typed | Kept the repository boundary dynamic, validated loaded versions at runtime, and returned a minimal typed command record. Missing/non-numeric versions fail as internal corruption. |
| `String.prototype.replaceAll` exceeded Twenty Server's ES2018 target | Replaced both uses with ES2018-compatible global regular-expression replacements. |
| Modern package subpath declarations were invisible to classic Node module resolution | Added narrow typed ambient declarations for `@file-type/pdf` and Lingui's `compileMessage` subpath; no untyped wildcard shim was introduced. |
| `semver` and `lodash.kebabcase` were runtime dependencies without direct server type dependencies | Added their official `@types` packages to Twenty Server dev dependencies. |
| The `psl` union guard accessed `error` before narrowing | Rewrote the guard with the `in` operator so the union is narrowed safely. |
| New PashX workspaces selected obsolete `oxlint 0.16`, breaking Twenty's `--type-aware` lint command | Aligned both new workspace packages to Twenty's `oxlint ^1.51.0`; final lint rerun is pending dependency resolution. |

## CI contract

- Nx target: `twenty-server:typecheck:ci`
- CI workflow: `.github/workflows/ci-server.yaml`
- Compiler config: `packages/twenty-server/tsconfig.typecheck.json`
- Runner: `packages/twenty-server/scripts/typecheck-ci.sh`
- CI executes the target explicitly after lint/Lingui extraction.
- The legacy affected `typecheck` task was removed from that combined step so
  one authoritative compiler gate runs once.

## Verification ledger

| Check | Result | Evidence |
|---|---|---|
| Production `tsc --noEmit` | passed | Empty diagnostic log with `NODE_OPTIONS=--max-old-space-size=8192`. |
| `npx nx run twenty-server:typecheck:ci` | passed | Dependency declarations generated; final server compiler exited zero. |
| `git diff --check` | passed | No whitespace errors. |
| Twenty Server lint and format | passed | 7,118 files: 0 warnings/errors; 6,821 files formatting-clean. |
| Contract tests and coverage | passed | 9/9 with 100% line, branch, and function coverage. |
| Contract and app lint | passed | Contract: 9 files; app: 24 files; 0 warnings/errors. |
| PashX app typecheck | passed | `corepack yarn workspace pashx-mab typecheck` exited zero. |
| Unexpected-error logging unit test | passed | 2/2; Error message/stack retained and arbitrary thrown payload objects not serialized. |
| Isolated PashX Nest module smoke | passed | 2/2; required imports asserted and guarded controller resolved without Redis/database connections. |
| Full-app throwaway-Postgres boot smoke | boot passed; assertion repaired, CI rerun pending | The first GitHub execution booted PostgreSQL, Redis, Twenty, and `PashxMabModule`, then returned the framework-correct 403 from `JwtAuthGuard`. The smoke incorrectly expected 401; it now requires 403 and will rerun on the follow-up commit. |
| Real Cloud SQL invariants | not run here | Owned by Claude CL2; do not duplicate from the Codex lane. |
| Tarball publish interruption regression | passed | 1/1 focused Jest test; a failed first file-store attempt leaves `latestAvailableVersion` null and does not call manifest finalization. |
| Docker entrypoint syntax | passed | `sh -n packages/twenty-docker/twenty/entrypoint.sh`. Bootstrap now checks `to_regclass('core.workspace')`, so an empty `core` schema triggers initialization. |
| CX4-d focused lint and format | passed | 2 TypeScript files; 0 warnings/errors and formatting clean. |
| CX4-d production type gate | passed | `npx nx run twenty-server:typecheck:ci`. |

## CX4-b — diagnostic unexpected-error logging

Unexpected `Error` values now log correlation ID, error type, message, and stack.
The request body is not passed to the logging helper. Non-`Error` thrown values
are deliberately not stringified because they may themselves be request or token
objects. Typed `PashxMabException` responses and payloads are unchanged.

## CX4-c — boot smoke

The fast smoke asserts the real `PashxMabModule` dependency metadata, replaces
external infrastructure modules explicitly, and compiles the guarded controller.
The full CI smoke uses the existing throwaway PostgreSQL and Redis services,
boots Twenty Server, and then requires the unauthenticated PashX route to return
403. Nest maps a guard returning `false` to Forbidden; a missing module,
controller, or guard fails that check.

## CX4-d — interrupted-bootstrap and publish recovery

Database initialization now probes the canonical `core.workspace` table rather
than the `core` schema. An interrupted first boot that created only the schema
therefore runs `database:init:prod` on the next start instead of entering a
permanent partial state.

New tarball registrations persist with no available version until the tarball
is durably stored. Manifest finalization then records the file and version
together at the existing service boundary. If storage fails, re-publishing the
same version remains valid; the failed attempt no longer poisons version
progression.

CX4 remains in review only until the corrected full-app CI smoke passes. CX2 is
still blocked by Claude's CL2 and CL3 cloud evidence.
