# Runbook — rollback

- Node: CL0
- Owner: Claude Code
- Date: 2026-08-05
- Target RTO: 4 hours. Target RPO: 5 minutes. Both come from the architecture overview.

## When to roll back

Any single one of these is sufficient. Do not deliberate; roll back first, diagnose after.

| Trigger | Detected by |
|---|---|
| Authentication or the Vendor PO flow fails | smoke check, CX2 |
| Any unauthorized write succeeds | CL2 permission tests |
| Duplicate document numbering | unique constraint violation or CL2 test 6 |
| Stale version overwrote newer work | CL2 test 5 |
| Idempotency mismatch accepted | CL2 tests 3–4 |
| A failure did not roll back every write | CL2 test 8 |
| Reconciliation cannot rerun | CL2 test 9 |
| Secrets appear in logs | `pashx-mab-possible-secret-in-logs` alert |
| Database connections exhaust | `Cloud SQL connections near limit` alert |
| `/healthz` fails for five minutes | `healthz failing` uptime alert |
| Application errors exceed 1% | `application error rate elevated` alert |
| Internal financial-command p95 > 1s (excluding external providers) | Cloud SQL query insights, `log_min_duration_statement=1000` |

## Decision: which rollback

| Situation | Use |
|---|---|
| Bad application image; database schema unchanged | **A — image rollback** |
| Bad image *and* a migration ran | **B — image rollback + database restore** |
| VM is wedged, unreachable, or of uncertain state | **C — VM replacement** |
| Data corruption with a known-good moment | **D — point-in-time restore** (see the backup/restore runbook) |
| A secret leaked | **E — rotate**, then A |

## A — image rollback (~10 minutes)

The previous digest is printed by `deploy.sh` before every apply and recorded in the CL0
evidence file. If you do not have it:

```bash
gcloud artifacts docker images list europe-west1-docker.pkg.dev/<PROJECT>/pashx-mab-images/twenty-pashx --include-tags --sort-by=~CREATE_TIME --limit=5 --project=<PROJECT>
```

Roll:

```bash
deploy/pashx-mab/deploy.sh <PREVIOUS_IMAGE@sha256:...>
```

Verify:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://<HOST>/healthz
```

Then re-run the Vendor PO smoke path against disposable data before declaring recovery.

**Caveat that decides between A and B:** Twenty runs migrations on server start. If the bad
image ran a migration, the schema is now ahead of the rolled-back code. Check before choosing A:

```bash
gcloud logging read 'resource.type="gce_instance" AND textPayload=~"migration"' --project=<PROJECT> --limit=50 --freshness=2h
```

If any migration executed in the bad deploy, use B.

## B — image rollback with database restore (~1–2 hours)

1. Stop writes. Stop the application containers, leaving the VM up:

```bash
gcloud compute ssh pashx-mab-app --zone=<ZONE> --project=<PROJECT> --tunnel-through-iap --command="docker compose -f /run/pashx-mab/docker-compose.yml stop server worker"
```

2. Restore the database to the moment before the bad deploy — see
   [`runbook-backup-restore.md`](runbook-backup-restore.md), procedure "PITR clone". Restore into
   a **clone**, verify it, then promote. Never restore in place as the first move.

3. Deploy the previous digest with `deploy.sh`.

4. Re-run reconciliation and assert the second pass is a no-op.

5. Re-run the Vendor PO smoke path.

## C — VM replacement (~20 minutes)

The VM holds no durable state. Replacing it is safe and is the fastest way out of an unknown
runtime state.

```bash
cd infra/pashx-mab-gcp/terraform && terraform apply -replace=google_compute_instance.app[0]
```

The replacement boots, re-reads every secret from Secret Manager into tmpfs, and re-pulls the
pinned digest. Redis queue state is lost by design — no authoritative business state lives
there, because every authoritative write is inside the Cloud SQL transaction per ADR-0001. Jobs
in flight must be re-driven.

Static IP, DNS, Cloud SQL, and the bucket are unaffected.

## D — point-in-time restore

See [`runbook-backup-restore.md`](runbook-backup-restore.md). Use when the problem is data, not
code.

## E — secret rotation after a leak (~30 minutes)

1. Treat the leaked value as compromised from the moment it was written, not from detection.
2. Rotate per the table in [`iam-design.md`](iam-design.md#rotation).
3. If the leak reached Cloud Logging, purge the affected log entries and record what was purged
   and why in the evidence file. Log purging is irreversible; note the exact filter used.
4. If the database password leaked:

```bash
cd infra/pashx-mab-gcp/terraform && terraform apply -replace='random_password.app_db[0]'
```

This regenerates the password, the SQL user, and the `pg-database-url` secret in one plan. Then
run procedure C to restart the VM against the new credential.

5. Only after rotation, resume the deploy.

## Post-rollback, always

- [ ] `/healthz` returns 200 through external HTTPS.
- [ ] Server and worker containers are both `running`.
- [ ] Reconciliation reports schema version `1` and a second pass is a no-op.
- [ ] A Vendor PO can be created in disposable data and the document, version, receipt, counter,
      and audit rows are all present.
- [ ] Append the rollback to the CL0 evidence file: trigger, procedure used, from-digest,
      to-digest, restore point if any, and elapsed time.
- [ ] Append a handoff entry to the shared Obsidian context noting which prior evidence the
      rollback invalidated.
- [ ] If the rollback was caused by a production defect, record it as a CL1 finding for Codex.
      Do not repair Codex-owned production code from the infrastructure lane.

## What rollback does not cover

- **Accepted production data.** There is none, by design, until the SG gate passes.
- **A bad Terraform apply that deleted a resource.** State versioning in the state bucket lets
  you recover the state file, not the resource. Cloud SQL deletion protection and
  `force_destroy = false` on the bucket are the real guards. Do not disable either outside the
  teardown runbook.
