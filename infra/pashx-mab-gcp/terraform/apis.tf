# Service enablement. Enabling an API is not billable, so this file is intentionally NOT gated
# behind h0_controls_recorded — it is the safe pre-work the execution graph permits before H0.

# Resolves the project NUMBER, which several Google APIs (notably Budgets) store and return in
# place of the project id.
data "google_project" "this" {
  project_id = var.project_id
}

locals {
  required_services = [
    "compute.googleapis.com",
    "sqladmin.googleapis.com",
    "servicenetworking.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "storage.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "cloudbilling.googleapis.com",
    "billingbudgets.googleapis.com",
    "oslogin.googleapis.com",
    "iap.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    # CL3 builds the pinned image with Cloud Build. This was MISSING from the original CL0 apply:
    # deploy/pashx-mab/build-and-push.sh could not run against the environment CL0 created, and
    # the first CL3 attempt died at submit with SERVICE_DISABLED after uploading a 565 MB context.
    # A deploy path that the provisioned environment cannot execute is a provisioning defect.
    "cloudbuild.googleapis.com",
    # Scheduled shutdown (schedule.tf)
    "workflows.googleapis.com",
    "workflowexecutions.googleapis.com",
    "cloudscheduler.googleapis.com",
  ]

  # PromQL alert_rule fields are Prometheus label names: letters, digits, underscores only, no
  # hyphens. var.name_prefix ("pashx-mab") is correct for real GCP resource names but invalid
  # here — the first real apply failed with "PromQL label names must be valid" until this was
  # split out.
  promql_name_prefix = replace(var.name_prefix, "-", "_")

  # The two PromQL policies over the pashx histogram need BOTH the H0 gate open and the metric
  # actually emitting. See variable "financial_metric_is_live".
  promql_metric_gate = var.h0_controls_recorded && var.financial_metric_is_live ? 1 : 0

  common_labels = {
    app         = "pashx-mab"
    environment = var.environment
    owner       = "claude-code-cl0"
    node        = "cl0"
    data_class  = var.data_classification
  }
}

resource "google_project_service" "required" {
  for_each = toset(local.required_services)

  project = var.project_id
  service = each.value

  # Never disable an API on destroy. In a shared project that would break unrelated workloads;
  # in a dedicated project the project deletion is the real teardown.
  disable_on_destroy         = false
  disable_dependent_services = false
}
