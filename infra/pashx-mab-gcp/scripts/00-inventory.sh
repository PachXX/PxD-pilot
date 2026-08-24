#!/usr/bin/env bash
# Read-only inventory of a GCP project. Creates, modifies, and deletes nothing.
# Safe to run before the H0 gate. Re-run to refresh
# docs/operations/pashx-mab-gcp/inventory-<date>.md.
#
# Usage: ./00-inventory.sh <project-id> [region]

set -uo pipefail

PROJECT="${1:?usage: 00-inventory.sh <project-id> [region]}"
REGION="${2:-europe-west1}"

export CLOUDSDK_CORE_DISABLE_PROMPTS=1

section() { printf '\n=== %s ===\n' "$1"; }

section "identity"
gcloud auth list 2>&1

section "project"
gcloud projects describe "$PROJECT" 2>&1
gcloud projects get-ancestors "$PROJECT" 2>&1

section "billing"
gcloud beta billing projects describe "$PROJECT" 2>&1

section "enabled services"
gcloud services list --enabled --project="$PROJECT" 2>&1

section "iam policy"
gcloud projects get-iam-policy "$PROJECT" --format=json 2>&1

section "service accounts"
gcloud iam service-accounts list --project="$PROJECT" 2>&1

section "compute instances"
gcloud compute instances list --project="$PROJECT" 2>&1

section "networks and firewalls"
gcloud compute networks list --project="$PROJECT" 2>&1
gcloud compute firewall-rules list --project="$PROJECT" 2>&1

section "cloud sql"
gcloud sql instances list --project="$PROJECT" 2>&1

section "buckets"
gcloud storage buckets list --project="$PROJECT" 2>&1

section "artifact registry"
gcloud artifacts repositories list --project="$PROJECT" 2>&1

section "secrets (names only, never values)"
gcloud secrets list --project="$PROJECT" 2>&1

section "cloud run services and jobs"
gcloud run services list --project="$PROJECT" 2>&1
gcloud run jobs list --project="$PROJECT" 2>&1

section "cloud scheduler"
gcloud scheduler jobs list --location="$REGION" --project="$PROJECT" 2>&1

section "quotas"
gcloud compute project-info describe --project="$PROJECT" \
  --format="table(quotas.metric,quotas.limit,quotas.usage)" 2>&1

printf '\n=== done — nothing was created, modified, or deleted ===\n'
