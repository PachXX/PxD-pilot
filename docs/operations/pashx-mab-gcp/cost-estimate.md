# CL0 — Cost summary

- Node: CL0
- Owner: Claude Code
- Date: 2026-08-05
- Basis: Google Cloud public list prices for `europe-west1`, on-demand, no committed-use
  discount, no free-tier credit assumed. Figures are USD per month at 730 hours.
- Status: **estimate, not measured.** Prices should be re-checked against the pricing calculator
  at the moment of apply — Google adjusts list prices without notice.

> [!warning] Currency, and a ceiling below the running cost
>
> **Billing account `0154D8-6A85C0-668177` bills in INR, not USD.** GCP publishes list prices in
> USD, so every figure in this document is USD and must be converted before it is compared with
> the budget. The first attempt to create the budget in USD failed with `INVALID_ARGUMENT` for
> exactly this reason.
>
> **The recorded ceiling is ₹9,000/month (~$100), set 2026-08-06 and scoped to
> `pashx-mab-pilot` alone.** In the recorded region `me-central2` the recommended tier costs
> ~$300/month ≈ **₹26,400** — about **2.9× the ceiling**. Even the lean tier (~$185 ≈ ₹16,300)
> is ~1.8× over.
>
> This was chosen deliberately as an early tripwire, not as a spending forecast. Expect the 50%
> and 80% alerts within days of apply and the 100% alert inside the first month of continuous
> running. See "Running inside ₹9,000" below for the configurations that actually fit.

The graph forbids creating billable resources before a budget ceiling is recorded. This document
exists to make that ceiling an informed number.

## Recommended tier — ~$246/month

Sized so the Twenty server, worker, and Redis coexist on one VM with headroom for the CL2
integration suite running concurrently.

| Resource | Spec | Monthly |
|---|---|---|
| Application VM | `e2-standard-4` (4 vCPU, 16 GB), on-demand | $110 |
| Boot disk | 50 GB `pd-balanced` | $5 |
| Cloud SQL PostgreSQL 16 | `db-custom-2-7680` (2 vCPU, 7.5 GB), ZONAL | $98 |
| Cloud SQL storage | 50 GB SSD | $9 |
| Cloud SQL backups | ~20 GB retained | $2 |
| GCS documents bucket | 50 GB Standard + versioning overhead | $2 |
| Artifact Registry | ~20 GB of pinned images | $2 |
| Static external IP | 1 in-use premium-tier address | $3 |
| Cloud NAT | gateway + ~50 GB processed | $5 |
| Egress | ~30 GB to internet | $4 |
| Secret Manager | 6 secrets + access operations | $1 |
| Logging / Monitoring | mostly inside the free allotment | $5 |
| **Total** | | **~$246** |

**Recommended budget ceiling: $350/month.** That is roughly 1.4× the estimate — enough headroom
for a busy CL2/CL3 week (extra Cloud Build minutes, extra egress, a second VM during a
blue/green rollback) without the ceiling firing on ordinary variance.

## Lean tier — ~$150/month

Viable for CL0/CL3 smoke work. `e2-standard-2` gives 8 GB for server + worker + Redis, which is
tight; expect the memory alert to fire during the CL2 concurrency suite.

| Change | Monthly |
|---|---|
| VM `e2-standard-2` instead of `e2-standard-4` | $55 (−$55) |
| Cloud SQL `db-custom-1-3840` instead of `db-custom-2-7680` | $50 (−$48) |
| Everything else unchanged | $45 |
| **Total** | **~$150** |

## Hardened tier — ~$430/month

Not recommended for the pilot. Listed so the delta is visible if MAB acceptance later demands it.

| Change | Monthly |
|---|---|
| Cloud SQL `REGIONAL` (HA standby) | +$107 |
| Memorystore Redis Basic 1 GB instead of containerized | +$35 |
| External HTTPS Application Load Balancer + managed cert instead of Caddy | +$25 |
| Cloud Armor baseline policy | +$17 |
| **Total** | **~$430** |

## Region — `me-central2` is now the recorded region

**Recorded 2026-08-06: `me-central2` (Dammam), zone `me-central2-a`.** Every USD figure in this
document was priced for `europe-west1` and must be adjusted upward.

`me-central2` runs roughly **20–25% above** `europe-west1` for compute and Cloud SQL:

| Tier | europe-west1 | me-central2 | me-central2 in INR |
|---|---|---|---|
| Recommended | ~$246 | **~$300** | **~₹26,400** |
| Lean | ~$150 | ~$185 | ~₹16,300 |
| Hardened | ~$430 | ~$525 | ~₹46,200 |

Against the recorded **₹9,000** ceiling the recommended tier is now about **2.9× over**, up from
2.4× in `europe-west1`. The scheduled-shutdown option below moves correspondingly: roughly
**₹7,000** rather than ₹5,800, so it still fits — but with less margin.

The region is immutable for Cloud SQL and the bucket. Changing it after apply is a rebuild, not
a migration, which is exactly why it was worth paying the delta up front.

## What is deliberately not in the estimate

- **Cloud Build minutes.** The monorepo image build on `E2_HIGHCPU_32` costs roughly $2–4 per
  cold build. Ten builds a month is ~$30 and is charged separately from the steady-state figure.
- **Idle-shutdown savings.** Superseded by "Running inside ₹9,000" below, which now costs this
  out properly. Short version: stopping the VM and Cloud SQL outside working hours is the only
  configuration that fits the recorded ceiling in `me-central2` without undersizing.
- **Data-transfer between the VM and Cloud SQL.** Same-region private IP traffic is free.
- **The existing `pashxd-e56c5` spend.** Unreadable, and out of scope: IDR-0001 recommends a
  separate project precisely so MAB cost is attributable on its own.

## Running inside ₹9,000 (~$100)/month

The ceiling is real, so here is what actually fits under it. The dominant fact is that **Cloud
SQL, not the VM, is the largest line**, and a stopped Cloud SQL instance still bills for storage.

### Option 1 — scheduled shutdown — **SELECTED 2026-08-06, implemented**

Run the VM and Cloud SQL only during working hours: 10 h/day × 22 days = 220 h of the 730 h month
(30%).

| Resource | Change | Monthly |
|---|---|---|
| VM `e2-standard-2`, stopped outside hours | $55 × 0.30 | $17 |
| Cloud SQL `db-custom-1-3840`, stopped outside hours | $50 × 0.30 | $15 |
| Cloud SQL storage (billed while stopped) | 50 GB SSD | $9 |
| Boot disk (billed while stopped) | 50 GB | $5 |
| Static IP, NAT, bucket, registry, secrets, logging, egress | unchanged | $20 |
| **Total** | | **~$66 ≈ ₹5,800** in europe-west1; **~$80 ≈ ₹7,000** in me-central2 |

**This is the recorded configuration.** Implemented in
`infra/pashx-mab-gcp/terraform/schedule.tf`; operating procedure in
[`runbook-scheduled-shutdown.md`](runbook-scheduled-shutdown.md). Schedule: 08:00–18:00
Asia/Riyadh, Sunday–Thursday. Sizing: `e2-standard-2` + `db-custom-1-3840`.

Costs of this choice, all handled and documented rather than discovered later:

- A cold start each morning; full startup is expected to take under ~12 minutes.
- **PITR has nightly and weekend gaps** — a stopped instance writes no transaction log, so the
  5-minute RPO holds only during running hours. Recorded in
  [`runbook-backup-restore.md`](runbook-backup-restore.md).
- The automated backup window had to move from 01:00 UTC (which fell inside the shutdown, so
  backups would silently never have run) to 05:30 UTC. A `guards.tf` precondition now fails the
  plan if it is ever moved back outside the window.
- Three availability alert policies are disabled overnight by the shutdown workflow and re-armed
  after `/healthz` passes.
- **Pause the schedule before CL2, CL3, and CX2.** A long integration run straddling 18:00 will
  be cut off mid-suite and look like an application defect.

### Option 2 — always-on minimum

| Resource | Change | Monthly |
|---|---|---|
| VM `e2-medium` (2 vCPU, 4 GB) | | $27 |
| Cloud SQL `db-g1-small` (shared core, 1.7 GB) | | $26 |
| Storage, disk, IP, NAT, registry, secrets, logging, egress | | $34 |
| **Total** | | **~$87 ≈ ₹7,700** in europe-west1; **~$106 ≈ ₹9,300** in me-central2 — i.e. this option no longer fits under the ceiling |

**In `me-central2` this no longer fits under ₹9,000**, and it was never a good option anyway:
4 GB must hold the Twenty server, worker, Redis, Caddy, and the OTel collector.
Expect the VM memory alert to fire and the CL2 concurrency suite to be unreliable. A shared-core
Cloud SQL tier will also distort the very p95 measurement CL0-M1 exists to take — latency
attributable to a throttled database is not the latency the rollback trigger is meant to detect.

### Option 3 — keep the recommended tier and raise the ceiling

₹27,000/month (~$305) matches the recommended tier's actual cost in `me-central2`. Change with one command:

```bash
gcloud billing budgets update a63f7501-68f3-4630-b44b-b12cc62ec353 --billing-account=0154D8-6A85C0-668177 --budget-amount=27000
```

**Recommended, and selected:** Option 1. It keeps the sizing that makes CL2 and the p95 detector
trustworthy, and buys the saving from scheduling rather than from undersizing. If the pilot needs
to be continuously available, prefer Option 3 over Option 2 — undersizing the database corrupts
the evidence the pilot exists to produce.

## Cost controls in the configuration

| Control | Where |
|---|---|
| Budget alerts at 50 / 80 / 100% actual and 100% forecast | `infra/pashx-mab-gcp/terraform/budget.tf` |
| `h0_controls_recorded` gate — no billable resource without a recorded ceiling | `variables.tf`, `network.tf` |
| Artifact Registry cleanup policy keeps only 10 recent versions | `secrets.tf` |
| GCS lifecycle deletes noncurrent versions after 30 days and keeps at most 3 | `storage.tf` |
| Cloud SQL `ZONAL`, not `REGIONAL` | `sql.tf` |
| Containerized Redis, not Memorystore | IDR-0001 |
| Proven teardown that verifies nothing billable remains | `scripts/90-teardown.sh` |

A GCP budget **does not cap spend** — there is no hard spend cap. The enforcement is human: on
the 100% alert, run the teardown runbook or downsize.
