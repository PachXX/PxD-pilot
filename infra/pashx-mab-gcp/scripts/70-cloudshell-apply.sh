#!/usr/bin/env bash
# CL0 apply, from Cloud Shell. One command.
#
# Run from the extracted bundle root (the directory containing infra/ and deploy/):
#
#   bash infra/pashx-mab-gcp/scripts/70-cloudshell-apply.sh
#
# Cloud Shell is the right place for this: credentials are already present, and it has none of
# the disk or load pressure of the workstation. Terraform is NOT pre-installed — a first run of
# this script found that out the hard way: `terraform` resolves to a Cloud Shell stub that prints
# an install nag and exits 0, which is indistinguishable from success by exit code alone. This
# script now verifies the binary is real before trusting anything it reports.
#
# What it does, in order:
#   1. Sanity-check the environment and the target project. Install Terraform if the `terraform`
#      on PATH is not functional (checked by output, not by exit code).
#   2. Probe the region with a REAL create-and-delete. A read-only check is not proof —
#      me-central2 passed every read check and refused every create.
#   3. Create the Terraform state bucket, if absent.
#   4. terraform init against that bucket.
#   5. Adopt the budget that already exists, so apply does not create a duplicate — and CONFIRM
#      it landed in state rather than trusting the import command's exit code.
#   6. Plan, show a summary, and ask once before applying.
#   7. Apply, then print the outputs that CL3 needs.
#
# It creates billable infrastructure. It asks before doing so.

set -euo pipefail

PROJECT="pashx-mab-pilot"
REGION="me-central1"
ZONE="me-central1-a"
BILLING="0154D8-6A85C0-668177"
BUDGET_ID="a63f7501-68f3-4630-b44b-b12cc62ec353"
PREFIX="pashx-mab"
STATE_BUCKET="${PROJECT}-${PREFIX}-tfstate"

export CLOUDSDK_CORE_DISABLE_PROMPTS=1

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
die() { printf '\n\033[31mFAILED: %s\033[0m\n' "$1" >&2; exit 1; }

TF_DIR="$(cd "$(dirname "$0")/../terraform" && pwd)"
ROOT="$(cd "$TF_DIR/../../.." && pwd)"

# --- 1. Environment -----------------------------------------------------------

say "Environment"

# `command -v terraform` is not sufficient: Cloud Shell puts a stub named `terraform` on PATH
# that prints an apt-install nag and exits 0 when the real binary is absent. That exit code is
# indistinguishable from success, which is exactly what made the first run of this script look
# like it had run `terraform plan` when it had not. The functional check is the output, not the
# exit code: real Terraform's first line of `terraform version` starts with "Terraform v".
terraform_is_real() {
  command -v terraform >/dev/null 2>&1 || return 1
  terraform version 2>/dev/null | head -1 | grep -q '^Terraform v'
}

if terraform_is_real; then
  echo "terraform already functional: $(terraform version | head -1)"
else
  echo "terraform on PATH is not functional (Cloud Shell's install stub, most likely)."
  echo "Installing a pinned, checksum-verified binary to ~/bin instead of using apt/sudo."

  TF_VERSION="1.15.8"
  TF_ARCH="$(uname -m)"
  case "$TF_ARCH" in
    x86_64)  TF_ARCH="amd64" ;;
    aarch64) TF_ARCH="arm64" ;;
    *) die "unrecognized architecture '$TF_ARCH' for the Terraform download" ;;
  esac

  TMP="$(mktemp -d)"
  ZIP="terraform_${TF_VERSION}_linux_${TF_ARCH}.zip"
  curl -fsSL -o "$TMP/$ZIP" "https://releases.hashicorp.com/terraform/${TF_VERSION}/${ZIP}" \
    || die "download failed"
  curl -fsSL -o "$TMP/SHA256SUMS" "https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_SHA256SUMS" \
    || die "checksum file download failed"

  (cd "$TMP" && grep " ${ZIP}\$" SHA256SUMS | sha256sum -c -) \
    || die "checksum verification FAILED for $ZIP — refusing to install an unverified binary"

  mkdir -p "$HOME/bin"
  unzip -o -q "$TMP/$ZIP" -d "$HOME/bin"
  chmod +x "$HOME/bin/terraform"
  export PATH="$HOME/bin:$PATH"
  rm -rf "$TMP"

  terraform_is_real || die "installed a terraform binary but it still does not report a version. Something is wrong with the install, not with your account or the plan."
  echo "installed: $(terraform version | head -1)"
fi
gcloud version 2>/dev/null | head -1
echo "active account: $(gcloud config get-value account 2>/dev/null)"

# compute.tf reads deploy/pashx-mab/ via a relative path. If the bundle was extracted without it,
# the plan fails late and confusingly. Check now.
[[ -f "$ROOT/deploy/pashx-mab/docker-compose.cloud.yml" ]] \
  || die "deploy/pashx-mab/docker-compose.cloud.yml not found at $ROOT. Extract the whole bundle, not just infra/."
[[ -f "$ROOT/deploy/pashx-mab/otel-collector-config.yaml" ]] \
  || die "deploy/pashx-mab/otel-collector-config.yaml missing. Extract the whole bundle."

gcloud projects describe "$PROJECT" --format='value(projectId,lifecycleState)' \
  || die "cannot see project $PROJECT"

# --- 2. Region write-probe ----------------------------------------------------
# The check that would have caught the me-central2 failure. Read APIs lie; creates do not.

say "Region write-probe: $REGION"
if gcloud compute addresses create regionprobe --region="$REGION" --project="$PROJECT" >/dev/null 2>&1; then
  gcloud compute addresses delete regionprobe --region="$REGION" --project="$PROJECT" -q >/dev/null 2>&1
  echo "  $REGION accepts creates — OK"
else
  die "$REGION refused a static IP create. The region is not usable by this account, whatever the plan says."
fi

# --- 3. State bucket ----------------------------------------------------------

say "Terraform state bucket"
if gcloud storage buckets describe "gs://${STATE_BUCKET}" --project="$PROJECT" >/dev/null 2>&1; then
  echo "  gs://${STATE_BUCKET} already exists"
else
  gcloud storage buckets create "gs://${STATE_BUCKET}" \
    --project="$PROJECT" --location="$REGION" \
    --uniform-bucket-level-access --public-access-prevention
  # Versioning is what makes a truncated or corrupted state recoverable. State contains the
  # generated Cloud SQL password, so this bucket is a secret and must stay private.
  gcloud storage buckets update "gs://${STATE_BUCKET}" --versioning --project="$PROJECT"
  echo "  created gs://${STATE_BUCKET}"
fi

# --- 4. Init ------------------------------------------------------------------

say "terraform init"
cd "$TF_DIR"

cat > backend.tf <<EOF
terraform {
  backend "gcs" {
    bucket = "${STATE_BUCKET}"
    prefix = "pashx-mab-gcp"
  }
}
EOF

[[ -f terraform.tfvars ]] || cp terraform.tfvars.example terraform.tfvars

terraform init -input=false -upgrade
terraform validate || die "configuration is invalid"

# --- 5. Adopt the existing budget ---------------------------------------------
# The budget was created out of band on 2026-08-06 because the ceiling was needed before the
# gate opened. Without this import the apply creates a SECOND budget over the same project.

say "Adopt the existing budget"

# Verify against terraform state list, not against the import command's exit code. That
# distinction is the whole point after the Cloud Shell stub incident: a fake terraform binary
# exits 0 on everything, so "the import command returned success" is not evidence the budget is
# actually in state. Only re-listing state and finding the resource there counts as evidence.
if terraform state list 2>/dev/null | grep -q 'google_billing_budget.pilot'; then
  echo "  already in state"
else
  # Flags MUST precede the positional ADDR/ID arguments — `terraform import [options] ADDR ID`
  # does not intermix them. Putting -var after ID (the original bug here) makes Terraform treat
  # it as a third positional argument and fail with "Wrong number of arguments", which silently
  # skipped the import and let a real `terraform apply` create a SECOND live budget instead.
  terraform import -input=false -var="h0_controls_recorded=true" \
    'google_billing_budget.pilot[0]' \
    "billingAccounts/${BILLING}/budgets/${BUDGET_ID}" || true

  if terraform state list 2>/dev/null | grep -q 'google_billing_budget.pilot'; then
    echo "  confirmed in state: budget ${BUDGET_ID}"
  else
    echo "  WARNING: import did not land in state. The plan below may show a SECOND"
    echo "  google_billing_budget being created. If it does, STOP — do not apply — and"
    echo "  import it by hand: terraform import 'google_billing_budget.pilot[0]' \\"
    echo "    billingAccounts/${BILLING}/budgets/${BUDGET_ID}"
  fi
fi

# --- 6. Plan ------------------------------------------------------------------

say "terraform plan"

# Two consecutive attempts hit "dial tcp ...: connection refused" reading the same resource from
# two different Google IPs — consistent with Cloud Shell's egress choking under Terraform's
# default 10-way parallel refresh, not one-off bad luck. Lower parallelism to reduce concurrent
# connections, and retry automatically rather than making the operator re-invoke by hand each
# time the network hiccups mid-refresh.
PLAN_OK=0
for attempt in 1 2 3; do
  if terraform plan -input=false -out=cl0.tfplan -parallelism=4 -var="h0_controls_recorded=true"; then
    PLAN_OK=1
    break
  fi
  echo
  echo "plan attempt ${attempt}/3 failed. If that was a network error (dial tcp / connection"
  echo "refused), this is Cloud Shell egress flaking under load, not a real problem — retrying."
  echo "If it was a Terraform or GCP error instead, retrying won't help; read the message above."
  [[ $attempt -lt 3 ]] && sleep 15
done
[[ $PLAN_OK -eq 1 ]] || die "terraform plan failed 3 times. If every failure was 'connection refused', wait a minute for Cloud Shell's network to settle and re-run this script — nothing was created. Otherwise fix what the error above actually says."

echo
say "Read the plan above. Confirm before spending money."
cat <<EOF

Expected, and worth checking by eye:
  - Cloud SQL:  ipv4_enabled = false, ssl_mode = ENCRYPTED_ONLY,
                point_in_time_recovery_enabled = true, tier = db-custom-1-3840
  - Bucket:     versioning enabled, public_access_prevention = enforced
  - VM:         machine_type = e2-standard-2,
                service_account = ${PREFIX}-runtime@${PROJECT}.iam.gserviceaccount.com
                (NOT the default compute service account)
  - Schedule:   two Cloud Scheduler jobs, 0 8 / 0 18 * * 0-4, Asia/Riyadh
  - No roles/editor or roles/owner binding anywhere
  - Exactly ONE google_billing_budget, or none if the import above succeeded

You will also see a WARNING that container_image is empty. That is expected: CL0 provisions
infrastructure, CL3 builds and deploys the image. The VM will boot and its startup script will
exit 1 without starting containers, so the /healthz uptime alert WILL fire until CL3 runs.

EOF
read -rp "Apply this plan? [yes/NO] " CONFIRM
[[ "$CONFIRM" == "yes" ]] || { echo "Aborted. Nothing created."; rm -f cl0.tfplan; exit 1; }

# --- 7. Apply -----------------------------------------------------------------

say "terraform apply"

# Same egress-under-load concern as the plan step. But a saved plan file is NOT safe to reuse on
# retry: the moment even one resource in it actually applies, the state's serial number moves
# and the plan is stale against it. The first real run proved this the hard way — attempt 1
# created almost everything and failed on the last few resources, then attempts 2 and 3 both
# failed instantly on "Saved plan is stale" instead of retrying anything, burning all 3 attempts
# on noise instead of the real error underneath.
#
# Retrying this operation therefore means RE-PLANNING every time, not reapplying cl0.tfplan.
# That is safe to do without asking again: the operator already said yes to "reach this
# configuration's target state," and a fresh plan against the same config computes the same
# target — it only picks up what already landed so it does not repeat it.
rm -f cl0.tfplan
APPLY_OK=0
for attempt in 1 2 3; do
  if terraform plan -input=false -out=cl0.tfplan -parallelism=4 -var="h0_controls_recorded=true" \
      && terraform apply -parallelism=4 cl0.tfplan; then
    APPLY_OK=1
    break
  fi
  echo
  echo "apply attempt ${attempt}/3 failed. Re-planning against current state before the next"
  echo "attempt, not reusing the old plan file — a saved plan goes stale the moment any"
  echo "resource in it actually applies."
  rm -f cl0.tfplan
  [[ $attempt -lt 3 ]] && sleep 15
done
[[ $APPLY_OK -eq 1 ]] || die "terraform apply failed 3 times even after re-planning each time. Read the actual error above — it is not staleness anymore. Check what exists with: terraform state list"
rm -f cl0.tfplan

say "Outputs"
terraform output

cat <<EOF

Done. Next, in order:

  1. Populate the secrets (values never touch git or Terraform state):
       bash infra/pashx-mab-gcp/scripts/30-put-secrets.sh ${PROJECT} generate
       bash infra/pashx-mab-gcp/scripts/40-create-storage-hmac.sh ${PROJECT}

  2. Verify the acceptance criteria against the live environment:
       bash infra/pashx-mab-gcp/scripts/50-verify-acceptance.sh ${PROJECT} ${REGION} ${ZONE}

  3. Build and deploy the image (CL3):
       bash deploy/pashx-mab/build-and-push.sh ${PROJECT} ${REGION}
       bash deploy/pashx-mab/deploy.sh <IMAGE@sha256:...>

  4. PAUSE THE SCHEDULE before any long CL2/CL3/CX2 run, or an 18:00 Asia/Riyadh shutdown will
     cut the suite off mid-run and look like an application defect:
       gcloud scheduler jobs pause ${PREFIX}-shutdown --location=${REGION} --project=${PROJECT}

  5. Copy the Terraform state back out, or keep working from Cloud Shell. State lives in
     gs://${STATE_BUCKET} and is authoritative wherever you run from.

Optional cleanup, safe because it is empty and unused — the default VPC carries
default-allow-ssh/rdp/icmp from 0.0.0.0/0, which contradicts "only HTTPS is public":
  gcloud compute firewall-rules delete default-allow-ssh default-allow-rdp default-allow-icmp default-allow-internal --project=${PROJECT} -q
  gcloud compute networks delete default --project=${PROJECT} -q

EOF
