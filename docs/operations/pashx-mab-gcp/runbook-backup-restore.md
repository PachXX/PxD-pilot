# Runbook — backup and restore

- Node: CL0
- Owner: Claude Code
- Date: 2026-08-05
- Targets: **RTO 4 hours, RPO 5 minutes** (architecture overview)

> [!warning] The RPO holds only during scheduled running hours
> The pilot runs 08:00–18:00 Asia/Riyadh, Sunday–Thursday
> ([`runbook-scheduled-shutdown.md`](runbook-scheduled-shutdown.md)). A **stopped** Cloud SQL
> instance produces no transaction log, so **point-in-time recovery has a gap for every night and
> every weekend.** Overnight there is nothing to recover to except the last automated backup.
>
> Acceptable while the environment holds disposable pilot data. **Not** acceptable once real MAB
> data exists — at that point either disable the schedule and raise the budget, or accept an
> overnight RPO of "last backup" and say so in writing.
>
> The automated backup itself is safe: it is pinned to 05:30 UTC (08:30 Riyadh), inside the
> running window, and a `guards.tf` precondition fails the plan if it is ever moved outside.
> A stopped instance takes no backup and reports no error, so this guard is the only thing
> standing between the schedule and a backup set that silently does not exist.

## What is protected, and by what

| Data | Mechanism | Window | Recovers |
|---|---|---|---|
| Twenty core and workspace records | Cloud SQL automated backup, daily **05:30 UTC** (08:30 Riyadh, inside the running window) | 7 retained backups | to a daily snapshot |
| Same, plus everything below | Cloud SQL PITR from write-ahead logs | 7 days, ~5-minute granularity **during running hours only** | to a chosen second inside a running window |
| PashX support tables — `pashx_receipt`, `pashx_counter`, `pashx_audit`, `pashx_support_schema_version` | **the same** Cloud SQL backup | same | same |
| Document bytes | GCS object versioning | noncurrent kept 30 days, max 3 versions | any prior version |
| Secrets | Secret Manager version history | all versions until destroyed | any prior version |
| Infrastructure definition | Terraform in git + versioned state bucket | full history | full rebuild |
| Container images | Artifact Registry, immutable tags, 10 recent | 10 builds | any recent digest |

**Why support tables need no separate mechanism:** they live inside the Twenty workspace schema
(CX0 evidence, section "Migration and reconciliation order"). A Cloud SQL restore therefore
recovers the CRM record, the command receipt, the number counter, the schema version, and the
audit row as one consistent set. This is the property that makes the ADR-0001 transaction
boundary meaningful after a restore, and it must be re-verified whenever support-table placement
changes.

**What is not protected:** Redis queue state (deliberate — see IDR-0001), and the VM filesystem
(deliberate — it holds nothing durable).

## Verify backups are actually running

Do this weekly during the pilot, and always before a destructive test session.

```bash
gcloud sql backups list --instance=pashx-mab-pg --project=<PROJECT> --limit=10
```

```bash
gcloud sql instances describe pashx-mab-pg --project=<PROJECT> --format="yaml(settings.backupConfiguration)"
```

Expect `enabled: true`, `pointInTimeRecoveryEnabled: true`,
`transactionLogRetentionDays: 7`, `retainedBackups: 7`.

A backup that has never been restored is a hypothesis. Run the drill below at least once before
CL0 is marked complete.

## Restore procedure 1 — PITR clone (the default; non-destructive)

Restores to a chosen timestamp into a **new instance**. The live instance is untouched, so this
is safe to run during an incident and safe to abandon.

1. Fix the target timestamp. Use the last known-good moment, in RFC 3339 UTC:

```bash
date -u -v-30M +%Y-%m-%dT%H:%M:%SZ
```

2. Clone:

```bash
gcloud sql instances clone pashx-mab-pg pashx-mab-pg-restore-$(date -u +%Y%m%d%H%M) --point-in-time="<RFC3339-UTC>" --project=<PROJECT>
```

The clone lands in the same region and the same private network. Expect 10–30 minutes.

3. Verify the clone before touching anything live. Connect through the Cloud SQL Auth Proxy from
   the VM and check that the support tables and their invariants survived:

```sql
SELECT version FROM pashx_support_schema_version;
SELECT count(*) FROM pashx_audit WHERE created_at > now() - interval '1 day';
SELECT document_type, period, max(sequence) FROM pashx_counter GROUP BY 1, 2;
SELECT idempotency_key, count(*) FROM pashx_receipt GROUP BY 1 HAVING count(*) > 1;
```

The last query must return zero rows — duplicate receipts after a restore would mean the restore
point split a transaction, which cannot happen with PITR but must be checked rather than assumed.

4. Promote by repointing the application, not by renaming the instance. Update the
   `pashx-mab-pg-database-url` secret to the clone's private IP, then replace the VM:

```bash
gcloud sql instances describe <CLONE_NAME> --project=<PROJECT> --format='value(ipAddresses[0].ipAddress)'
```

```bash
cd infra/pashx-mab-gcp/terraform && terraform apply -replace='google_compute_instance.app[0]'
```

5. Keep the original instance for at least 24 hours before deleting it. It is the rollback of
   the rollback.

## Restore procedure 2 — in-place backup restore (destructive)

Overwrites the live instance from a backup. Use only when the clone path is unavailable and
current data is already known-bad.

```bash
gcloud sql backups list --instance=pashx-mab-pg --project=<PROJECT>
```

```bash
gcloud sql backups restore <BACKUP_ID> --restore-instance=pashx-mab-pg --project=<PROJECT>
```

Stop the application containers first. Everything written after the backup is lost, permanently.

## Restore procedure 3 — a single document from GCS

```bash
gcloud storage ls -a "gs://pashx-mab-documents-<PROJECT>/<OBJECT_PATH>"
```

Generation numbers appear as `#<generation>`. Restore one:

```bash
gcloud storage cp "gs://pashx-mab-documents-<PROJECT>/<OBJECT_PATH>#<GENERATION>" "gs://pashx-mab-documents-<PROJECT>/<OBJECT_PATH>"
```

This is also Gate 0 storage check 8 ("version recovery"), so the drill and the compatibility
suite share evidence.

## Restore procedure 4 — full environment rebuild

For total loss of the project or a corrupt Terraform state.

1. Recover state from the versioned state bucket, or start from empty state and import.
2. `terraform init && terraform apply` from the committed configuration.
3. Repopulate secrets: `30-put-secrets.sh` and `40-create-storage-hmac.sh`. Prior Secret Manager
   versions are recoverable if the project survived; if not, `ENCRYPTION_KEY` is unrecoverable
   and encrypted field data is lost with it. **This is the single strongest argument for
   exporting `ENCRYPTION_KEY` to an offline password manager before real data exists.**
4. Restore the database from the most recent export or backup.
5. Redeploy the recorded digest with `deploy.sh`.
6. Re-run reconciliation, then the full smoke path.

Realistic elapsed time: 2–3 hours, inside the 4-hour RTO.

## The drill — required before CL0 is complete

Run this against disposable data and record the timings in the evidence file.

- [ ] Note a timestamp `T`. Create a Vendor PO in disposable data. Note the document number,
      case version, receipt, and audit row.
- [ ] Wait 10 minutes. Create a second Vendor PO.
- [ ] Clone to `T + 5 minutes`.
- [ ] Verify the clone contains the first Vendor PO and **not** the second. This proves the PITR
      window is real and the 5-minute RPO holds.
- [ ] Verify `pashx_support_schema_version` reads `1` in the clone.
- [ ] Verify `pashx_counter` in the clone does not allocate a number already used in the live
      instance for the same scope — if it does, note it: it is a real consideration for any
      restore that is promoted rather than discarded.
- [ ] Record: time to clone, time to verify, total elapsed, and whether RTO/RPO were met.
- [ ] Delete the clone.

## Known gaps

| Gap | Impact | Mitigation |
|---|---|---|
| PITR window is 7 days | Corruption discovered on day 8 is unrecoverable to a pre-corruption point | Daily backups still give 7 daily points; extend `sql_pitr_retention_days` before real data |
| **PITR has nightly and weekend gaps** because the instance is stopped outside working hours | A corruption introduced at 17:55 can only be recovered to a point before 18:00; anything "overnight" has no log to replay | Accepted for disposable pilot data. Before real data: set `schedule_enabled = false` and raise the budget, or record an explicit overnight RPO of "last backup" |
| Backups live in the same region as the instance | A regional outage takes both | Acceptable for a pilot. Before real data, add a scheduled `gcloud sql export` to a bucket in a second region |
| `ENCRYPTION_KEY` loss is unrecoverable | Encrypted field data is permanently unreadable | Export to an offline password manager before real data. Not automated here on purpose — automating a secret export creates the exposure it protects against |
| A promoted clone can re-allocate document numbers already issued by the live instance | Duplicate numbering after a promoted restore | Checked in the drill above. If promoting, reconcile `pashx_counter` against the highest issued number before resuming writes |
