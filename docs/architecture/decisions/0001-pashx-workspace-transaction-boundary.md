# ADR 0001: Keep PashX write support data in the workspace transaction

- Status: accepted for the MAB pilot
- Date: 2026-08-05

## Context

Issuing a commercial document must atomically validate the aggregate version,
allocate its number, write the Twenty workspace record, store the idempotent
result, and append an audit event. Twenty's core and workspace data sources use
separate PostgreSQL connections. A transaction opened on one data source cannot
make writes on the other connection atomic.

## Decision

PashX command support tables belong to each Twenty workspace schema. The command
handler uses one `GlobalWorkspaceDataSource` query runner for both Twenty ORM
record writes and raw support-table statements. Number allocation uses
`pg_advisory_xact_lock(hashtextextended(lock_scope, 0))` on that same runner.

The browser sends a client-safe command request. The controller derives
`workspaceId` and `actorId` from Twenty's authenticated context and checks the
PashX application capability before opening the transaction.

The initial, configurable pilot numbering presentation is
`MAB-VPO-{calendar year}-{four-digit sequence}`. The stored counter key is
workspace + document type + period; the exact prefix, reset period, VAT,
discount, delivery, and rounding policies remain Gate 0 decisions.

## Consequences

- A failure rolls back the CRM record, number, idempotency result, and audit.
- Replaying an identical key returns the stored authoritative result.
- Reusing a key with different input is rejected.
- Support tables must be created idempotently for every workspace schema and
  included in backup, restore, and tenant-deletion procedures.
- A future multi-tenant SaaS can preserve this boundary, but this ADR approves
  only the single-deployment MAB pilot.

## Rejected alternatives

- Core-schema support tables: cannot share the workspace-record transaction.
- In-memory locks or counters: unsafe across processes and restarts.
- Client-generated numbers or actor/workspace identifiers: untrusted and prone
  to collisions or cross-workspace authorization defects.
