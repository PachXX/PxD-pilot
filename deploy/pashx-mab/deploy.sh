#!/usr/bin/env bash
# Deploy a digest-pinned image to the PashX MAB application VM.
#
# The deploy mechanism is deliberately boring: update the Terraform variable, apply, and let the
# VM be recreated with a new startup script. That keeps "reproducible from checked-in
# configuration" true, and makes rollback a one-line variable change (runbook-rollback.md).
#
# Usage: ./deploy.sh <image-with-digest>
#   e.g. ./deploy.sh europe-west1-docker.pkg.dev/pashx-mab-pilot/pashx-mab-images/twenty-pashx@sha256:abc...

set -euo pipefail

IMAGE="${1:?usage: deploy.sh <image@sha256:...>}"

if [[ "$IMAGE" != *"@sha256:"* ]]; then
  echo "REFUSING: image must be digest-pinned, not tagged." >&2
  echo "A tag can be repointed; a digest cannot. CL3 evidence requires a digest." >&2
  exit 1
fi

TF_DIR="$(cd "$(dirname "$0")/../../infra/pashx-mab-gcp/terraform" && pwd)"
cd "$TF_DIR"

PREVIOUS="$(terraform output -raw deployed_image 2>/dev/null || \
  grep -E '^container_image' terraform.tfvars 2>/dev/null | cut -d'"' -f2 || echo "none")"

echo "Previous image: ${PREVIOUS}"
echo "New image:      ${IMAGE}"
echo
echo "Record the previous digest before continuing — it is the rollback target."
echo

terraform plan -var="container_image=${IMAGE}" -out=deploy.tfplan
echo
read -rp "Apply this plan? [yes/NO] " CONFIRM
[[ "$CONFIRM" == "yes" ]] || { echo "Aborted."; rm -f deploy.tfplan; exit 1; }

terraform apply deploy.tfplan
rm -f deploy.tfplan

SERVER_URL="$(terraform output -raw server_url)"

echo
echo "Waiting for ${SERVER_URL}/healthz"
for i in $(seq 1 60); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "${SERVER_URL}/healthz" || true)"
  if [[ "$CODE" == "200" ]]; then
    echo "healthy after $((i * 10))s"
    exit 0
  fi
  sleep 10
done

echo "FAILED: /healthz did not return 200 within 10 minutes." >&2
echo "This is a rollback trigger. Follow docs/operations/pashx-mab-gcp/runbook-rollback.md." >&2
exit 1
