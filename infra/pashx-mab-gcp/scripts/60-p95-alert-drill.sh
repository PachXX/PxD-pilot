#!/usr/bin/env bash
# CL0-M1 — alert drill for the internal financial-command p95 rollback detector.
#
# Proves the WHOLE path end to end with real data:
#
#   Vendor PO command -> OTel histogram -> :9464 -> collector -> GMP -> PromQL -> policy -> email
#
# No synthetic metric injection. The drill lowers the threshold instead of faking latency, so
# every hop is the one that will run in production. It also proves the minimum-sample-count gate
# actually suppresses, which is the part most likely to be wrong.
#
# Requires a live environment. Run only against a disposable workspace and disposable data.
#
# Usage: ./60-p95-alert-drill.sh <project-id> <zone> [drill-threshold-ms]

set -uo pipefail

PROJECT="${1:?usage: 60-p95-alert-drill.sh <project-id> <zone> [drill-threshold-ms]}"
ZONE="${2:?}"
DRILL_MS="${3:-10}"
PREFIX="pashx-mab"

export CLOUDSDK_CORE_DISABLE_PROMPTS=1

TF_DIR="$(cd "$(dirname "$0")/../terraform" && pwd)"

section() { printf '\n========== %s ==========\n' "$1"; }

# ---------------------------------------------------------------------------
section "Phase A — discovery: confirm the metric actually arrived"
# ---------------------------------------------------------------------------
# Do this BEFORE trusting any alert. The collector pins the metric name with a relabel rule, but
# the rule only fires if the raw name matches one of its expected forms. If Twenty's OTel version
# changed the sanitisation, the series will be absent and every policy below is silently blind.

echo "Raw metric names on the server's Prometheus endpoint:"
gcloud compute ssh "${PREFIX}-app" --zone="$ZONE" --project="$PROJECT" --tunnel-through-iap \
  --command="docker compose -f /run/pashx-mab/docker-compose.yml exec -T server curl -s localhost:9464/metrics | grep -i 'pashx' | grep -v '^#' | cut -d'{' -f1 | sort -u" 2>&1

echo
echo "Series visible in Google Managed Prometheus (post-relabel):"
gcloud monitoring time-series list \
  --project="$PROJECT" \
  --filter='metric.type="prometheus.googleapis.com/pashx_financial_command_internal_duration_ms/histogram"' \
  --format='value(metric.type,resource.type)' 2>&1 | sort -u | head

cat <<'EOF'

Expected: the endpoint shows pashx_financial_command_internal_duration_ms_bucket/_count/_sum
(with or without a _milliseconds infix — the collector normalises it), and GMP shows the
normalised series.

If the GMP list is EMPTY:
  - check the collector:  docker compose logs otel-collector
  - check METER_DRIVER=prometheus is in /run/pashx-mab/app.env
  - allow up to 3 minutes for the first samples to land
Do not continue until this phase passes. An alert on an absent series never fires and looks
exactly like health.
EOF

read -rp $'\nPhase A passed? [yes/NO] ' OK
[[ "$OK" == "yes" ]] || { echo "Stopping. Fix the pipeline before drilling the alert."; exit 1; }

# ---------------------------------------------------------------------------
section "Phase B — arm the drill (threshold lowered, sample gate unchanged)"
# ---------------------------------------------------------------------------
# Lowering the threshold rather than injecting latency keeps the drill honest: the histogram,
# the collector, GMP, and the PromQL are all the production ones.

cd "$TF_DIR"
echo "Lowering p95_threshold_ms to ${DRILL_MS} (was 1000). p95_min_samples stays at its real value."
terraform apply -auto-approve -var="p95_threshold_ms=${DRILL_MS}" || {
  echo "Apply failed. Environment unchanged."; exit 1;
}

MIN_SAMPLES="$(terraform output -raw p95_min_samples 2>/dev/null || echo 20)"
WINDOW="$(terraform output -raw p95_window 2>/dev/null || echo 10m)"

# ---------------------------------------------------------------------------
section "Phase C — negative test: below the sample gate, must NOT fire"
# ---------------------------------------------------------------------------
cat <<EOF
Issue FEWER than ${MIN_SAMPLES} Vendor PO commands against the DISPOSABLE workspace
(twenty_test) — about $(( MIN_SAMPLES / 4 )) is a good number.

Every command will exceed the ${DRILL_MS}ms drill threshold, so the only thing keeping the alert
silent is the minimum-sample-count gate. That is exactly what this phase proves.

Wait ${WINDOW} plus the 300s alert duration, then confirm NO incident was opened.
EOF

read -rp $'\nPress enter once the commands are issued and the wait has elapsed... '

echo "Open incidents (expected: none):"
gcloud alpha monitoring policies list --project="$PROJECT" \
  --filter="displayName:'financial-command p95'" --format='value(name,enabled)' 2>&1
gcloud alpha monitoring incidents list --project="$PROJECT" 2>&1 | head -10 || \
  echo "(incident listing unavailable in this gcloud version — check the console)"

read -rp $'\nPhase C passed — the alert stayed silent below the sample gate? [yes/NO] ' OK_C

# ---------------------------------------------------------------------------
section "Phase D — positive test: above the sample gate, must fire"
# ---------------------------------------------------------------------------
cat <<EOF
Now issue MORE than ${MIN_SAMPLES} Vendor PO commands in the disposable workspace, inside one
${WINDOW} window. A simple loop of $(( MIN_SAMPLES + 10 )) creations is enough.

Expected within ${WINDOW} + 300s:
  - an incident opens on "${PREFIX} — internal financial-command p95 > ${DRILL_MS}ms"
  - an email arrives at the configured alert address
EOF

read -rp $'\nPress enter once the commands are issued and the wait has elapsed... '

echo "Open incidents (expected: one):"
gcloud alpha monitoring incidents list --project="$PROJECT" 2>&1 | head -10 || \
  echo "(check the console)"

read -rp $'\nPhase D passed — incident opened AND email received? [yes/NO] ' OK_D

# ---------------------------------------------------------------------------
section "Phase E — restore"
# ---------------------------------------------------------------------------
# Always runs, even if a phase failed. Leaving a 10ms threshold in place would bury the real
# signal under noise.

echo "Restoring p95_threshold_ms to its configured value."
terraform apply -auto-approve

echo "Confirming the restored threshold:"
gcloud alpha monitoring policies list --project="$PROJECT" \
  --filter="displayName:'financial-command p95'" --format='value(displayName)' 2>&1

# ---------------------------------------------------------------------------
section "Result"
# ---------------------------------------------------------------------------
printf 'Phase A (metric reaches GMP):        %s\n' "$OK"
printf 'Phase C (sample gate suppresses):    %s\n' "${OK_C:-not run}"
printf 'Phase D (fires and notifies):        %s\n' "${OK_D:-not run}"
echo
echo "Record this run in docs/operations/pashx-mab-gcp/CL0-M1-p95-alert.md under"
echo "\"Drill record\", including timestamps, command count, and observed incident latency."

[[ "$OK_C" == "yes" && "$OK_D" == "yes" ]]
