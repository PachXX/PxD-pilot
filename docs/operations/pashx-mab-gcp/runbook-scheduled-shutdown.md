# Runbook — scheduled shutdown

- Node: CL0
- Owner: Claude Code
- Date: 2026-08-06
- Defined in: `infra/pashx-mab-gcp/terraform/schedule.tf` and `terraform/workflows/`
- Why it exists: it is the **only** configuration that fits the recorded ₹9,000/month ceiling in
  `me-central2`. See [`cost-estimate.md`](cost-estimate.md) § "Running inside ₹9,000".

## The schedule

| | |
|---|---|
| Up | 08:00 Asia/Riyadh, Sunday–Thursday (`0 8 * * 0-4`) |
| Down | 18:00 Asia/Riyadh, Sunday–Thursday (`0 18 * * 0-4`) |
| Running hours | 10 h × 22 days ≈ 220 h of a 730 h month (~30%) |
| Sizing while up | `e2-standard-2` VM, `db-custom-1-3840` Cloud SQL |
| Estimated cost | **~$80 ≈ ₹7,000/month** against a ₹9,000 ceiling |

Sunday–Thursday is the Saudi working week, matching `me-central2` and the MAB users. The
operator is in Europe/Berlin, one hour behind Riyadh.

`db-custom-1-3840` is a **dedicated**-core tier. The cheaper `db-g1-small` shared-core tier was
rejected: unpredictable CPU throttling would distort the very p95 that the CL0-M1 rollback
detector measures, and corrupting the pilot's own evidence to save $24/month is a bad trade.

## Mechanism

Two Cloud Workflows, each triggered by a Cloud Scheduler job.

```
08:00  scheduler ──► startup workflow
                       1. Cloud SQL activationPolicy = ALWAYS
                       2. poll until state = RUNNABLE   (up to 10 min)
                       3. start the VM
                       4. poll /healthz through public HTTPS  (up to 10 min)
                       5. re-enable the availability alert policies

18:00  scheduler ──► shutdown workflow
                       1. disable the availability alert policies
                       2. stop the VM   (graceful ACPI; containers close SQL connections)
                       3. wait 60 s
                       4. Cloud SQL activationPolicy = NEVER
```

**Why Workflows and not cron plus a GCE instance schedule.** A native
`google_compute_resource_policy` instance schedule handles the VM but cannot touch Cloud SQL —
and Cloud SQL is the larger cost line. Two independent mechanisms would then have no way to
express the ordering, and the ordering is load-bearing in both directions:

- **Startup:** the Twenty server runs database migrations at boot. Booting the VM before Cloud
  SQL is RUNNABLE means a crash loop, not a slow start.
- **Shutdown:** alerts must be silenced *before* the VM stops. Otherwise the operator is paged
  every single evening — and an alert that cries wolf nightly is how the p95 rollback detector
  ends up muted.

## Four things this schedule breaks if left unhandled

All four are handled. They are listed because each is silent, and anyone changing the schedule
needs to know they exist.

### 1. Automated backups would silently never run

Cloud SQL takes no automated backup while stopped, **and reports no error**. The original backup
window was 01:00 UTC = 04:00 Asia/Riyadh — squarely inside the shutdown period. Every backup
would have been skipped, and the first anyone would know is a restore that finds nothing.

Fixed: `sql_backup_start_time_utc` defaults to `05:30` UTC = 08:30 Riyadh, half an hour after
start. A precondition in `guards.tf` fails the plan if the backup window ever falls outside the
running window. Verified: `sql_backup_start_time_utc=01:00` and `=16:00` both fail the plan.

### 2. Availability alerts would fire nightly

`healthz_down`, `metric_pipeline_down`, and `sql_connections` all detect "the environment is
not answering", which is exactly the intended state overnight. The workflows disable and
re-enable precisely these three.

Deliberately **left armed**: the p95 detector, the slow-outlier policy, the secret-leak metric,
the error-rate policy, the Cloud SQL disk alert, and the budget alerts. None can produce a false
positive against a stopped environment, and leaving them armed means a *partial* shutdown — VM
down but database still running, say — is still noticed.

### 3. Point-in-time recovery has nightly gaps

PITR replays transaction logs, and a stopped instance produces none. **The 5-minute RPO in the
architecture overview holds only during running hours.** Overnight there is nothing to recover
to except the last backup.

For a pilot holding disposable data this is acceptable. It is **not** acceptable once real MAB
data exists — which interacts directly with the unresolved data-classification question in
[`IDR-0001`](IDR-0001-target-project-and-topology.md). Recorded in
[`runbook-backup-restore.md`](runbook-backup-restore.md).

### 4. A failed shutdown is invisible and expensive

If the shutdown workflow fails, the environment runs all night, every night, until someone reads
the bill. That is precisely the slow, silent overrun the ceiling exists to catch — and the
budget alert would only catch it days later.

Handled by the `scheduled shutdown did not run` alert policy, which watches for ERROR-severity
executions of the shutdown workflow and notifies the next morning. The shutdown scheduler job
also retries three times with backoff, where startup retries only once — a missed start is a
minor inconvenience, a missed stop costs money.

## Identity

`pashx-mab-scheduler@` runs both workflows under a **custom role** with exactly seven
permissions:

```
compute.instances.get / start / stop
cloudsql.instances.get / update
monitoring.alertPolicies.get / update
```

The obvious alternative — `roles/compute.instanceAdmin.v1` plus `roles/cloudsql.editor` — would
let an automation identity delete the database and rebuild the VM. Start/stop needs seven
permissions, so it gets seven.

## Operating it

Start now, off schedule:

```bash
gcloud workflows run pashx-mab-startup --location=me-central2 --project=pashx-mab-pilot
```

Stop now:

```bash
gcloud workflows run pashx-mab-shutdown --location=me-central2 --project=pashx-mab-pilot
```

Check what the last run did:

```bash
gcloud workflows executions list pashx-mab-shutdown --location=me-central2 --project=pashx-mab-pilot --limit=5
```

Confirm the current state of both resources:

```bash
gcloud compute instances describe pashx-mab-app --zone=me-central2-a --project=pashx-mab-pilot --format='value(status)'
```

```bash
gcloud sql instances describe pashx-mab-pg --project=pashx-mab-pilot --format='value(state,settings.activationPolicy)'
```

## Suspending the schedule

**Do this before CL2, CL3, and CX2.** A long integration run that straddles 18:00 Riyadh will be
cut off mid-suite, and the resulting failure will look like an application defect.

Pause both jobs for the duration:

```bash
gcloud scheduler jobs pause pashx-mab-shutdown --location=me-central2 --project=pashx-mab-pilot
```

```bash
gcloud scheduler jobs resume pashx-mab-shutdown --location=me-central2 --project=pashx-mab-pilot
```

Or disable the schedule entirely in Terraform with `schedule_enabled = false`, which removes the
workflows, jobs, and automation identity — verified to drop the plan from 89 resources to 78.
Remember that a permanently-on environment costs ~₹16,300/month against a ₹9,000 ceiling.

## Verification, once the environment exists

None of this has been executed — the environment does not exist yet. Run these at CL3 and record
the results in [`CL0-provisioning-evidence.md`](CL0-provisioning-evidence.md).

- [ ] Run the shutdown workflow by hand. Confirm the VM reaches `TERMINATED` and Cloud SQL
      reaches `STOPPED`, and that the three availability policies show `enabled: false`.
- [ ] Confirm no alert email arrives during the stopped period.
- [ ] Run the startup workflow by hand. Confirm the ordering actually held: Cloud SQL RUNNABLE
      before the VM started, and the alerts re-enabled only after `/healthz` returned 200.
- [ ] Time the full startup. If it exceeds ~12 minutes the polling limits need raising.
- [ ] Confirm an automated backup exists dated inside the running window — this is the check
      that proves problem 1 above is really fixed.
- [ ] Confirm the Twenty server recovered cleanly from the cold start: no failed migrations, and
      reconciliation still reports schema version `1`.
- [ ] Let one real overnight cycle run, then confirm the next morning that the environment came
      up unattended and no alert fired.
- [ ] After a full month, compare actual spend against ₹7,000 and record the variance.
