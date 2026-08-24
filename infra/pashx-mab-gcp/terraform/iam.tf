# Least-privilege identities.
#
# Two service accounts, no shared credentials, no use of the default compute service account.
# The inventory found that the default compute SA in pashxd-e56c5 holds project-wide
# roles/editor; the VM therefore ALWAYS sets an explicit service_account block (compute.tf) so it
# cannot inherit that.
#
# Roles are granted at the narrowest resource scope that works. Project-level grants appear only
# where the API offers no resource-level binding (logging, monitoring, Cloud SQL client).

resource "google_service_account" "runtime" {
  count = local.gate

  account_id   = "${var.name_prefix}-runtime"
  display_name = "PashX MAB application VM runtime"
  description  = "Runtime identity for the Twenty/PashX server and worker containers. Pull images, read named secrets, connect to Cloud SQL, write logs and metrics, use the document bucket."
}

resource "google_service_account" "deployer" {
  count = local.gate

  account_id   = "${var.name_prefix}-deployer"
  display_name = "PashX MAB CI deployer"
  description  = "Build and push images, restart the application VM. Cannot read application secrets and cannot administer Cloud SQL."
}

# --- Runtime: project-level, only where no narrower scope exists ---------------

locals {
  runtime_project_roles = [
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/cloudtrace.agent",
    "roles/cloudsql.client", # no resource-level binding exists for Cloud SQL connect
  ]
}

resource "google_project_iam_member" "runtime" {
  for_each = var.h0_controls_recorded ? toset(local.runtime_project_roles) : toset([])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.runtime[0].email}"
}

# --- Runtime: resource-scoped -------------------------------------------------

resource "google_artifact_registry_repository_iam_member" "runtime_pull" {
  count = local.gate

  project    = var.project_id
  location   = var.region
  repository = google_artifact_registry_repository.images[0].name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${google_service_account.runtime[0].email}"
}

resource "google_storage_bucket_iam_member" "runtime_documents" {
  count = local.gate

  bucket = google_storage_bucket.documents[0].name
  role   = "roles/storage.objectAdmin" # Twenty needs read, write, and delete on its own bucket
  member = "serviceAccount:${google_service_account.runtime[0].email}"
}

# Secret access is granted per named secret. There is deliberately no project-level
# secretmanager.secretAccessor: a future secret must be granted explicitly to be readable.
resource "google_secret_manager_secret_iam_member" "runtime" {
  for_each = var.h0_controls_recorded ? google_secret_manager_secret.app : {}

  secret_id = each.value.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime[0].email}"
}

# --- Deployer -----------------------------------------------------------------

resource "google_artifact_registry_repository_iam_member" "deployer_push" {
  count = local.gate

  project    = var.project_id
  location   = var.region
  repository = google_artifact_registry_repository.images[0].name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.deployer[0].email}"
}

# The deployer restarts the VM to roll a new digest. It gets instanceAdmin on the single VM
# rather than project-wide compute.admin.
resource "google_compute_instance_iam_member" "deployer_instance" {
  count = local.gate

  project       = var.project_id
  zone          = var.zone
  instance_name = google_compute_instance.app[0].name
  role          = "roles/compute.instanceAdmin.v1"
  member        = "serviceAccount:${google_service_account.deployer[0].email}"
}

# Needed so the deployer can restart a VM that runs as the runtime SA. Scoped to that one SA.
resource "google_service_account_iam_member" "deployer_actas_runtime" {
  count = local.gate

  service_account_id = google_service_account.runtime[0].name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer[0].email}"
}

# --- Deployer: Cloud Build -----------------------------------------------------

# CL3 runs the image build AS the deployer, not as Google's legacy
# <PROJECT_NUMBER>@cloudbuild.gserviceaccount.com default. Two reasons: that default SA carries a
# broad grant that would undercut the least-privilege design in iam-design.md, and Google is
# retiring automatic provisioning of it for new projects — relying on it makes the build path
# depend on a legacy behaviour rather than on checked-in configuration.
#
# A build needs to write its own logs. `logging: CLOUD_LOGGING_ONLY` in cloudbuild.yaml means the
# build FAILS TO START without this, rather than merely losing logs.
resource "google_project_iam_member" "deployer_build_logs" {
  count = local.gate

  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.deployer[0].email}"
}

# Cloud Build stages the uploaded source tarball in a GCS bucket and reads it back inside the
# build. Scoped to the project rather than a named bucket because Cloud Build picks its own
# staging bucket name (<project>_cloudbuild) and creates it on first use.
resource "google_project_iam_member" "deployer_build_staging" {
  count = local.gate

  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.deployer[0].email}"
}

resource "google_project_iam_member" "deployer_build_editor" {
  count = local.gate

  project = var.project_id
  role    = "roles/cloudbuild.builds.editor"
  member  = "serviceAccount:${google_service_account.deployer[0].email}"
}

# The human operator submits the build but the build RUNS as the deployer, so the operator needs
# actAs on it. Without this, `gcloud builds submit --service-account=...` is refused.
resource "google_service_account_iam_member" "operator_actas_deployer" {
  count = local.gate

  service_account_id = google_service_account.deployer[0].name
  role               = "roles/iam.serviceAccountUser"
  member             = "user:${var.alert_email}"
}

resource "google_project_iam_member" "deployer_iap_tunnel" {
  count = local.gate

  project = var.project_id
  role    = "roles/iap.tunnelResourceAccessor"
  member  = "serviceAccount:${google_service_account.deployer[0].email}"
}

# --- Operator access -----------------------------------------------------------

# OS Login is enforced project-wide via metadata on the VM (compute.tf). Human operators reach
# the VM only through IAP; there is no public SSH and no SSH key in metadata.
resource "google_project_iam_member" "operator_iap_tunnel" {
  count = local.gate

  project = var.project_id
  role    = "roles/iap.tunnelResourceAccessor"
  member  = "user:${var.alert_email}"
}

resource "google_project_iam_member" "operator_oslogin" {
  count = local.gate

  project = var.project_id
  role    = "roles/compute.osLogin" # NOT osAdminLogin: no passwordless root by default
  member  = "user:${var.alert_email}"
}
