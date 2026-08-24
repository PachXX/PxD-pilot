# Scheduled shutdown — the only configuration that fits the recorded ₹9,000/month ceiling in
# me-central2. See docs/operations/pashx-mab-gcp/cost-estimate.md § "Running inside ₹9,000".
#
# Mechanism: two Cloud Workflows driven by two Cloud Scheduler jobs.
#
# Why Workflows rather than a GCE instance schedule plus a few Scheduler jobs:
#   - A native `google_compute_resource_policy` instance schedule handles the VM but CANNOT touch
#     Cloud SQL, and Cloud SQL is the larger cost line. Two mechanisms would then need to agree
#     on ordering with no way to express it.
#   - Startup order is load-bearing: Cloud SQL must be RUNNABLE before the VM boots, or the
#     Twenty server fails its startup migrations. A Workflow can wait; cron cannot.
#   - Alerts must be silenced before shutdown and re-armed only after /healthz passes. Expressing
#     that as independent cron jobs means guessing at durations.
#
# Everything here is free at pilot volume: Workflows bills per step beyond 5,000/month (we use
# roughly 300), and Cloud Scheduler's first 3 jobs per account are free.

locals {
  schedule_gate = var.h0_controls_recorded && var.schedule_enabled ? 1 : 0

  # Only the policies that would fire *because the environment is deliberately down*. Everything
  # else stays armed, so a partial or unexpected shutdown is still noticed.
  availability_alert_policy_ids = var.h0_controls_recorded ? [
    google_monitoring_alert_policy.healthz_down[0].name,
    google_monitoring_alert_policy.metric_pipeline_down[0].name,
    google_monitoring_alert_policy.sql_connections[0].name,
  ] : []
}

# --- Identity -----------------------------------------------------------------

resource "google_service_account" "scheduler" {
  count = local.schedule_gate

  account_id   = "${var.name_prefix}-scheduler"
  display_name = "PashX MAB start/stop automation"
  description  = "Runs the scheduled startup and shutdown workflows. Can start/stop exactly one VM and one Cloud SQL instance and toggle three alert policies. Nothing else."
}

# A custom role rather than roles/compute.instanceAdmin.v1 + roles/cloudsql.editor, because those
# two together would let this identity delete the database and rebuild the VM. Start/stop needs
# six permissions; it gets six.
resource "google_project_iam_custom_role" "scheduler" {
  count = local.schedule_gate

  role_id     = "pashxMabScheduler"
  title       = "PashX MAB start/stop automation"
  description = "Least-privilege start/stop for the scheduled-shutdown workflows."

  permissions = [
    "compute.instances.get",
    "compute.instances.start",
    "compute.instances.stop",
    "cloudsql.instances.get",
    "cloudsql.instances.update",
    "monitoring.alertPolicies.get",
    "monitoring.alertPolicies.update",
  ]
}

resource "google_project_iam_member" "scheduler_custom" {
  count = local.schedule_gate

  project = var.project_id
  role    = google_project_iam_custom_role.scheduler[0].id
  member  = "serviceAccount:${google_service_account.scheduler[0].email}"
}

resource "google_project_iam_member" "scheduler_logs" {
  count = local.schedule_gate

  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.scheduler[0].email}"
}

# --- Workflows ----------------------------------------------------------------

resource "google_workflows_workflow" "startup" {
  count = local.schedule_gate

  name            = "${var.name_prefix}-startup"
  region          = var.region
  description     = "Start Cloud SQL, then the VM, wait for /healthz, then re-arm availability alerts."
  service_account = google_service_account.scheduler[0].id
  labels          = local.common_labels

  source_contents = templatefile("${path.module}/workflows/startup.yaml.tftpl", {
    project_id       = var.project_id
    zone             = var.zone
    vm_name          = google_compute_instance.app[0].name
    sql_instance     = google_sql_database_instance.main[0].name
    server_url       = local.server_url
    alert_policy_ids = jsonencode(local.availability_alert_policy_ids)
  })

  depends_on = [google_project_service.required]
}

resource "google_workflows_workflow" "shutdown" {
  count = local.schedule_gate

  name            = "${var.name_prefix}-shutdown"
  region          = var.region
  description     = "Silence availability alerts, stop the VM, then stop Cloud SQL."
  service_account = google_service_account.scheduler[0].id
  labels          = local.common_labels

  source_contents = templatefile("${path.module}/workflows/shutdown.yaml.tftpl", {
    project_id       = var.project_id
    zone             = var.zone
    vm_name          = google_compute_instance.app[0].name
    sql_instance     = google_sql_database_instance.main[0].name
    alert_policy_ids = jsonencode(local.availability_alert_policy_ids)
  })

  depends_on = [google_project_service.required]
}

# --- Triggers -----------------------------------------------------------------

resource "google_service_account_iam_member" "scheduler_self" {
  count = local.schedule_gate

  service_account_id = google_service_account.scheduler[0].name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.scheduler[0].email}"
}

resource "google_project_iam_member" "scheduler_invoke_workflows" {
  count = local.schedule_gate

  project = var.project_id
  role    = "roles/workflows.invoker"
  member  = "serviceAccount:${google_service_account.scheduler[0].email}"
}

resource "google_cloud_scheduler_job" "startup" {
  count = local.schedule_gate

  name        = "${var.name_prefix}-startup"
  region      = var.region
  description = "Bring the PashX MAB pilot up for the working day."
  schedule    = var.schedule_start_cron
  time_zone   = var.schedule_timezone

  # A missed start is recoverable by hand and by the next day's run; retrying a partial start is
  # more likely to leave the environment half-up.
  retry_config {
    retry_count = 1
  }

  http_target {
    http_method = "POST"
    uri         = "https://workflowexecutions.googleapis.com/v1/${google_workflows_workflow.startup[0].id}/executions"

    oauth_token {
      service_account_email = google_service_account.scheduler[0].email
    }
  }
}

resource "google_cloud_scheduler_job" "shutdown" {
  count = local.schedule_gate

  name        = "${var.name_prefix}-shutdown"
  region      = var.region
  description = "Take the PashX MAB pilot down for the night. This is the cost control."
  schedule    = var.schedule_stop_cron
  time_zone   = var.schedule_timezone

  # Shutdown is retried harder than startup: a missed shutdown costs money silently until
  # somebody notices, which is exactly the failure the ceiling exists to prevent.
  retry_config {
    retry_count          = 3
    min_backoff_duration = "60s"
  }

  http_target {
    http_method = "POST"
    uri         = "https://workflowexecutions.googleapis.com/v1/${google_workflows_workflow.shutdown[0].id}/executions"

    oauth_token {
      service_account_email = google_service_account.scheduler[0].email
    }
  }
}

# --- The failure mode this schedule introduces --------------------------------

# If the shutdown workflow fails, the environment stays up all night and every night until
# somebody notices the bill. That is silent, and silent cost overrun is the thing the ₹9,000
# ceiling was set to catch late rather than early. This catches it the next morning instead.
resource "google_monitoring_alert_policy" "shutdown_failed" {
  count = local.schedule_gate

  display_name = "${var.name_prefix} — scheduled shutdown did not run"
  combiner     = "OR"
  severity     = "WARNING"

  documentation {
    content   = "The shutdown workflow failed or did not execute. The pilot is running outside its scheduled window and burning budget. Run it by hand: `gcloud workflows run ${var.name_prefix}-shutdown --location=${var.region}`."
    mime_type = "text/markdown"
  }

  conditions {
    display_name = "shutdown workflow execution failed"

    condition_matched_log {
      filter = <<-EOT
        resource.type="workflows.googleapis.com/Workflow"
        AND resource.labels.workflow_id="${var.name_prefix}-shutdown"
        AND severity>=ERROR
      EOT
    }
  }

  notification_channels = [google_monitoring_notification_channel.email[0].id]

  alert_strategy {
    notification_rate_limit {
      period = "3600s"
    }
    auto_close = "86400s"
  }
}
