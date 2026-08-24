# Runbook — provision and deploy the PashX MAB pilot

- Node: CL0 (provision), consumed by CL3 (deploy)
- Owner: Claude Code
- Date: 2026-08-05
- Prerequisite reading: [`IDR-0001`](IDR-0001-target-project-and-topology.md),
  [`cost-estimate.md`](cost-estimate.md), [`iam-design.md`](iam-design.md),
  and `docs/execution/evidence/CX0-cloud-readiness.md`

Every command below takes an explicit `--project`. Do not rely on `gcloud config set project` —
the account holds five projects and one of them is live.

## Phase 0 — H0 gate (blocking, human)

**All six were recorded on 2026-08-06.** Full record with rationale:
[`H0-recorded-controls.md`](H0-recorded-controls.md).

| # | Input | Recorded value |
|---|---|---|
| 1 | Target project | ☑ `pashx-mab-pilot` (`673510652800`) — created, billing linked |
| 2 | Region | ☑ `me-central1`, zone `me-central1-a` — immutable after apply. **Not `me-central2`**: Dammam is a restricted region and every create there returned `403`, while all read-only checks passed (finding 14) |
| 3 | Public hostname | ☑ none; `nip.io` fallback (provisional — fine for test users, not for MAB) |
| 4 | Budget ceiling | ☑ ₹9,000/month, scoped to this project only |
| 5 | Data classification | ☑ `disposable` — enforced by `guards.tf`, not just documented |
| 6 | Deploy authority | ☑ `pashx-mab-deployer@` for CI; Shahil sole human (provisional) |

Sizing follows from 4: lean tier plus scheduled shutdown (~₹7,000/month). **Pause the schedule
before CL2, CL3, and CX2** — see [`runbook-scheduled-shutdown.md`](runbook-scheduled-shutdown.md).

**The gate is OPEN as of 2026-08-08** — the environment is provisioned and billing. It was flipped
deliberately, with Shahil's go-ahead, because that is the step that starts spending money.

`terraform.tfvars` still reads `h0_controls_recorded = false` and `container_image = ""`; the live
values are supplied as `-var` flags at apply time. **Consequence: an apply that omits those flags
plans a destroy of the entire environment**, because every billable resource multiplies its `count`
by `local.gate`. Always pass both, and always read the plan's destroy count before confirming. See
finding 19 in [`CL0-provisioning-evidence.md`](CL0-provisioning-evidence.md).

## Phase 1 — safe pre-work (permitted before the gate)

Nothing here is billable.

```bash
infra/pashx-mab-gcp/scripts/00-inventory.sh <PROJECT> <REGION>
```

```bash
infra/pashx-mab-gcp/scripts/10-enable-apis.sh <PROJECT>
```

**Probe the region with a real create, not a read.** Restricted regions such as `me-central2`
appear healthy to every read API — zones list as UP, machine types enumerate, `gcloud sql tiers
list` includes them, and `terraform plan` succeeds — and still refuse every create with
`403 Permission denied on 'locations/<region>'`. This cost the first apply attempt; see
[`BLOCKER-me-central2-region-access.md`](BLOCKER-me-central2-region-access.md).

```bash
gcloud compute addresses create regionprobe --region=<REGION> --project=<PROJECT> && gcloud compute addresses delete regionprobe --region=<REGION> --project=<PROJECT> -q
```

If that fails, stop: the region is not usable regardless of what the plan says.

Confirm quotas from the script output. The pilot needs 4 vCPU in one region, 1 in-use external
IP, and ~100 GB of persistent disk. New-project defaults (24 vCPU, 8 IPs) are comfortably above
this; if any line shows usage near limit, request an increase before continuing.

Validate the configuration with the gate still closed — this produces a plan that creates
nothing:

```bash
cd infra/pashx-mab-gcp/terraform && cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with the recorded values, leave `h0_controls_recorded = false`, then:

```bash
cd infra/pashx-mab-gcp/terraform && terraform init && terraform validate && terraform plan
```

Expected: `Plan: 19 to add, 0 to change, 0 to destroy.` — 18 `google_project_service` (enabling
an API is free) plus one `terraform_data` guard resource (local, no API call). **No billable
resource appears.** Verified 2026-08-06 with Terraform v1.15.8 and google provider 6.50.0.

If the plan shows any other resource type, the gate is open when it should not be — stop.

## Phase 2 — state backend

Billable (cents). Run only after the gate.

```bash
infra/pashx-mab-gcp/scripts/20-create-state-bucket.sh <PROJECT> <REGION>
```

Then copy `terraform/backend.tf.example` to `terraform/backend.tf`, set the bucket name it
printed, and migrate:

```bash
cd infra/pashx-mab-gcp/terraform && terraform init -migrate-state
```

## Phase 3 — plan review, then apply

Set `h0_controls_recorded = true` in `terraform.tfvars`, then produce a plan and read it before
applying. The graph requires that the plan and cost summary be reviewed before apply.

```bash
cd infra/pashx-mab-gcp/terraform && terraform plan -out=cl0.tfplan
```

Check in the plan output:

- Cloud SQL `ipv4_enabled = false` and `ssl_mode = "ENCRYPTED_ONLY"`.
- Cloud SQL `point_in_time_recovery_enabled = true`.
- Bucket `versioning.enabled = true`, `public_access_prevention = "enforced"`.
- The VM's `service_account.email` is `pashx-mab-runtime@…`, not `…-compute@developer`.
- No `roles/editor` or `roles/owner` binding is created.
- Resource count matches the cost estimate — an unexpected extra VM or a `REGIONAL` Cloud SQL
  means a variable is wrong.

```bash
cd infra/pashx-mab-gcp/terraform && terraform apply cl0.tfplan
```

First apply takes ~15 minutes; the Private Services Access peering and Cloud SQL creation
dominate. The VM will boot, fail its startup script with `container_image is empty`, and stay
up — that is expected until Phase 5.

## Phase 4 — secrets

```bash
infra/pashx-mab-gcp/scripts/30-put-secrets.sh <PROJECT> generate
```

```bash
infra/pashx-mab-gcp/scripts/40-create-storage-hmac.sh <PROJECT>
```

Verify that six secrets each have one enabled version. Never print a value:

```bash
for s in pg-database-url app-secret encryption-key fallback-encryption-key storage-hmac-access-key storage-hmac-secret; do gcloud secrets versions list "pashx-mab-$s" --project=<PROJECT> --format="value(name,state)" --limit=1; done
```

## Phase 5 — build and deploy the pinned image (CL3)

```bash
deploy/pashx-mab/build-and-push.sh <PROJECT> <REGION>
```

Record the printed `…@sha256:…` digest. Then:

```bash
deploy/pashx-mab/deploy.sh <IMAGE@sha256:...>
```

`deploy.sh` refuses a tag-only reference, prints the previous digest (the rollback target),
shows the plan, waits for confirmation, and then polls `/healthz` for ten minutes.

## Phase 6 — order-of-operations checks

This is the CX0 migration and reconciliation order. Do not reorder it.

1. Server starts as the **single** migration owner (`DISABLE_DB_MIGRATIONS=false`); the worker
   has migrations and cron registration disabled. Confirm both:

```bash
gcloud compute ssh pashx-mab-app --zone=<ZONE> --project=<PROJECT> --tunnel-through-iap --command="docker compose -f /run/pashx-mab/docker-compose.yml config | grep -A2 DISABLE_DB_MIGRATIONS"
```

2. `/healthz` passes through the external HTTPS boundary before the worker is considered up:

```bash
curl -sS -o /dev/null -w '%{http_code} %{ssl_verify_result}\n' https://<HOST>/healthz
```

3. Install/synchronize the PashX app into the **disposable** workspace. Never the pilot
   workspace, and never `twenty` when the test is destructive — use the `twenty_test` database.

4. Invoke the Vendor PO service boundary once against disposable data. It opens a dedicated
   workspace transaction and runs `PashxWorkspaceSchemaService.reconcileSupportTables` before its
   business transaction.

5. Confirm reconciliation recorded schema version `1`, then run it a second time and assert the
   second pass is a schema/data no-op.

6. Only then hand off to CL2 (Cloud SQL invariants) and CX2 (bilingual E2E).

## Phase 7 — Gate 0 storage compatibility suite

Required by the CX0 contract before any user document work. Run each through the deployed
application, not against GCS directly:

| # | Check | Pass condition |
|---|---|---|
| 1 | Server-side upload | object appears in the bucket |
| 2 | Server-side download | bytes match by checksum |
| 3 | Browser CORS preflight | `OPTIONS` returns the configured origin |
| 4 | Presigned direct `PUT` | upload succeeds from the browser |
| 5 | Presigned download or redirect | file opens without a credential |
| 6 | Delete | object becomes noncurrent, not gone (versioning) |
| 7 | Restart persistence | file survives `docker compose restart` and a VM recreate |
| 8 | Version recovery | a noncurrent version can be restored |
| 9 | Permission denial | an unauthenticated fetch of the object URL returns 403 |

If any of 1–9 fails, record the evidence and select an explicitly supported S3-compatible
fallback. Do not implement a native GCS driver during the pilot.

## Phase 8 — acceptance verification

```bash
infra/pashx-mab-gcp/scripts/50-verify-acceptance.sh <PROJECT> <REGION> <ZONE>
```

Paste the resulting table into
[`CL0-provisioning-evidence.md`](CL0-provisioning-evidence.md). A non-zero failure count blocks
the CL0 state change to `complete`.

## Phase 9 — rehearse the reversals before declaring done

CL0 acceptance requires that rollback, teardown, backup, and restore be *documented*; the SG
gate requires they be *proven*. Rehearse at least the restore and the rollback while the
environment still holds nothing but disposable data:

- [`runbook-backup-restore.md`](runbook-backup-restore.md) — clone-to-timestamp restore drill
- [`runbook-rollback.md`](runbook-rollback.md) — roll to the previous digest and back
- [`runbook-teardown.md`](runbook-teardown.md) — read it; run it only at end of pilot

## Rollback triggers — stop and go to the rollback runbook

From the execution graph. Any one of these:

authentication or the Vendor PO flow fails · any unauthorized write succeeds · duplicate
numbering · stale overwrite · idempotency mismatch · non-atomic rollback · reconciliation cannot
rerun · secrets appear in logs · database connections exhaust · health checks fail for five
minutes · application errors exceed 1% · internal financial-command p95 exceeds one second
excluding external providers.
