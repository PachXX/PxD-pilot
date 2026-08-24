# CX1 — CL1 Review Disposition and Repairs

- Owner: Codex
- Node: CX1
- State: complete
- Date: 2026-08-07
- Input: `docs/reviews/2026-08-05-claude-t3-review.md`

## Outcome

Claude's independent CL1 review reported no P0/P1 findings, three P2 findings, and three P3 findings. CX1 accepted four findings for immediate repair, deferred one real-data policy decision to the SG gate, and rejected one recommendation because the cited API cannot return the state it proposed checking.

No deployable boundary or ADR changed. Full Twenty Server typecheck and real Cloud SQL behavior remain CL2 responsibilities.

## Finding dispositions

| Finding | Disposition | Evidence and result |
|---|---|---|
| P2-1 duplicate record ID / number collision becomes 500 | Accepted and repaired | PostgreSQL SQLSTATE `23505` is inspected without exposing its detail. Column `id` maps to new stable `PASHX_RECORD_CONFLICT`/409 with `commercialDocumentRecordId`; column `name` maps to existing `PASHX_NUMBER_CONFLICT`/409. Unknown constraint shapes are rethrown rather than misclassified. |
| P2-2 idempotency fingerprint allowlist can drift | Accepted and repaired | The canonical nested payload now `satisfies Record<keyof PashxCreateVendorPurchaseOrderPayload, unknown>` and the top-level fingerprint input exhaustively covers every request key except the deliberately excluded `idempotencyKey`. A future field omission becomes a compile error. |
| P2-3 numbering period is unbounded client input | Accepted as interim rule | Until Gate 0 freezes fiscal period/rollover, issue year must be within the current UTC calendar year ±1. Out-of-window input returns `PASHX_INVALID_INPUT` on `payload.issueDate` before number allocation. The final business rule remains a Gate 0 decision. |
| P3-1 CAS stale-version path omits current version | Accepted and repaired | A zero-row compare-and-swap re-reads the case in the same transaction. Missing case becomes typed not-found; an existing case returns typed stale-version with its current aggregate version. |
| P3-2 full audit payload has no retention/redaction rule | Deferred | Full-fidelity audit remains appropriate for the disposable-data pilot. Shahil/product/security must freeze retention and field-redaction policy before SG permits real MAB data; the decision must also cover backup/PITR copies and the open residency question. |
| P3-3 auth-context undefined check | Rejected with evidence | `getWorkspaceAuthContext(): WorkspaceAuthContext` never returns undefined: it throws when AsyncLocalStorage is absent. The guarded route establishes the context. Converting a missing server request context into `forbiddenCapability` would hide a server programming/configuration fault as a user authorization decision. |

## Verification

| Check | Result |
|---|---|
| `corepack yarn workspace pashx-mab-contract test` | Passed 9/9; 100% line/branch/function coverage |
| `corepack yarn workspace pashx-mab-contract lint` | Passed; 0 warnings/errors |
| Focused PashX Twenty Server oxlint | Passed across 11 files; 0 warnings/errors |
| `oxfmt --check` on six changed source/test files | Passed |
| Contract build | Passed |
| PashX app typecheck | Passed |
| PashX app lint | Passed; 0 warnings/errors across 24 files |
| `twenty dev:build .` from the PashX app workspace | Passed; manifest, application files, and typecheck; 3 files emitted |
| `git diff --check` | Passed |

## Handoff

CX1 is complete. CL2 and CL3 are ready and may run in parallel where safe. CL2 must assert the new observable conflict behavior, the provisional issue-year rejection, and current-version response through real Cloud SQL transactions. CL3 must deploy a pinned image, produce the first live financial-command metric series, enable the two gated PromQL policies, and run the alert drill. Pause the scheduled shutdown before long cloud runs.
