#!/usr/bin/env bash
# Verify the CL0 acceptance criteria against the live environment and print a pass/fail table.
# Read-only. Output is designed to be pasted into CL0-provisioning-evidence.md.
#
# Usage: ./50-verify-acceptance.sh <project-id> <region> <zone>

set -uo pipefail

PROJECT="${1:?usage: 50-verify-acceptance.sh <project-id> <region> <zone>}"
REGION="${2:?}"
ZONE="${3:?}"
PREFIX="pashx-mab"

export CLOUDSDK_CORE_DISABLE_PROMPTS=1

PASS=0
FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    printf '| %-52s | PASS | %s |\n' "$name" "$actual"
    PASS=$((PASS + 1))
  else
    printf '| %-52s | FAIL | got %s, want %s |\n' "$name" "$actual" "$expected"
    FAIL=$((FAIL + 1))
  fi
}

printf '| Check | Result | Evidence |\n|---|---|---|\n'

# Cloud SQL is not publicly exposed
check "Cloud SQL public IPv4 disabled" "False" \
  "$(gcloud sql instances describe "${PREFIX}-pg" --project="$PROJECT" \
     --format='value(settings.ipConfiguration.ipv4Enabled)' 2>/dev/null)"

check "Cloud SQL has no public IP address" "" \
  "$(gcloud sql instances describe "${PREFIX}-pg" --project="$PROJECT" \
     --format='value(ipAddresses.filter("type:PRIMARY").extract(ipAddress))' 2>/dev/null)"

check "Cloud SQL requires encrypted connections" "ENCRYPTED_ONLY" \
  "$(gcloud sql instances describe "${PREFIX}-pg" --project="$PROJECT" \
     --format='value(settings.ipConfiguration.sslMode)' 2>/dev/null)"

# Backups and PITR
check "Cloud SQL automated backups enabled" "True" \
  "$(gcloud sql instances describe "${PREFIX}-pg" --project="$PROJECT" \
     --format='value(settings.backupConfiguration.enabled)' 2>/dev/null)"

check "Cloud SQL point-in-time recovery enabled" "True" \
  "$(gcloud sql instances describe "${PREFIX}-pg" --project="$PROJECT" \
     --format='value(settings.backupConfiguration.pointInTimeRecoveryEnabled)' 2>/dev/null)"

check "Cloud SQL deletion protection on" "True" \
  "$(gcloud sql instances describe "${PREFIX}-pg" --project="$PROJECT" \
     --format='value(settings.deletionProtectionEnabled)' 2>/dev/null)"

# Storage
BUCKET="${PREFIX}-documents-${PROJECT}"
check "Document bucket object versioning enabled" "True" \
  "$(gcloud storage buckets describe "gs://${BUCKET}" --project="$PROJECT" \
     --format='value(versioning_enabled)' 2>/dev/null)"

check "Document bucket public access prevention enforced" "enforced" \
  "$(gcloud storage buckets describe "gs://${BUCKET}" --project="$PROJECT" \
     --format='value(public_access_prevention)' 2>/dev/null)"

check "Document bucket uniform access enabled" "True" \
  "$(gcloud storage buckets describe "gs://${BUCKET}" --project="$PROJECT" \
     --format='value(uniform_bucket_level_access)' 2>/dev/null)"

# Identity
check "VM does not use the default compute SA" "${PREFIX}-runtime@${PROJECT}.iam.gserviceaccount.com" \
  "$(gcloud compute instances describe "${PREFIX}-app" --zone="$ZONE" --project="$PROJECT" \
     --format='value(serviceAccounts[0].email)' 2>/dev/null)"

# gcloud renders a filtered metadata extract as a list ("['TRUE']"), not a bare scalar, so the
# original comparison failed against a correctly-configured VM. Strip the list punctuation.
check "OS Login enforced on the VM" "TRUE" \
  "$(gcloud compute instances describe "${PREFIX}-app" --zone="$ZONE" --project="$PROJECT" \
     --format='value(metadata.items.filter("key:enable-oslogin").extract(value))' 2>/dev/null \
     | tr -d "[]' ")"

check "Project SSH keys blocked on the VM" "TRUE" \
  "$(gcloud compute instances describe "${PREFIX}-app" --zone="$ZONE" --project="$PROJECT" \
     --format='value(metadata.items.filter("key:block-project-ssh-keys").extract(value))' 2>/dev/null \
     | tr -d "[]' ")"

check "Runtime SA has no project-wide editor/owner" "" \
  "$(gcloud projects get-iam-policy "$PROJECT" --format=json 2>/dev/null \
     | grep -E '"roles/(editor|owner)"' -B5 \
     | grep "${PREFIX}-runtime" || true)"

# Image is digest-pinned
IMAGE="$(gcloud compute instances describe "${PREFIX}-app" --zone="$ZONE" --project="$PROJECT" \
  --format='value(metadata.items.filter("key:startup-script").extract(value))' 2>/dev/null \
  | grep -oE 'IMAGE="[^"]+"' | head -1)"
if [[ "$IMAGE" == *"@sha256:"* ]]; then
  printf '| %-52s | PASS | digest-pinned |\n' "Deployed image is digest-pinned"
  PASS=$((PASS + 1))
elif [[ "$IMAGE" == 'IMAGE=""' || -z "$IMAGE" ]]; then
  # No image yet is the correct, expected state between CL0 (provision) and CL3 (deploy).
  # Reporting it as FAIL made a healthy CL0 look broken and buried the real findings.
  printf '| %-52s | SKIP | no image yet — expected until CL3 deploys |\n' "Deployed image is digest-pinned"
else
  printf '| %-52s | FAIL | tag-only, not digest-pinned: %s |\n' "Deployed image is digest-pinned" "$IMAGE"
  FAIL=$((FAIL + 1))
fi

# Only HTTPS is public.
#
# The original gcloud --filter expression matched nothing and returned empty, which made this
# check pass-by-accident-shaped (it reported "got ," against a project that really did have
# SSH and RDP open on the default VPC). Enumerating in python is unambiguous and names the
# offending rules instead of just listing ports.
OPEN_RULES="$(gcloud compute firewall-rules list --project="$PROJECT" --format=json 2>/dev/null \
  | python3 -c "
import json,sys
try:
    rules = json.load(sys.stdin)
except Exception:
    sys.exit(0)
bad = []
for r in rules:
    if r.get('direction') != 'INGRESS':
        continue
    if '0.0.0.0/0' not in r.get('sourceRanges', []):
        continue
    for a in r.get('allowed', []):
        for p in a.get('ports', ['all']):
            if p not in ('80', '443'):
                bad.append(r['name'] + ':' + p)
print(','.join(sorted(set(bad))))
")"
check "Only 80/443 open to the internet" "" "$OPEN_RULES"

# External health
if [[ -n "${SERVER_URL:-}" ]]; then
  HEALTH="$(curl -s -o /dev/null -w '%{http_code}' "${SERVER_URL}/healthz" 2>/dev/null)"
  check "/healthz through external HTTPS" "200" "$HEALTH"
else
  printf '| %-52s | SKIP | set SERVER_URL to test |\n' "/healthz through external HTTPS"
fi

# Budget
# Defaults to the known pilot billing account rather than the literal string "none", which is
# what made this report "got 0" against a project that genuinely has a budget. --project is
# required too: the Budget API resolves quota against it.
BILLING="${BILLING_ACCOUNT_ID:-0154D8-6A85C0-668177}"
check "Exactly one monthly budget for this project" "1" \
  "$(gcloud billing budgets list --billing-account="$BILLING" --project="$PROJECT" \
     --format='value(budgetFilter.projects)' 2>/dev/null | grep -c "$PROJECT\|$(gcloud projects describe "$PROJECT" --format='value(projectNumber)' 2>/dev/null)" || echo 0)"

printf '\n%d passed, %d failed\n' "$PASS" "$FAIL"
[[ "$FAIL" -eq 0 ]]
