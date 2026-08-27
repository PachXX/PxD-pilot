# CX3 — Boundary-Crossing Adoption Review

- Owner: Codex
- Node: CX3
- State: complete
- Date: 2026-08-11
- Input: Claude Code deploy findings 22, 23, 24, 27, 29, and 33

## Verdict

**Approve and adopt all six implemented boundary crossings for the MAB pilot.**

No P0/P1/P2 defect remains in the reviewed pilot path. The mapping boundary has
one explicit future constraint: add reverse translation before any contract read
path, and provision matching manifest options before enabling document types or
lifecycle states beyond Vendor PO/Draft.

## Adoption decisions

| # | Crossing | Decision | Evidence and rationale |
|---|---|---|---|
| 1 | Docker workspace/runtime wiring for `pashx-mab-contract` | Adopt | The manifest is copied before `yarn workspaces focus`, source is present for dependency build, production focus retains it, and package/dist are copied to runtime. The deployed image booted and executed the command successfully. |
| 2 | Contract package `require` export | Adopt | Node 24 resolves the built package through `require('pashx-mab-contract')`; the exported request validator was verified as a function. This matches the CommonJS Twenty Server consumer and the deployed runtime. |
| 3 | `TokenModule` plus `WorkspaceCacheStorageModule` imports | Adopt | Both are required by `JwtAuthGuard`; the fast CX4 smoke asserts the complete PashX import set and resolves the guarded controller. The live server also booted with these imports. |
| 4 | Contract-to-manifest value translation | Adopt for pilot | Keeping camelCase contract vocabulary and translating at the persistence boundary correctly isolates Twenty's uppercase/reserved-name rules. The maps are exhaustive over contract types. Live storage proved `VENDOR_PURCHASE_ORDER`, `DRAFT`, and `currencyCode=SAR`. Reverse mapping is deliberately deferred because no read adapter exists. |
| 5 | `createdBy` and `updatedBy` ACTOR composites | Adopt | Raw repository insertion bypasses Twenty's record pipeline, so both non-null actor composites must be supplied. `source=API` correctly records REST-command provenance. Live storage proved both actors with the operator identity. |
| 6 | `isNonEmptyString` from `@sniptt/guards` | Adopt | This is the server's actual runtime export. The corrected import passed the standalone type gate, the built-artifact check, and the live write path; the former barrel binding was undefined. |

## Review dimensions

### Security

- Workspace identity and actor identity come from request-scoped authentication
  context, never command payload fields.
- Repository access remains role-scoped through `unionOf: [roleId]`.
- Actor provenance is API, not MANUAL, and no credential is stored in actor
  context.
- No new public route or infrastructure permission is introduced by these
  crossings.

### Correctness and concurrency

- Manifest values now match installed SELECT options and the reserved currency
  field is avoided without changing the shared API contract.
- Both actor columns required by raw insertion are populated.
- The reviewed persistence changes stay inside the existing query-runner
  transaction and preserve compare-and-swap aggregate versioning.
- Live evidence proves HTTP 201, stored values, sequential numbering, and
  idempotent replay without a duplicate row.

### Performance

- Mappings are constant-time record lookups.
- Actor construction is local and bounded.
- No query, loop, worker, or network call was added by the adopted crossings.

### Maintainability

- Contract vocabulary and storage vocabulary are separated in one named adapter.
- Exhaustive mapping records force a compile failure when the contract unions
  expand.
- Docker comments document why each package boundary is required.
- CX4 now supplies the type gate and boot smoke that were missing when these
  defects were discovered.

## Verification

| Check | Result |
|---|---|
| Built contract CommonJS consumer check | Passed; validator export is `function` |
| Contract build/tests | Passed; 9/9 and 100% line/branch/function coverage |
| PashX Twenty app build | Passed; manifest, application files, and typecheck; 3 files emitted |
| PashX app lint/typecheck | Passed |
| Twenty Server standalone type gate | Passed |
| Twenty Server lint/format | Passed |
| PashX isolated module smoke | Passed 2/2 |
| Claude live write-path evidence | Passed; HTTP 201, correct mapped values/actors, idempotent replay |

## Future gate

Before a read endpoint or a second document/status write is enabled:

1. Add manifest-to-contract reverse mappings.
2. Add every enabled manifest SELECT option to the installed app metadata.
3. Add round-trip tests proving contract → storage → contract symmetry.

These are expansion requirements, not blockers for the single Vendor PO pilot.
