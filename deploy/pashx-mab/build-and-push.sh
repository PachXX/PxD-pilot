#!/usr/bin/env bash
# Build the pinned Twenty/PashX image with Cloud Build and print its immutable digest.
#
# Cloud Build is used rather than a local docker build because the workstation is disk
# constrained (the ENOSPC finding in the do-not-repeat register). This is the CL3 build step;
# CL0 only provides it.
#
# Usage: ./build-and-push.sh <project-id> <region> [git-sha]

set -euo pipefail

PROJECT="${1:?usage: build-and-push.sh <project-id> <region> [tag] [build-region]}"
REGION="${2:?}"
SHA="${3:-$(git rev-parse --short HEAD)}"
# Build region is INDEPENDENT of the registry region. Cloud Build machine-type availability is
# regional and quota-gated — me-central1 rejected E2_HIGHCPU_32 outright — so when the pilot
# region cannot run the build, build somewhere that can and push to the pilot registry. The image
# is identical either way; only the push crosses regions.
BUILD_REGION="${4:-$REGION}"

PREFIX="pashx-mab"

# APP_VERSION is validated at server BOOT by IsTwentySemVer (semver.parse). A bare git sha is not
# semver, and the server exits on startup with "APP_VERSION must be a valid semantic version" —
# after the image is built and pushed, so the build looks green. Combine the workspace version
# with the sha as semver build metadata (0.2.1+8cd5396c): valid to semver.parse, and the sha is
# still readable in the running app and in /healthz output.
REPO_ROOT_FOR_VERSION="$(cd "$(dirname "$0")/../.." && pwd)"
WORKSPACE_VERSION="$(node -p "require('${REPO_ROOT_FOR_VERSION}/package.json').version")"
APP_VERSION="${WORKSPACE_VERSION}+${SHA}"
REPO="${REGION}-docker.pkg.dev/${PROJECT}/${PREFIX}-images"
IMAGE="${REPO}/twenty-pashx"

export CLOUDSDK_CORE_DISABLE_PROMPTS=1

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "Building ${IMAGE}:${SHA} from ${REPO_ROOT}"
echo "  registry region: ${REGION}   build region: ${BUILD_REGION}"
echo "  target: twenty (server + frontend)   APP_VERSION: ${APP_VERSION}"
# --ignore-file is essential, not optional: without it gcloud tars the whole working tree,
# which is 3.0 GB here (1.4 GB .git + 988 MB node_modules). Reusing .dockerignore keeps the
# uploaded context identical to what the Docker build actually sees.
gcloud builds submit "$REPO_ROOT" \
  --project="$PROJECT" \
  --region="$BUILD_REGION" \
  --config="$(dirname "$0")/cloudbuild.yaml" \
  --ignore-file=.dockerignore \
  --service-account="projects/${PROJECT}/serviceAccounts/${PREFIX}-deployer@${PROJECT}.iam.gserviceaccount.com" \
  --substitutions="_IMAGE=${IMAGE},_TAG=${SHA},_APP_VERSION=${APP_VERSION}"

DIGEST="$(gcloud artifacts docker images describe "${IMAGE}:${SHA}" \
  --project="$PROJECT" --format='value(image_summary.digest)')"

echo
echo "Immutable reference — record this in CL0-provisioning-evidence.md and set it as"
echo "container_image in terraform.tfvars:"
echo
echo "  ${IMAGE}@${DIGEST}"
