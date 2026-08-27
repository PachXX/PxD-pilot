#!/usr/bin/env bash
# Populate the operator-supplied Secret Manager values.
#
# Design rule: secret VALUES never reach Terraform state, the repository, a tfvars file, a
# command-line argument (visible in `ps`), a shell history entry, or a chat transcript.
# Values are read from stdin with echo disabled, or generated locally with openssl.
#
# Usage:
#   ./30-put-secrets.sh <project-id> generate   # generate APP_SECRET and the encryption keys
#   ./30-put-secrets.sh <project-id> prompt     # type each value at a silent prompt
#
# The two storage HMAC values come from 40-create-storage-hmac.sh, not from here.

set -euo pipefail

PROJECT="${1:?usage: 30-put-secrets.sh <project-id> <generate|prompt>}"
MODE="${2:?usage: 30-put-secrets.sh <project-id> <generate|prompt>}"
PREFIX="pashx-mab"

export CLOUDSDK_CORE_DISABLE_PROMPTS=1

put() {
  local name="$1"
  local value="$2"
  printf '%s' "$value" | gcloud secrets versions add "${PREFIX}-${name}" \
    --project="$PROJECT" --data-file=- >/dev/null
  echo "  set ${PREFIX}-${name} (value not shown)"
  unset value
}

case "$MODE" in
  generate)
    echo "Generating random values locally with openssl. Nothing is printed."
    put app-secret "$(openssl rand -base64 32)"
    put encryption-key "$(openssl rand -base64 32)"
    put fallback-encryption-key "$(openssl rand -base64 32)"
    ;;
  prompt)
    for name in app-secret encryption-key fallback-encryption-key; do
      read -rsp "Value for ${PREFIX}-${name}: " value
      echo
      [[ -n "$value" ]] || { echo "empty value refused"; exit 1; }
      put "$name" "$value"
      unset value
    done
    ;;
  *)
    echo "mode must be 'generate' or 'prompt'" >&2
    exit 1
    ;;
esac

echo
echo "Verifying that versions exist (names and metadata only):"
for name in app-secret encryption-key fallback-encryption-key; do
  gcloud secrets versions list "${PREFIX}-${name}" --project="$PROJECT" \
    --format="value(name,state,createTime)" --limit=1
done
