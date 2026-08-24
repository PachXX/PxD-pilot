#!/usr/bin/env bash
# Enable the APIs the MAB pilot needs, and verify quotas afterwards.
#
# Enabling an API is NOT billable, so this is permitted before the H0 gate. It creates no
# resource. Google service agents may be auto-created; those are free.
#
# Usage: ./10-enable-apis.sh <project-id>

set -euo pipefail

PROJECT="${1:?usage: 10-enable-apis.sh <project-id>}"
export CLOUDSDK_CORE_DISABLE_PROMPTS=1

SERVICES=(
  compute.googleapis.com
  sqladmin.googleapis.com
  servicenetworking.googleapis.com
  secretmanager.googleapis.com
  artifactregistry.googleapis.com
  storage.googleapis.com
  logging.googleapis.com
  monitoring.googleapis.com
  cloudbilling.googleapis.com
  billingbudgets.googleapis.com
  oslogin.googleapis.com
  iap.googleapis.com
  iam.googleapis.com
  iamcredentials.googleapis.com
  cloudresourcemanager.googleapis.com
)

echo "Enabling ${#SERVICES[@]} services on ${PROJECT}"
gcloud services enable "${SERVICES[@]}" --project="$PROJECT"

echo
echo "Verifying quotas relevant to the pilot"
gcloud compute project-info describe --project="$PROJECT" \
  --format="table[box](quotas.metric,quotas.limit,quotas.usage)" \
  | grep -Ei 'CPUS|IN_USE_ADDRESSES|DISKS_TOTAL_GB|NETWORKS|SUBNETWORKS' || true

echo
echo "Billing account now readable:"
gcloud beta billing projects describe "$PROJECT" || {
  echo "WARNING: no billing account is linked to ${PROJECT}."
  echo "Link one before flipping h0_controls_recorded to true."
}
