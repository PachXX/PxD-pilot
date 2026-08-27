# Monitoring, logging, and alerts

- Node: CL0
- Owner: Claude Code
- Date: 2026-08-05
- Defined in: `infra/pashx-mab-gcp/terraform/monitoring.tf`

Every alert exists because a specific rollback trigger in the execution graph needs to be
detectable. An alert with no trigger behind it is noise and is not configured.

## Alert policies

| Alert | Condition | Rollback trigger it detects |
|---|---|---|
| `/healthz` failing | uptime check fails for 300s | "health checks fail for five minutes" |
| **Internal financial-command p95** | **PromQL p95 > 1000 ms over 10 m with ≥ 20 samples, held 300 s** | **"internal financial-command p95 exceeds one second excluding external providers"** |
| Single financial command over 2500 ms | any sample above the 2500 ms bucket in 10 m | low-volume safety net; not itself a trigger |
| Financial-command metric pipeline not reporting | `up{job="pashx-server"} == 0 or absent(...)` for 15 m | detector liveness; without it the two policies above can be silently blind |
| Application error rate elevated | ERROR-severity log volume > threshold for 300s | "application errors exceed 1%" |
| Possible secret in logs | any match on a credential pattern, 0s duration | "secrets appear in logs" |
| Cloud SQL connections near limit | `num_backends` > 160 of 200 for 300s | "database connections exhaust" |
| Cloud SQL disk utilisation high | > 85% for 600s | outage prevention, not a listed trigger |
| VM memory high | > 90% for 600s | early warning for the error-rate and latency triggers |

| Scheduled shutdown did not run | ERROR-severity execution of the shutdown workflow | cost control failed silently — the environment is running outside its window |

Notification channel: email to the address in `var.alert_email`. One channel for a
single-operator pilot; add a paging channel before real users.

### Three policies are disabled overnight, on purpose

The pilot is stopped outside 08:00–18:00 Asia/Riyadh, Sunday–Thursday
([`runbook-scheduled-shutdown.md`](runbook-scheduled-shutdown.md)). The shutdown workflow
disables `healthz_down`, `metric_pipeline_down`, and `sql_connections` before stopping anything,
and the startup workflow re-enables them only after `/healthz` returns 200.

All three detect "the environment is not answering", which is the *intended* state overnight.
Leaving them armed would page the operator nightly, and an alert that cries wolf every evening is
how the p95 rollback detector ends up muted.

Every other policy stays armed around the clock — including the p95 detector, the secret-leak
metric, the error-rate policy, and the Cloud SQL disk alert. None can produce a false positive
against a stopped environment, and keeping them live means a *partial* shutdown (VM down,
database still running) is still noticed.

## Uptime check

Probes `https://<host>/healthz` every 60 seconds from multiple regions with SSL validation on.
It exercises the whole external path — DNS, the static IP, the firewall, Caddy's certificate,
and the server container — so a certificate expiry or a firewall change is caught by the same
check as an application crash.

`/healthz` is Twenty's own endpoint and is the gate the CX0 contract uses before starting the
worker.

## Log-based metrics

### `pashx-mab-app-errors`

Counts `severity>=ERROR` entries from the application VM. Container logs reach Cloud Logging via
the `gcplogs` Docker driver configured in `deploy/pashx-mab/docker-compose.cloud.yml`, so server
and worker output is centralised without an in-container agent.

The threshold is on **volume**, not on a true error *rate*, because request-count and error-count
are not joinable in a single Monitoring condition. Treat a firing as "look now", then compute the
real percentage from the logs before deciding to roll back.

### `pashx-mab-possible-secret-in-logs`

Matches connection strings with an embedded password and `key=`/`secret=` assignments. Any
non-zero value is an incident.

This is a **detective** control. The preventive controls are stronger and are what actually keep
secrets out of logs:

- secrets live only in a tmpfs env file, never on disk;
- the startup script never echoes a fetched value;
- `30-put-secrets.sh` and `40-create-storage-hmac.sh` read from stdin or pipe from the API
  directly into Secret Manager, so no value reaches the shell history or `ps`;
- Terraform outputs expose no secret;
- Cloud SQL query insights runs with `record_client_address = false`.

The regex will not catch a novel format. It is a backstop, not a guarantee.

## Latency — the p95 rollback detector

**Closed by CL0-M1.** Full design in [`CL0-M1-p95-alert.md`](CL0-M1-p95-alert.md); the summary:

Codex's `pashx/financial-command/internal-duration-ms` histogram reaches Cloud Monitoring
through Twenty's existing Prometheus exporter on port 9464, an OpenTelemetry Collector on the
VM, and Google Managed Prometheus. A PromQL alert policy fires when p95 exceeds 1000 ms over a
10-minute window **with at least 20 samples**, held for 300 seconds.

The timer covers internal command work only — authorization, reconciliation, the workspace
transaction, numbering, and audit. External providers are outside it by construction, which is
what the graph's wording requires.

### The database signals are secondary, and must stay secondary

| Signal | Role |
|---|---|
| `financial_command_p95` PromQL policy | **Primary. The rollback detector.** |
| Cloud SQL Query Insights (`record_application_tags = true`) | **Secondary diagnostic** — identifies which query was slow *after* the detector fires |
| `log_min_duration_statement = 1000` | **Secondary diagnostic** — logs individual statements over one second |

Do not promote either database signal to the detector. They measure *statement* time, not
*command* time. One command runs several statements, so a command can breach one second without
any single statement doing so, and a slow statement inside a fast command is not a trigger.
Neither can exclude external provider time.

Their value is diagnostic and real: when the p95 policy fires, these are the first two places to
look. That ordering — detect on the command metric, diagnose on the database signals — is the
point.

## Log queries for evidence

Sanitized queries showing correlation IDs without secrets, as the CX0 contract requires.

Server and worker errors in the last hour:

```bash
gcloud logging read 'resource.type="gce_instance" AND severity>=ERROR' --project=<PROJECT> --freshness=1h --format="table(timestamp,jsonPayload.correlationId,severity,textPayload)" --limit=50
```

Trace one Vendor PO command by correlation ID:

```bash
gcloud logging read 'resource.type="gce_instance" AND jsonPayload.correlationId="<ID>"' --project=<PROJECT> --format="table(timestamp,severity,textPayload)" --limit=100
```

Migration and reconciliation activity:

```bash
gcloud logging read 'resource.type="gce_instance" AND (textPayload=~"migration" OR textPayload=~"reconcile")' --project=<PROJECT> --freshness=6h --limit=100
```

Confirm the secret-leak metric has never matched:

```bash
gcloud logging read 'resource.type="gce_instance" AND (textPayload=~"postgres://[^:]+:[^@]+@" OR textPayload=~"(?i)(app_secret|encryption_key|secret_access_key)\s*[=:]\s*\S+")' --project=<PROJECT> --freshness=7d --limit=10
```

Expect zero results. A non-empty result is an incident — see
[`runbook-rollback.md`](runbook-rollback.md) procedure E.

## VPC flow logs and firewall logging

Subnet flow logs sample at 50% with full metadata; all three firewall rules log. This is what
makes "Cloud SQL is not publicly reachable" auditable after the fact rather than only asserted
from configuration. Cost is small at pilot volume and is inside the $5 logging line in the cost
estimate.

## Retention and cost

Default Cloud Logging retention is 30 days in the `_Default` bucket, which outlasts the pilot.
No log sink to GCS or BigQuery is configured — at pilot volume it would add cost without adding
evidence. Add one before real MAB data, when audit-log retention becomes a compliance question
rather than a debugging convenience.

## Verification

- [ ] Run the p95 alert drill: `infra/pashx-mab-gcp/scripts/60-p95-alert-drill.sh <PROJECT> <ZONE>`.
      Phase C (the sample gate actually suppresses) matters most — see
      [`CL0-M1-p95-alert.md`](CL0-M1-p95-alert.md).
- [ ] Trigger the uptime alert deliberately: stop the Caddy container for six minutes, confirm
      the email arrives, restart it, confirm auto-close.
- [ ] Trigger the secret-leak metric with a harmless synthetic string matching the pattern in a
      log line, confirm the alert fires, then confirm the log entry is purged.
- [ ] Confirm the budget alert email arrives by temporarily setting the budget to $1 — then
      restore it. This is the only way to test a budget notification.
- [ ] Record all three in [`CL0-provisioning-evidence.md`](CL0-provisioning-evidence.md).
