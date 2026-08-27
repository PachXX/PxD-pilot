#!/usr/bin/env bash
# Create the GCS HMAC key pair that Twenty's S3 driver uses against the XML interoperability
# endpoint, and write both halves straight into Secret Manager.
#
# The secret half is printed by the API exactly once. This script pipes it into Secret Manager
# without ever displaying it. If you lose it, delete the key and create a new one — do not try
# to recover it.
#
# Usage: ./40-create-storage-hmac.sh <project-id>

set -euo pipefail

PROJECT="${1:?usage: 40-create-storage-hmac.sh <project-id>}"
PREFIX="pashx-mab"
SA="${PREFIX}-runtime@${PROJECT}.iam.gserviceaccount.com"

export CLOUDSDK_CORE_DISABLE_PROMPTS=1

echo "Creating an HMAC key for ${SA}"

# --format=json keeps the secret in a variable rather than on the terminal.
HMAC_JSON="$(gcloud storage hmac create "$SA" --project="$PROJECT" --format=json)"

ACCESS_ID="$(printf '%s' "$HMAC_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["metadata"]["accessId"])')"
SECRET="$(printf '%s' "$HMAC_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["secret"])')"

printf '%s' "$ACCESS_ID" | gcloud secrets versions add "${PREFIX}-storage-hmac-access-key" \
  --project="$PROJECT" --data-file=- >/dev/null
printf '%s' "$SECRET" | gcloud secrets versions add "${PREFIX}-storage-hmac-secret" \
  --project="$PROJECT" --data-file=- >/dev/null

unset HMAC_JSON SECRET

echo "  set ${PREFIX}-storage-hmac-access-key (access ID ends ...${ACCESS_ID: -4})"
echo "  set ${PREFIX}-storage-hmac-secret (value never displayed)"
echo
echo "To rotate later: gcloud storage hmac list --project=${PROJECT}, create a new key, update"
echo "both secrets, restart the VM, then deactivate and delete the old key."
