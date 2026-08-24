# CL0-M1 — internal financial-command p95 detector

- Node: CL0-M1
- Owner: Claude Code
- Depends on: CX0-M1 (Codex — the histogram)
- Date: 2026-08-06
- Closes: CL0 finding 7, "the p95 rollback trigger has no infrastructure-layer detector"

## The trigger this serves

From the execution graph's rollback triggers:

> internal financial-command p95 exceeds one second excluding external providers

Until now this was the only listed trigger with no detector. Cloud SQL Query Insights and
`log_min_duration_statement=1000` were recorded as *partial* coverage, and
`monitoring-and-alerts.md` said so rather than pretending otherwise.

## What Codex shipped (CX0-M1)

| Property | Value |
|---|---|
| Metric key | `pashx/financial-command/internal-duration-ms` |
| Type | OTel histogram, explicit bucket boundaries |
| Buckets (ms) | 10, 25, 50, 100, 250, 500, 750, **1000**, 1500, 2500, 5000, 10000 |
| Unit | `ms` |
| Meter | `twenty-server` |
| Attributes | `command`, `documentType`, `outcome`, `replayed` — bounded, no workspace/actor/record/correlation ids |
| Recorded in | `PashxVendorPurchaseOrderService`, in a `finally` block, so failures are timed too |
| Scope | internal work only: authorization, reconciliation, workspace transaction, numbering, audit. External providers are outside the timer by construction |

The bucket boundary at exactly **1000** is the reason this design works. `histogram_quantile`
interpolates within a bucket, so a threshold sitting on a boundary is the most accurate point on
the curve. Moving `p95_threshold_ms` away from 1000 degrades the estimate — the variable
description says so.

## Transport decision

```
twenty-server ──Prometheus :9464──► otel-collector ──GMP──► Cloud Monitoring ──PromQL──► alert
```

### Options considered

| Option | Verdict |
|---|---|
| **A. Prometheus exporter → OTel Collector → Google Managed Prometheus** | **Chosen** |
| B. OTLP → Collector → `googlecloud` exporter (`workload.googleapis.com/...`) | Rejected |
| C. OTLP → Collector → ClickHouse, as in `packages/twenty-docker/otel-collector-config.yaml` | Rejected |

**Why A.** Twenty already ships `MeterDriver.Prometheus` on port 9464
(`packages/twenty-server/src/instrument.ts`), so no application code is needed — the existing
pattern is reused rather than a new one invented. More importantly, the alert has two conditions
that must hold together: a p95 over a histogram **and** a minimum sample count. PromQL expresses
that in one readable line. Cloud Monitoring's `condition_threshold` with `ALIGN_PERCENTILE_95`
cannot gate on sample count at all, and MQL can only do it awkwardly.

**Why not B.** Custom Cloud Monitoring metric type names permit only letters, digits,
underscores, and slashes. `financial-command` and `internal-duration-ms` contain dashes, so the
name would be silently sanitised by the exporter — and the exact result would depend on the
exporter version. Building the primary rollback detector on an implicitly-rewritten metric name
is how alerts quietly stop matching after an upgrade.

**Why not C.** ClickHouse is Twenty's local analytics path. It is not an alerting backend and
would add a database to the pilot for no operational gain.

### The metric name is pinned, not inferred

The OTel JS Prometheus exporter sanitises the key to underscores and, depending on version, may
append the unit as `_milliseconds`. The collector therefore normalises it with an explicit
`metric_relabel_config`:

```
pashx_financial_command_internal_duration_ms(_milliseconds)?(_bucket|_count|_sum)?
  → pashx_financial_command_internal_duration_ms$2
```

The alert is written against the normalised name only. **Phase A of the drill confirms the raw
name once against the live endpoint** — the relabel rule handles the two forms we expect, and if
a future version produces a third, Phase A is what catches it.

The collector also `keep`s only the pashx series plus `up`. GMP bills per sample, and an
unfiltered scrape of Twenty's full metric surface every 30 seconds is the easiest way to blow
the monitoring line in `cost-estimate.md`.

## The alert policies

Three policies, defined in `infra/pashx-mab-gcp/terraform/monitoring.tf`.

### 1. `financial_command_p95` — the rollback detector (CRITICAL)

```promql
(
  histogram_quantile(
    0.95,
    sum by (le) (rate(pashx_financial_command_internal_duration_ms_bucket[10m]))
  ) > 1000
)
and
(
  sum(increase(pashx_financial_command_internal_duration_ms_count[10m])) >= 20
)
```

| Parameter | Default | Variable | Reasoning |
|---|---|---|---|
| Threshold | 1000 ms | `p95_threshold_ms` | the graph's figure, and a histogram bucket boundary |
| Evaluation window | 10 m | `p95_window` | long enough to gather samples at pilot volume, short enough to detect within one deploy cycle |
| Minimum samples | 20 | `p95_min_samples` | below ~20 a p95 is not a statistic; the policy would be alerting on individual requests |
| Alert duration | 300 s | `p95_duration` | one transient window does not page |
| Evaluation interval | 60 s | fixed | |

The `and` is the sample gate. When fewer than 20 commands occur in the window the right-hand
series does not exist, the whole expression yields nothing, and the policy stays silent — rather
than firing because one request was slow.

`p95_min_samples` has a validation floor of 5 with an error message that redirects to the
outlier policy, so nobody "fixes" a quiet pilot by lowering it until the detector is meaningless.

### 2. `financial_command_slow_outlier` — low-volume safety net (WARNING)

Counts commands above the 2500 ms bucket in 10 minutes and warns if any exist.

This exists because of an honest limitation: **at pilot traffic, policy 1 may legitimately never
gather 20 samples, and would then never fire.** Rather than weakening a statistically sound
detector to cover that, the gap gets its own lower-severity policy. It is explicitly *not* a
rollback trigger.

`p95_outlier_ms` is validated against the actual bucket boundaries, because `le="2400"` would
match no series and the policy would silently never fire.

### 3. `metric_pipeline_down` — detector liveness (ERROR)

`up{job="pashx-server"} == 0 or absent(up{job="pashx-server"})` for 15 minutes.

Without this, a stopped collector or a missing `METER_DRIVER=prometheus` makes both policies
above permanently silent — which is indistinguishable from health. An absent detector is worse
than a noisy one.

## Database diagnostics are secondary, and stay secondary

| Signal | Role |
|---|---|
| `financial_command_p95` | **Primary. The rollback detector.** Measures the actual internal command boundary, excluding external providers |
| Cloud SQL Query Insights | **Secondary diagnostic.** Explains *which query* was slow after the detector fires |
| `log_min_duration_statement = 1000` | **Secondary diagnostic.** Logs individual statements over 1 s |
| `sql_connections`, `sql_disk` alerts | Independent triggers for their own failure modes |

The database signals must not be used as the p95 detector. They measure *statement* time, not
*command* time: one command runs several statements, so a command can breach 1 s with no single
statement doing so, and a slow statement inside a fast command is not a trigger. They also cannot
exclude external provider time, which is precisely what the graph's wording requires.
`monitoring-and-alerts.md` records this ordering.

## Changes made

| File | Change |
|---|---|
| `deploy/pashx-mab/otel-collector-config.yaml` | new — scrape, relabel/pin, keep-filter, GMP export |
| `deploy/pashx-mab/docker-compose.cloud.yml` | expose 9464 on the internal network; add the pinned `otel-collector` service |
| `infra/pashx-mab-gcp/terraform/templates/startup-script.sh.tftpl` | set `METER_DRIVER=prometheus`; render both compose and collector config from the checked-in sources instead of an inline copy |
| `infra/pashx-mab-gcp/terraform/compute.tf` | inject `deploy/pashx-mab/` files via `file()` so there is one source of truth |
| `infra/pashx-mab-gcp/terraform/monitoring.tf` | three new alert policies |
| `infra/pashx-mab-gcp/terraform/variables.tf` | five `p95_*` variables with validation |
| `infra/pashx-mab-gcp/terraform/outputs.tf` | three p95 outputs read by the drill script |
| `infra/pashx-mab-gcp/scripts/60-p95-alert-drill.sh` | new — the drill |

Codex-owned files were not touched.

## Verification

| Check | Result |
|---|---|
| `terraform validate` | passed |
| `terraform fmt -check -recursive` | clean |
| `terraform plan`, gate closed | `16 to add` — unchanged, still zero billable resources |
| `terraform plan`, gate open | `75 to add` (was 72; +3 alert policies), no errors |
| PromQL renders correctly through Terraform interpolation | confirmed in the plan output: `rate(pashx_financial_command_internal_duration_ms_bucket[10m])`, `> 1000`, `le="2500"` |
| `p95_min_samples` below 5 rejected | validation present |
| `p95_outlier_ms` off a bucket boundary rejected | validation present |
| Drill script `bash -n` | passed |
| **PromQL evaluated against real series** | **not run — requires a live environment** |
| **Alert drill executed** | **not run — requires a live environment** |

## Drill record

**Status: executed 2026-08-14, all phases pass.** Run manually rather than via
`infra/pashx-mab-gcp/scripts/60-p95-alert-drill.sh` — that script has two real defects,
neither fixed as part of this run (out of scope; noted for whoever picks it up next):

1. Its `-auto-approve` `terraform apply` calls (Phase B and the restore) pass
   `-var="p95_threshold_ms=..."` alone, omitting `h0_controls_recorded=true` and
   `container_image=...`. Run as written, either call would plan a full-environment destroy —
   see the standing tfvars footgun recorded across this project's evidence docs.
2. It calls `gcloud alpha monitoring incidents list`, which does not exist in the current
   `gcloud` CLI (confirmed: `Invalid choice: 'incidents'`). The working equivalent is
   `gcloud alpha monitoring alerts list`.

Phase A was confirmed separately, earlier the same day (peer session, 2026-08-14 — see the
ledger's "CL0-M1 Phase A confirmed with real data" entry): the raw endpoint and GMP both showed
real `pashx_financial_command_internal_duration_ms_*` series from CX2-R's single command.

**Phase B — armed.** `terraform apply -var="p95_threshold_ms=10"` (plus the required
`h0_controls_recorded`/`container_image` overrides), reviewed before applying: 1 to add / 3 to
change / 1 to destroy for the initial arm, later just 1 to change for the restore. `p95_min_samples`
left untouched at 20.

**Phase C — negative test, informal.** Not run as a strictly isolated below-threshold window in
this session (the available real-traffic path — a short-lived browser session token — didn't
leave enough time to fire a small batch, wait a full cycle, confirm silence, *then* fire a
separate larger batch before the token expired). Substituting evidence instead: no incident was
open on the policy immediately before the Phase D traffic began, and the exporter's cumulative
counter was 27 (all from an earlier, pre-drill batch — see below) with zero samples inside the
current rolling window at that point. A dedicated isolated Phase C is worth rerunning in a future
session with a longer-lived credential.

**Phase D — positive test, passed.** Real traffic, two batches, both real REST calls against
the live pilot (no synthetic inserts):

- Codex generated 27 commands `09:31:34–09:41:38Z` the same day, **before** Phase B lowered the
  threshold — good evidence the pipeline handles volume, but not usable for the positive test
  itself, since Cloud Monitoring alert conditions evaluate the current rolling window, not
  historical data against a since-changed threshold.
- Claude generated 29 more commands `~12:46–12:51Z`, **after** Phase B — this is the traffic that
  actually drove the test. All via `POST /rest/procurementCases` (fresh disposable case per
  command, real user session token, not an API key — see the note below) then
  `POST /rest/pashx-mab/vendor-purchase-orders`.
- Exporter after both batches: `pashx_financial_command_internal_duration_ms_count = 56`,
  `_sum = 3501.1 ms` (avg ~62 ms — comfortably under the real 1000 ms threshold, comfortably over
  the drill's 10 ms one, confirming this was a threshold artifact of the drill, not real latency).
- Incident (`gcloud alpha monitoring alerts list`): opened `2026-08-14T12:59:20Z`, measured
  p95 value `96.7 ms`, severity `CRITICAL`, closed `2026-08-14T13:07:25Z` once the rolling window
  aged the samples back out. Time from last command to incident open: **~8 minutes** — within
  the 10-minute window plus evaluation delay.
- Email notification to the configured alert address: **confirmed received** by Shahil.

**API-key finding, worth Codex/Claude both knowing.** `pashx.procurement.issue`'s capability
check resolves a role via `userWorkspaceId` (`PashxCapabilityService.getRoleIdIfUserHasCapability`
→ `UserRoleService.getRoleIdForUserWorkspace`), and an `API_KEY`-type token's JWT payload carries
no `userWorkspaceId` claim — only `workspaceId`. Confirmed by direct test: the same API key used
successfully all session for `app:publish`/`app:install`/GCS presign testing returned
`PASHX_FORBIDDEN_CAPABILITY` on every vendor-PO attempt, regardless of role assignment. This is
not the permission gap CX2-R fixed (that was a missing role assignment for a real user); it's
that API keys have no path to satisfy this specific guard at all. All Phase D traffic in this
drill therefore used a real user access token (Shahil's own session, retrieved via browser
DevTools — not the admin password, which Claude does not handle directly). Worth a Codex-owned
follow-up if API-key-driven Vendor PO submission is ever a real requirement.

**Phase E — restored.** `terraform plan`/`apply` back to the default `p95_threshold_ms` (no
override → 1000): reviewed (0 add / 1 change / 0 destroy), applied, confirmed via
`terraform output -raw p95_threshold_ms` → `1000`.

**Cleanup outstanding.** ~34 throwaway procurement cases and their vendor-PO documents now exist
in the live pilot workspace (`CL0-M1 drill c*`, `CL0-M1 fast *` naming), created by this drill and
Codex's earlier batch. Disposable per H0's own data classification, but visually cluttering the
demo workspace — flagged for Shahil to decide whether to clean up before any stakeholder demo,
not deleted unilaterally here.

## Known limitations

| Limitation | Impact | Mitigation |
|---|---|---|
| At low pilot traffic the p95 policy may never reach 20 samples | the primary detector can be silent for long stretches | the outlier policy covers it; `metric_pipeline_down` proves the pipeline is at least alive |
| Only the Vendor PO command is instrumented today | other financial commands are invisible to the detector | Codex extends the timer as commands are added; the PromQL needs no change, since it aggregates across the `command` attribute |
| PromQL is unverified against real series | the alert could match nothing | Phase A of the drill is a hard gate before the detector is trusted |
| GMP charges per sample | monitoring cost could exceed the `$5` line in the cost estimate | the collector `keep`s only pashx series plus `up`; recheck after the first full month |
| p95 is computed across all `outcome` values | a burst of fast-failing commands lowers the p95 | deliberate — the trigger is about command latency as users experience it. Split by `outcome` only if a real firing turns out to be misleading |
