#!/usr/bin/env bash
# Destroy the PashX MAB pilot environment.
#
# THIS IS DESTRUCTIVE AND IRREVERSIBLE FOR ANYTHING NOT ALREADY EXPORTED.
# Read docs/operations/pashx-mab-gcp/runbook-teardown.md before running it.
#
# Guardrails, in order:
#   1. Refuses to run against pashxd-e56c5 (the live PashxD product project).
#   2. Requires the operator to type the project id exactly.
#   3. Takes a final Cloud SQL export and lists the bucket before deleting anything.
#
# Usage: ./90-teardown.sh <project-id> <region>

set -euo pipefail

PROJECT="${1:?usage: 90-teardown.sh <project-id> <region>}"
REGION="${2:?usage: 90-teardown.sh <project-id> <region>}"
PREFIX="pashx-mab"

export CLOUDSDK_CORE_DISABLE_PROMPTS=1

# --- Guardrail 1: protected projects -----------------------------------------

PROTECTED=("pashxd-e56c5" "lynex-ai")
for p in "${PROTECTED[@]}"; do
  if [[ "$PROJECT" == "$p" ]]; then
    cat >&2 <<EOF
REFUSING TO RUN.

'${PROJECT}' is a protected project. It hosts live workloads (Cloud Run service pashxd-api,
five agent jobs, six enabled schedulers, Firebase Auth, and 13 production secrets).

If the MAB pilot really was provisioned into this project, tear it down resource by resource
with an explicit targeted 'terraform destroy -target=...' after a human review of the plan.
Never bulk-destroy here.
EOF
    exit 1
  fi
done

# --- Guardrail 2: explicit confirmation --------------------------------------

cat <<EOF
About to destroy the PashX MAB pilot in project: ${PROJECT} (${REGION})

This deletes:
  - the application VM and its static IP
  - the Cloud SQL instance, both databases, and all automated backups
  - the document bucket and every object version in it
  - Secret Manager secrets, service accounts, VPC, NAT, and firewall rules

Type the project id to confirm:
EOF
read -r CONFIRM
[[ "$CONFIRM" == "$PROJECT" ]] || { echo "Mismatch. Aborted."; exit 1; }

# --- Guardrail 3: final export ------------------------------------------------

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
EXPORT_BUCKET="gs://${PROJECT}-pashx-mab-tfstate"

echo
echo "Taking a final Cloud SQL export to ${EXPORT_BUCKET}/final-export-${STAMP}.sql.gz"
if gcloud sql instances describe "${PREFIX}-pg" --project="$PROJECT" >/dev/null 2>&1; then
  SQL_SA="$(gcloud sql instances describe "${PREFIX}-pg" --project="$PROJECT" \
    --format='value(serviceAccountEmailAddress)')"
  gcloud storage buckets add-iam-policy-binding "$EXPORT_BUCKET" \
    --member="serviceAccount:${SQL_SA}" --role=roles/storage.objectCreator --project="$PROJECT"
  gcloud sql export sql "${PREFIX}-pg" \
    "${EXPORT_BUCKET}/final-export-${STAMP}.sql.gz" \
    --database=twenty --project="$PROJECT"
  echo "Export complete."
else
  echo "No Cloud SQL instance found; skipping export."
fi

echo
echo "Objects currently in the document bucket:"
gcloud storage ls -r "gs://${PREFIX}-documents-${PROJECT}/**" --project="$PROJECT" 2>/dev/null | tail -20 || true
echo
echo "Last chance. Press Ctrl-C now to keep the environment. Continuing in 15 seconds."
sleep 15

# --- Destroy ------------------------------------------------------------------

cd "$(dirname "$0")/../terraform"

echo "Disabling Cloud SQL deletion protection"
terraform apply -auto-approve -var="sql_deletion_protection=false"

echo "Emptying and releasing the document bucket"
gcloud storage rm -r "gs://${PREFIX}-documents-${PROJECT}/**" --project="$PROJECT" 2>/dev/null || true

echo "terraform destroy"
terraform destroy -auto-approve

echo
echo "Teardown complete. Verifying nothing billable remains:"
gcloud compute instances list --project="$PROJECT" 2>&1 | tail -3
gcloud sql instances list --project="$PROJECT" 2>&1 | tail -3
gcloud compute addresses list --project="$PROJECT" 2>&1 | tail -3
gcloud storage buckets list --project="$PROJECT" --format='value(name)' 2>&1

echo
echo "The Terraform state bucket and the final export were intentionally left in place."
echo "Delete them manually once the export has been archived elsewhere."
