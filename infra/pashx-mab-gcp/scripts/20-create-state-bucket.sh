#!/usr/bin/env bash
# Create the Terraform remote state bucket. This is the ONE resource created outside Terraform,
# because Terraform cannot store its own state in a bucket it has not created yet.
#
# Cost: a few cents per month. It is billable, so run this only after the H0 gate is recorded.
#
# Usage: ./20-create-state-bucket.sh <project-id> <region>

set -euo pipefail

PROJECT="${1:?usage: 20-create-state-bucket.sh <project-id> <region>}"
REGION="${2:?usage: 20-create-state-bucket.sh <project-id> <region>}"
BUCKET="gs://${PROJECT}-pashx-mab-tfstate"

export CLOUDSDK_CORE_DISABLE_PROMPTS=1

if gcloud storage buckets describe "$BUCKET" --project="$PROJECT" >/dev/null 2>&1; then
  echo "State bucket already exists: ${BUCKET}"
  exit 0
fi

echo "Creating ${BUCKET} in ${REGION}"
gcloud storage buckets create "$BUCKET" \
  --project="$PROJECT" \
  --location="$REGION" \
  --uniform-bucket-level-access \
  --public-access-prevention

# Versioning is what makes a corrupted or truncated state recoverable.
gcloud storage buckets update "$BUCKET" --versioning --project="$PROJECT"

echo
echo "Terraform state contains the generated Cloud SQL password. This bucket must stay private."
echo "Now copy terraform/backend.tf.example to terraform/backend.tf, set bucket to:"
echo "  ${BUCKET#gs://}"
echo "then run: terraform init -migrate-state"
