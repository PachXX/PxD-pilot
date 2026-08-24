# CL1 — Independent production review of the T3 Vendor PO slice

- Node: CL1
- Reviewer: Claude Code (independent of authorship)
- Date: 2026-08-07
- Scope: `packages/twenty-server/src/modules/pashx-mab/`, `packages/pashx-mab-contract/src/`, and the
  `commercialDocument` object definition in `packages/twenty-apps/pashx-mab/`
- Method: source read only. **No production file was modified.** Repairs are Codex's under CX1.
- Depends on: CX0 (complete) — `docs/execution/evidence/CX0-cloud-readiness.md`

## Verdict

**No P0. No P1.** Three P2 and three P3 findings, listed below.

The transaction, permission, idempotency, and numbering design is sound and matches ADR-0001 and
the architecture overview. The invariants the execution graph names are each implemented with a
real mechanism, not an assumption. Most of what follows is about *error translation* and *future
drift*, not about correctness of the happy or contended paths today.

## What I verified as correct

Stating these explicitly, because a review that only lists complaints does not tell you what is
actually safe to build on.

| Invariant | Mechanism | Verdict |
|---|---|---|
| Browser never supplies workspace or actor | `getWorkspaceAuthContext()`; `workspaceId`/`actorId` never read from the body | correct |
| Both permission layers fail closed independently | Layer 1: `JwtAuthGuard` + `WorkspaceAuthGuard` + `CustomPermissionGuard`. Layer 2: `PashxCapabilityService` capability-flag check. Layer 3: repositories constructed with `permission = { unionOf: [roleId] }`, so native object permissions still apply | correct — a capability holder with no object permission is still refused at the repository |
| Server-side request validation | `validateCreateVendorPurchaseOrderRequest` — strict UUID v1–v5 pattern, ISO-date **round-trip** check (not just a regex), bounded idempotency key, ISO-4217 currency pattern | correct, and stronger than typical |
| Stale version rejected, never overwrites | Two guards: explicit compare at `persistence:74`, then a compare-and-swap `update({id, aggregateVersion: expectedVersion})` at `persistence:117` with `affected !== 1` check | correct — the CAS closes the read-then-write window |
| Identical replay returns stored result | Advisory lock → receipt lookup by `idempotency_key` → return stored `result_json` | correct |
| Changed payload with reused key rejected | `request_hash` compared against stored hash; mismatch → `idempotencyKeyReused` | correct (see P2-2 for the drift risk) |
| Numbering serialized and unique | **Three** layers: `pg_advisory_xact_lock` on `number:{workspace}:{type}:{period}`, an atomic `INSERT … ON CONFLICT DO UPDATE … RETURNING` counter, and `isUnique: true` on `commercialDocument.name` in the app manifest | correct — the architecture's "unique constraint as the final guard" is genuinely present |
| One QueryRunner transaction for business writes | Document, case version, receipt, and audit all inside the second `startTransaction()` block | correct |
| Any failure rolls everything back | `catch` → `rollbackTransaction()` if active, `finally` → `release()` | correct |
| Reconciliation is repeatable and safe | Workspace-scoped advisory lock, `CREATE TABLE IF NOT EXISTS`, version row with `FOR UPDATE`, and a refusal if the installed version is **newer** than the code's | correct — the newer-version refusal is a good call |
| No SQL injection via schema name | `workspaceId` is server-derived; `quotePashxIdentifier` escapes embedded quotes | correct |
| No secrets in logs | The only error log emits `correlationId` and `error.name` — never the message, stack, or request | correct |

**Deadlock check:** lock acquisition order is `idempotency` → `aggregate` → `number`, identical on
every path through the command. Concurrent creates cannot deadlock against each other.

## Findings

### P2-1 — Duplicate record id and number collision both surface as HTTP 500

- **Severity:** P2
- **File:** `services/pashx-vendor-purchase-order-persistence.service.ts:103`, surfaced at
  `controllers/pashx-vendor-purchase-order.controller.ts:135-142`
- **Evidence:** `commercialDocument.insert({ id: request.commercialDocumentRecordId, name: result.documentNumber, … })`
  writes a **client-supplied** primary key and a value covered by a unique index. A constraint
  violation raises a TypeORM `QueryFailedError`, which is neither `PashxMabException` nor
  `PermissionsException`, so it falls to the catch-all and becomes
  `PASHX_INTERNAL_ERROR` / HTTP 500.
- **Impact:** A client-caused, self-correctable condition is reported as a server fault.
  `PASHX_INTERNAL_ERROR` is `retryable: false` with the message "Contact support with the
  correlation ID", so the caller is told to escalate something they could fix by retrying with a
  fresh record id. It also masks a genuine numbering collision — the exact failure the unique
  index exists to catch would be indistinguishable from a crash, which undermines the
  "duplicate numbering" rollback trigger's diagnosability.
- **Reproduction:** POST a valid Vendor PO. POST again with a **new** `idempotencyKey` but the
  **same** `commercialDocumentRecordId`. Observe 500 rather than a typed 409.
- **Recommendation:** Catch the unique-violation SQLSTATE `23505` around the insert and map it by
  constraint: primary key → a typed conflict on `commercialDocumentRecordId`; the `name` unique
  index → `numberConflict` (already defined, already `retryable: true`, already maps to 409).

### P2-2 — Idempotency fingerprint is a hand-maintained allowlist

- **Severity:** P2
- **File:** `utils/pashx-command-fingerprint.util.ts:9-20`
- **Evidence:** The hash is built from an explicitly enumerated object literal. It is **complete
  and correct today** — it covers every field of `PashxCreateVendorPurchaseOrderPayload`
  (`procurementCaseRecordId`, `supplierRecordId`, `issueDate`, `currency`, `vendorReference`)
  plus `commercialDocumentRecordId`, `contractVersion`, and `expectedVersion`. Nothing is
  currently missed. But there is no compile-time link between the payload type and this list.
- **Impact:** The day a field is added to `PashxCreateVendorPurchaseOrderPayload` and not added
  here, two materially different requests hash identically. The idempotency guard then returns
  the **first** request's stored result for the **second**, different request — reporting success
  for work that was never performed. That silently breaks "Reusing a key with a different payload
  is rejected", and it fails *open*, which is the wrong direction for a financial command.
- **Reproduction:** Not reproducible on current code. Add a field to the payload type, omit it
  here, then POST two requests differing only in that field with the same `idempotencyKey`. The
  second returns the first's result with `replayed: true`.
- **Recommendation:** Make omission a compile error rather than a review catch. Either derive the
  hash from an exhaustive `Record<keyof PashxCreateVendorPurchaseOrderPayload, true>` field map,
  or add a contract test that fails when `Object.keys(payload)` is not a subset of the hashed
  keys. A test is the cheaper of the two and fits the existing contract-test harness.

### P2-3 — Document numbering period is client-controlled and unbounded

- **Severity:** P2
- **File:** `services/pashx-vendor-purchase-order.service.ts:195`
- **Evidence:** `const period = request.payload.issueDate.slice(0, 4);` — the numbering period is
  the year taken from client-supplied `issueDate`. `isIsoDate` (`contract/src/commands.ts:87`)
  validates that the string is a well-formed, real calendar date, but places **no bound on the
  range**. `"2099-01-01"` and `"1900-01-01"` both pass.
- **Impact:** Any caller holding the `procurementIssue` capability can open an arbitrary numbering
  sequence by choosing an issue date — producing `MAB-VPO-2099-0001` or backfilling
  `MAB-VPO-1999-0001`. Because each period has its own counter row, this does not corrupt existing
  sequences or violate uniqueness, so it is not a P1. It does mean the document-number space is
  shaped by client input, which is a poor property for an auditable financial identifier and could
  confuse period-based reporting or ZATCA submission windows later.
- **Reproduction:** POST a Vendor PO with `payload.issueDate = "2099-01-01"`. Observe the returned
  `documentNumber` is `MAB-VPO-2099-0001`.
- **Recommendation:** This overlaps a known Gate 0 decision — the architecture overview already
  states Gate 0 must freeze "prefix, period, rollover". Until then, add a server-side sanity bound
  (for example, issue date within the current fiscal year ± 1) and reject outside it with
  `invalidInput` and field path `payload.issueDate`. Record the final rule at Gate 0.

### P3-1 — CAS-failure `staleVersion` omits `currentVersion`

- **Severity:** P3
- **File:** `services/pashx-vendor-purchase-order-persistence.service.ts:127-131`
- **Evidence:** The explicit check at line 74 throws `staleVersion` **with**
  `procurementCase.aggregateVersion`, which the controller forwards as `currentVersion`. The CAS
  guard at line 127 throws `staleVersion` with **no** version argument, so
  `error.currentVersion === undefined` and the controller omits the field entirely.
- **Impact:** A client receiving this 409 has nothing to retry against, unlike the identical error
  from the other path — inconsistent contract behaviour for the same error code. Note this path
  should be unreachable while the aggregate advisory lock holds; if it ever fires, it signals a
  locking defect, and the response gives no diagnostic to investigate with.
- **Reproduction:** Not reachable through the HTTP API under current locking. Reachable by
  bypassing `lockCommand` in a test harness.
- **Recommendation:** Re-read the row's current `aggregateVersion` and include it, matching line 74.
  Consider logging at `warn` with the correlation ID when this path fires, since it means the
  advisory lock did not do its job.

### P3-2 — Audit payload stores the full request and result unredacted

- **Severity:** P3
- **File:** `services/pashx-command-support.service.ts:160`
- **Evidence:** `JSON.stringify({ request, result })` is written to `pashx_audit_event.payload`
  (jsonb). No field filtering, no redaction, no retention rule.
- **Impact:** Acceptable now — the environment is `data_classification = disposable`, the payload
  is commercial rather than personal, and full-fidelity audit is the point. It becomes a data
  handling question the moment real MAB data lands: supplier references and commercial terms
  accumulate indefinitely in a table with no retention policy, and the Cloud SQL backup/PITR
  window copies them.
- **Reproduction:** Create a Vendor PO, then `SELECT payload FROM <schema>.pashx_audit_event`.
- **Recommendation:** No change for the pilot. Before the SG gate promotes real data, decide a
  retention period and whether any payload field needs redaction, and record the decision. This
  pairs with the residency question already open in IDR-0001.

### P3-3 — `getWorkspaceAuthContext()` result used without a defined check

- **Severity:** P3
- **File:** `controllers/pashx-vendor-purchase-order.controller.ts:84-86`
- **Evidence:** `const authContext = getWorkspaceAuthContext();` then immediately
  `authContext.type !== 'user'`. If the accessor can return `undefined` outside an established
  request context, this throws `TypeError` before any typed error handling.
- **Impact:** Low. The three guards on the controller should guarantee the context exists, so this
  is defence in depth rather than a live bug. If it did occur, the failure would be an untyped 500
  rather than a stable PashX error, and the `errorType` log line would read `TypeError` with no
  further detail.
- **Reproduction:** Not reachable through the guarded route.
- **Recommendation:** Add an explicit `isDefined` check that throws
  `forbiddenCapability`, consistent with the adjacent `type !== 'user'` branch. One line.

## Notes that are not findings

- **The two-transaction structure is correct, not a defect.** Reconciliation commits before the
  business transaction opens (`service:62-68`). This is deliberate per the CX0 contract, and it is
  the right call: DDL inside the financial transaction would widen the lock footprint and make
  rollback semantics murkier. Reconciliation is idempotent, so a business-transaction rollback
  leaving the tables in place is correct behaviour.
- **`hashtextextended` collisions** would cause two unrelated scopes to serialize against each
  other. That is over-locking, which is safe — it costs throughput, never correctness.
- **`padStart(4, '0')`** yields a five-digit sequence above 9,999 rather than truncating, so the
  number stays unique and the unique index still holds. Format-only, and far beyond pilot volume.

## Handoff to CX1

| Finding | Severity | Suggested disposition |
|---|---|---|
| P2-1 duplicate id / number collision → 500 | P2 | Accept — small, contained, improves a rollback trigger's diagnosability |
| P2-2 fingerprint allowlist drift | P2 | Accept — a contract test is cheap and prevents a fail-open |
| P2-3 unbounded numbering period | P2 | Accept the interim bound; defer the final rule to Gate 0 |
| P3-1 CAS staleVersion missing version | P3 | Accept — one-line consistency fix |
| P3-2 audit retention | P3 | Defer with owner: revisit before SG promotes real data |
| P3-3 auth context defined check | P3 | Accept — one line, defence in depth |

No finding blocks CL2 or CL3 from proceeding once CX1 dispositions them. P2-1 and P2-2 are worth
repairing **before** CL2 writes its integration tests, since both change observable behaviour that
those tests will assert against — fixing them afterwards would invalidate the test evidence.
