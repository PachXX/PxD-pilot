# CL2 — PashX MAB Cloud SQL invariant tests

Owner: Claude Code (node CL2). Exclusive path per the execution graph:
`packages/twenty-server/test/integration/pashx-mab/`.

Every suite drives the real endpoint `POST /rest/pashx-mab/vendor-purchase-orders` and then reads
the resulting rows with raw SQL. Nothing is mocked — that is the CL2 acceptance contract: *"tests
use real Cloud SQL transactions through the actual service boundary, not mocks"*.

## Status: all 9 scenarios written + 1 supplementary. **None executed.**

| # | Scenario | File |
|---|---|---|
| 1 | Both permission layers fail closed independently | `01-permission-layers-fail-closed` |
| 2 | Valid creation writes document, version, receipt, counter, audit | `02-valid-creation-writes-all` |
| 3 | Identical replay creates no duplicate writes | `03-identical-replay-no-duplicate-writes` |
| 4 | Changed-payload idempotency reuse is rejected | `04-changed-payload-idempotency-rejected` |
| 5 | Stale version rejected with the current version | `05-stale-version-rejected` |
| 6 | Parallel allocation is unique within a scope | `06-parallel-allocation-unique` |
| 7 | Workspace, document-type, and period scopes isolated | `07-numbering-scope-isolation` (partial by design) |
| 8 | Injected failure rolls back every write | `08-injected-failure-rolls-back-every-write` |
| 9 | Install/upgrade reconciliation is repeatable | `09-reconciliation-repeatable` |
| — | Provisional issue-year bound (CX1 / P2-3) | `10-provisional-issue-year-bound` |

**Nothing here has been run.** The suites are authored against a live environment that does not
yet have the PashX app installed — that happens at CL3. Treat every row above as *written and
reviewed*, never as *passing*, until a real run is recorded in the CL2 evidence. Authored tests are
not evidence.

## What CX1 changed, and what this suite asserts because of it

CX1 dispositioned the six CL1 findings. Three produced observable behaviour that its handoff asks
CL2 to cover, and all three are covered:

| CX1 repair | Asserted in |
|---|---|
| P2-1 — SQLSTATE 23505 on `id` → typed `PASHX_RECORD_CONFLICT` 409; on `name` → `PASHX_NUMBER_CONFLICT` | `08` (typed code, field path, and that no driver detail leaks) |
| P2-2 — fingerprint input made exhaustive by construction | `04` (every payload and top-level field varied individually) |
| P2-3 — issue year bounded to current UTC year ±1, checked before allocation | `10` (in/out of window, and that rejection burns no number) |
| P3-1 — CAS stale-version path re-reads and returns the current version | `05` |

## Deliberately partial coverage in scenario 7

Stated here rather than left for someone to infer from a green run:

- **Period isolation** — fully exercised behaviourally.
- **Document-type isolation** — not reachable yet; `vendorPurchaseOrder` is the only type in T3.
  The composite primary key `(document_type, period)` is asserted instead, so the mechanism is
  verified before a second type exists.
- **Workspace isolation** — asserted structurally. Isolation comes from the counter living in the
  per-workspace schema, not from a workspace column. A behavioural multi-workspace test belongs
  with CX2, where a second workspace already exists.

## Prerequisites

1. **The PashX app must be installed in the target workspace.** The custom objects
   (`procurementCase`, `commercialDocument`) and the `pashx.procurement.issue` capability come from
   the app manifest, not Twenty core. `assertPashxAppInstalled()` runs in every `beforeAll` and
   fails with an explicit remediation message rather than dying inside a request.
2. **Roles must differ between the test principals.** Scenario 1 needs the admin token to hold
   `pashx.procurement.issue` and the guest token not to — that difference is what proves layer 2
   runs independently of layers 1 and 3.
3. **Pause the scheduled shutdown before running.** An 18:00 Asia/Riyadh stop mid-suite reads as an
   application defect:
   ```
   gcloud scheduler jobs pause pashx-mab-shutdown --location=me-central1 --project=pashx-mab-pilot
   ```

## Running

```
npx nx run twenty-server:test:integration:with-db-reset
```

Single suite:

```
cd packages/twenty-server && npx jest --config jest-integration.config.ts test/integration/pashx-mab
```

## Harness notes

- **Dates are derived from the clock, never hardcoded.** CX1's issue-year bound means a literal
  year would start failing with `PASHX_INVALID_INPUT` once the calendar moved past it. An earlier
  draft used 2031–2034 and would have broken the moment that rule landed. `CURRENT_PERIOD` and
  `CURRENT_PERIOD_ISSUE_DATE` come from `pashx-mab-test-context.util.ts`.
- **Assertions read the database, not just the response.** The response proves what the server
  said; the rows prove what it did.
- **Scenario 8 injects a late-stage failure without touching production code**, by reusing an
  already-taken `commercialDocumentRecordId`. The insert fails *after* the counter has been
  incremented inside the open transaction, making the counter the sharpest rollback signal
  available — a surviving increment would mean every failed command burns a document number.
- **Scenario 6 uses distinct procurement cases per request on purpose.** Same-case requests would
  serialise on the aggregate lock and never contend for a number, making the test green while
  exercising nothing.
- **The schema-quoting helper is duplicated from production, not imported.** Importing it would
  make these tests agree with a regression in the production helper.
- **Cleanup never truncates `pashx_number_counter`.** Counter assertions are deltas around a
  command; resetting between tests would mask an ordering bug in the tests themselves.
- **Fixtures are seeded with raw SQL, not the API**, so a seeding failure cannot be mistaken for a
  command failure.
