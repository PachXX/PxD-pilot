# CX5 — ORM error translation repair

Date: 2026-08-11
Owner: Codex
State: **application implementation complete; deployed Cloud SQL verification pending**

## Measured cause

Claude's CL2 telemetry established that the violated `_commercialDocument` constraint is the unique
index on `name`, and that Twenty emits `TwentyORMExceptionCode.DUPLICATE_ENTRY_DETECTED` rather than
the underlying TypeORM `QueryFailedError`. Twenty had already parsed the PostgreSQL field but dropped
it when constructing the wrapper. PashX therefore could not distinguish record-id conflict from
allocated-number conflict and returned an untyped 500.

## Repair

- Preserve only `conflictingFieldName` on `TwentyORMException`; do not retain the driver error or
  duplicate value.
- Translate wrapped field `name` to `PASHX_NUMBER_CONFLICT` (HTTP 409).
- Preserve the existing `id` translation to `PASHX_RECORD_CONFLICT`.
- Translate a wrapped duplicate missing field metadata to typed record conflict rather than 500.
- Translate `QUERY_READ_TIMEOUT` to retryable `PASHX_STORAGE_FAILURE` (HTTP 503).

## Verification

| Gate | Result |
|---|---|
| Focused Jest | 2 suites, 4 tests passed |
| Targeted oxlint | 0 warnings, 0 errors |
| oxfmt | clean on 6 changed TypeScript files |
| Twenty Server typecheck | `nx typecheck:ci twenty-server` passed |
| Patch integrity | `git diff --check` passed |
| Database-backed CL2-8 | pending rebuild/redeploy by Claude |

No database-backed suite ran from Codex while Claude's `.env.test` remained retargeted to Cloud SQL.
The live VM containers, SSH tunnel, backup environment file, and teardown remain Claude-owned.

## Acceptance handoff

After rebuilding and deploying, rerun CL2-8 against Cloud SQL. The expected response for the measured
`_commercialDocument(name)` collision is HTTP 409 with `PASHX_NUMBER_CONFLICT` and `retryable=false`.
A deliberately induced query read timeout should return HTTP 503 with `PASHX_STORAGE_FAILURE` and
`retryable=true`.
