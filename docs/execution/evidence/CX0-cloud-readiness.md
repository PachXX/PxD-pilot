# CX0 — PashX T3 Cloud-Readiness Evidence

- Owner: Codex
- Node: CX0
- State: complete
- Updated: 2026-08-07
- Infrastructure consumer: Claude Code CL0

## Application deployment contract

### Processes

| Process                      | Command/image behavior                      | Health/order                                                                                                  |
| ---------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Twenty server                | Pinned PashX/Twenty image, `NODE_PORT=3000` | Expose only through HTTPS proxy/load balancer; `/healthz` must pass before worker/app install                 |
| Twenty worker                | Same immutable image, `yarn worker:prod`    | Start after server migrations and server health; disable migrations and cron registration in worker           |
| Redis                        | Required by the pinned Twenty server/worker | Private only; `noeviction`; health with `redis-cli ping`                                                      |
| Cloud SQL PostgreSQL         | PostgreSQL 16-compatible target             | Private/restricted; server performs migrations; destructive tests use disposable workspace/database data only |
| GCS through Twenty S3 driver | Durable source/generated documents          | No durable application-VM file storage; Gate 0 interoperability suite is mandatory                            |

### Required configuration

Secrets belong in Secret Manager and are injected at runtime. Do not commit values.

| Variable                         | Purpose                                                      |
| -------------------------------- | ------------------------------------------------------------ |
| `NODE_PORT=3000`                 | Server listen port                                           |
| `SERVER_URL`                     | Canonical external HTTPS origin                              |
| `PG_DATABASE_URL`                | Cloud SQL connection string for the application database     |
| `REDIS_URL`                      | Private Redis connection                                     |
| `ENCRYPTION_KEY`                 | Current application encryption key                           |
| `FALLBACK_ENCRYPTION_KEY`        | Controlled rotation fallback                                 |
| `APP_SECRET`                     | Twenty application secret                                    |
| `DISABLE_DB_MIGRATIONS`          | False for the server migration owner; true for worker        |
| `DISABLE_CRON_JOBS_REGISTRATION` | False for server; true for worker                            |
| `STORAGE_TYPE=s3`                | Select Twenty's S3-compatible storage driver                 |
| `STORAGE_S3_REGION`              | Region accepted by the configured interoperability endpoint  |
| `STORAGE_S3_NAME`                | Dedicated MAB document bucket                                |
| `STORAGE_S3_ENDPOINT`            | GCS XML/S3 interoperability endpoint selected by Gate 0      |
| `STORAGE_S3_ACCESS_KEY_ID`       | Dedicated service-account HMAC access ID from Secret Manager |
| `STORAGE_S3_SECRET_ACCESS_KEY`   | Matching HMAC secret from Secret Manager                     |

### Network and identity

- Only HTTPS is public.
- Cloud SQL and Redis are never directly public.
- Prefer IAP plus OS Login for operator access; do not expose unrestricted SSH.
- Use separate least-privilege deployer and runtime service accounts.
- Runtime needs only image pull, secret access for named secrets, logging/metrics, Cloud SQL connection, and the dedicated bucket permissions required by Twenty.
- Infrastructure state must not contain secret values.

### Migration and reconciliation order

1. Provision private network, Cloud SQL, GCS, Secret Manager references, registry, and runtime identity.
2. Build and pin the Twenty/PashX image by immutable digest.
3. Start one server migration owner with worker migrations disabled.
4. Wait for `/healthz` before starting the worker.
5. Install/synchronize the PashX application in the disposable workspace.
6. Invoke the Vendor PO service boundary in disposable data. Before its business transaction, it opens a dedicated workspace transaction and runs `PashxWorkspaceSchemaService.reconcileSupportTables`.
7. Reconciliation takes a workspace-scoped PostgreSQL advisory transaction lock, creates/locks `pashx_support_schema_version`, creates missing receipt/counter/audit tables idempotently, and records schema version `1`.
8. Run reconciliation twice and assert the second pass is a no-op from a schema/data perspective.
9. Only then run concurrency, rollback, installed-app, and browser E2E tests.

Support tables live inside the Twenty workspace schema. Cloud SQL backup/PITR and restore therefore cover the CRM record, command receipt, number counter, schema version, and audit data together. No PashX command state depends on VM memory or local disk.

## GCS compatibility gate

Before user document work, verify through the deployed application:

- Server upload and download.
- Browser CORS.
- Presigned direct PUT.
- Presigned download or redirect.
- Delete behavior.
- Restart persistence.
- Version recovery and permission denial.

If any operation fails, record the evidence and choose an explicitly supported S3-compatible fallback. Do not implement a native GCS driver during the pilot.

## Smoke commands and evidence requirements

Claude owns the exact deployed URLs, project/region parameters, and commands in `docs/operations/pashx-mab-gcp/`. Evidence must include:

- Immutable image digest and deployed revision.
- `/healthz` response through the external HTTPS boundary.
- Server and worker health.
- Database migration and PashX reconciliation version.
- Authentication and disposable workspace install.
- Storage upload/download/delete/restart results.
- Sanitized log queries showing correlation IDs without secrets.
- Backup/PITR, object-versioning, rollback, and teardown evidence.

## Codex changes in this node

- Added `pashx_support_schema_version` with current version `1`.
- Reconciliation now requires an active transaction and takes a workspace-scoped PostgreSQL advisory transaction lock.
- Vendor PO creation commits reconciliation before opening the authoritative business transaction.
- Added framework-free architecture assertions for the schema-version table, version constant, and reconciliation entry point.
- Added the OpenTelemetry histogram `pashx/financial-command/internal-duration-ms` using Twenty's `MetricsService` and `MetricsModule`.
- The Vendor PO timer starts before the internal workspace command and stops immediately after its success or failure. It contains no OCR, ZATCA, storage-provider, or other external call.
- Histogram buckets include 1,000 ms and expose only bounded attributes: `command`, `documentType`, `outcome`, and `replayed`.
- Internal application faults now return HTTP 500, while retryable storage/provider faults return HTTP 503 instead of being misreported as unprocessable client input.
- Native Twenty object-permission denials translate to the stable PashX forbidden response; a user workspace with no assigned role fails closed as missing capability.
- Reconciliation continues to create missing support tables idempotently but no longer rewrites `reconciled_at` when the installed support-schema version is already current.

## Verification ledger

| Check                                | Result  | Evidence                                                                                      |
| ------------------------------------ | ------- | --------------------------------------------------------------------------------------------- |
| Contract/architecture tests          | passed  | 9/9; 100% line/branch/function coverage                                                       |
| Contract lint                        | passed  | 0 warnings, 0 errors                                                                          |
| Focused PashX server oxlint          | passed  | 0 warnings, 0 errors across 11 PashX module/metric-key files                                  |
| Changed-file oxfmt                   | passed  | controller, capability service, workspace-schema service, and contract architecture test      |
| Full server typecheck                | not run | authoritative cloud build is owned by CL2; local dependency focus remains constrained by disk |
| Real reconciliation/idempotency test | not run | owned by CL2 in Cloud SQL                                                                     |
| Cloud Monitoring p95 alert           | partial | CL0 mapping/policies exist; live sample enablement and drill remain with Claude CL3            |

## CX0 closure and handoff

Claude consumed the infrastructure contract and completed CL0 against the live `pashx-mab-pilot` environment. The focused source diff has been reviewed and repaired, and the framework-free verification above is green. CX0 is complete.

CL1 is now the next review node. Claude must independently review the production boundary and publish `docs/reviews/2026-08-05-claude-t3-review.md` without changing Codex-owned production files. CX1 begins only after that review exists. Cloud server typecheck, real Cloud SQL invariants, installed-app smoke, and browser E2E remain explicitly assigned to CL2, CL3, and CX2 rather than being claimed by CX0.
