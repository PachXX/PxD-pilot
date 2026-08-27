# Monitoring, alerting, uptime, and log-based error tracking.
#
# Every alert here maps to a deployment rollback trigger in
# docs/execution/2026-08-05 - Codex Claude Graph Engineering.md.

resource "google_monitoring_notification_channel" "email" {
  count = local.gate

  display_name = "PashX MAB pilot alerts"
  type         = "email"

  labels = {
    email_address = var.alert_email
  }
}

# --- Uptime: "health checks fail for five minutes" ----------------------------

resource "google_monitoring_uptime_check_config" "healthz" {
  count = local.gate

  display_name = "${var.name_prefix}-healthz"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path         = "/healthz"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = local.server_host
    }
  }
}

resource "google_monitoring_alert_policy" "healthz_down" {
  count = local.gate

  display_name = "${var.name_prefix} — /healthz failing (rollback trigger)"
  combiner     = "OR"

  documentation {
    content   = "The external HTTPS health endpoint has failed for five minutes. This is an explicit rollback trigger. Follow docs/operations/pashx-mab-gcp/runbook-rollback.md."
    mime_type = "text/markdown"
  }

  conditions {
    display_name = "uptime check failing"
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.label.check_id=\"${google_monitoring_uptime_check_config.healthz[0].uptime_check_id}\""
      comparison      = "COMPARISON_LT"
      threshold_value = 1
      duration        = "300s"

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_FRACTION_TRUE"
        cross_series_reducer = "REDUCE_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email[0].id]
  alert_strategy {
    auto_close = "1800s"
  }

  lifecycle {
    # Cloud Monitoring REFUSES to delete an uptime check while any alert policy still references it:
    #   Error 400: Request contains an invalid argument.
    #   - please ensure all associated Alert Policies are deleted
    #
    # Changing the public hostname changes monitored_resource.labels.host, which forces the uptime
    # check to be REPLACED. Terraform's default plan only updates this policy in place — so the
    # reference was still live when it tried to delete the check, and the apply failed half-done:
    # the VM had already been replaced onto the new hostname while the check was left on the old one.
    #
    # Forcing this policy to be replaced alongside the check makes the ordering correct, because the
    # policy depends on the check: destroy policy -> destroy check -> create check -> create policy.
    # Terraform cannot infer this on its own; the constraint lives in the Cloud Monitoring API, not
    # in the dependency graph.
    replace_triggered_by = [google_monitoring_uptime_check_config.healthz[0]]
  }
}

# --- Application errors: "application errors exceed 1%" -----------------------

resource "google_logging_metric" "app_errors" {
  count = local.gate

  name        = "${var.name_prefix}-app-errors"
  description = "Count of ERROR-or-worse log entries from the application VM containers"
  filter      = "resource.type=\"gce_instance\" AND resource.labels.instance_id=\"${google_compute_instance.app[0].instance_id}\" AND severity>=ERROR"

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
  }
}

# Google's backend takes a few minutes to make a freshly created log-based metric queryable by
# an alert policy. Terraform's implicit dependency (the filter references
# google_logging_metric.app_errors[0].name) enforces CREATE-before-USE ordering, but that is not
# the same as PROPAGATION — the first real apply hit
# "Cannot find metric(s) that match type = logging.googleapis.com/user/pashx-mab-app-errors"
# seconds after the metric reported created. This sleep is the fix.
resource "time_sleep" "log_metrics_propagation" {
  count = local.gate

  depends_on      = [google_logging_metric.app_errors, google_logging_metric.secret_leak]
  create_duration = "90s"
}

resource "google_monitoring_alert_policy" "error_rate" {
  count = local.gate

  depends_on = [time_sleep.log_metrics_propagation]

  display_name = "${var.name_prefix} — application error rate elevated (rollback trigger)"
  combiner     = "OR"

  documentation {
    content   = "Application ERROR log volume has been sustained above threshold. Cross-check against request volume; >1% of requests erroring is a rollback trigger."
    mime_type = "text/markdown"
  }

  conditions {
    display_name = "error log rate"
    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.app_errors[0].name}\" AND resource.type=\"gce_instance\""
      comparison      = "COMPARISON_GT"
      threshold_value = 6 # ~0.1/s sustained
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_DELTA"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email[0].id]
}

# --- Secret leakage: "secrets appear in logs" ---------------------------------

# A log-based metric that fires on tokens that must never be logged. This is a detective control,
# not a preventive one; the preventive control is that secrets only ever live in tmpfs.
resource "google_logging_metric" "secret_leak" {
  count = local.gate

  name        = "${var.name_prefix}-possible-secret-in-logs"
  description = "Log lines containing patterns that resemble credentials. Any non-zero value is an incident."
  filter      = <<-EOT
    resource.type="gce_instance"
    AND resource.labels.instance_id="${google_compute_instance.app[0].instance_id}"
    AND (
      textPayload=~"postgres://[^:]+:[^@]+@"
      OR textPayload=~"(?i)(app_secret|encryption_key|secret_access_key)\\s*[=:]\\s*\\S+"
    )
  EOT

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
  }
}

resource "google_monitoring_alert_policy" "secret_leak" {
  count = local.gate

  depends_on = [time_sleep.log_metrics_propagation]

  display_name = "${var.name_prefix} — possible secret in logs (rollback trigger)"
  combiner     = "OR"

  documentation {
    content   = "A log line matched a credential pattern. Treat as an incident: rotate the affected secret, purge the log sink if required, and stop the deploy. This is an explicit rollback trigger."
    mime_type = "text/markdown"
  }

  conditions {
    display_name = "any match"
    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.secret_leak[0].name}\" AND resource.type=\"gce_instance\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "0s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_DELTA"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email[0].id]
}

# --- CL0-M1: internal financial-command p95 (the rollback detector) -----------
#
# Closes CL0 finding 7. Codex's histogram
# (pashx/financial-command/internal-duration-ms, buckets ...750, 1000, 1500...) reaches Google
# Managed Prometheus through the collector in deploy/pashx-mab/otel-collector-config.yaml.
#
# PromQL rather than condition_threshold + MQL because the trigger has two parts that must be
# expressed together: a p95 over a histogram AND a minimum sample count. A plain
# condition_threshold with ALIGN_PERCENTILE_95 cannot gate on sample count, so it fires on a
# single slow request in a quiet pilot. See docs/operations/pashx-mab-gcp/CL0-M1-p95-alert.md.
#
# This is the AUTHORITATIVE detector for the graph's "internal financial-command p95 exceeds one
# second excluding external providers" rollback trigger. Cloud SQL Query Insights and
# log_min_duration_statement are secondary DATABASE diagnostics used to explain a firing; they
# are not the detector and must not be treated as one.

# Gated behind local.promql_metric_gate, NOT local.gate.
#
# Google Managed Prometheus refuses to create a PromQL alert policy whose metric has never
# ingested a sample: "Error 400: The following PromQL metric(s) are invalid". The pashx
# financial-command histogram only exists once CL3 deploys the app and the collector scrapes it,
# so at CL0 time this policy is structurally uncreatable — retrying cannot help.
#
# metric_pipeline_down is exempt because it queries `up`, a built-in GMP synthetic metric that is
# always valid. That policy is also what guarantees this gap is visible rather than silent: it
# fires when no samples are arriving, which is exactly the state that blocks these two.
resource "google_monitoring_alert_policy" "financial_command_p95" {
  count = local.promql_metric_gate

  display_name = "${var.name_prefix} — internal financial-command p95 > ${var.p95_threshold_ms}ms (rollback trigger)"
  combiner     = "OR"
  severity     = "CRITICAL"

  documentation {
    content   = <<-EOT
      Internal PashX financial-command p95 exceeded ${var.p95_threshold_ms} ms over a
      ${var.p95_window} window with at least ${var.p95_min_samples} samples.

      The timer covers internal command work only — authorization, reconciliation, the workspace
      transaction, numbering, and audit. External providers (ZATCA, OCR) are outside it by
      construction, so a firing is NOT explained by a slow third party.

      This is an explicit rollback trigger. Follow
      docs/operations/pashx-mab-gcp/runbook-rollback.md.

      To diagnose after rolling back, use the SECONDARY database diagnostics: Cloud SQL Query
      Insights and the `log_min_duration_statement=1000` slow-statement log. They explain a
      firing; they do not detect it.
    EOT
    mime_type = "text/markdown"
  }

  conditions {
    display_name = "p95 > ${var.p95_threshold_ms}ms with >= ${var.p95_min_samples} samples"

    condition_prometheus_query_language {
      # `and` keeps the left-hand p95 series only when the right-hand sample-count series also
      # exists, which is how the minimum sample count is enforced. A quiet period simply produces
      # no series, so the policy stays silent instead of alerting on one unlucky request.
      query = <<-EOT
        (
          histogram_quantile(
            0.95,
            sum by (le) (
              rate(pashx_financial_command_internal_duration_ms_bucket[${var.p95_window}])
            )
          ) > ${var.p95_threshold_ms}
        )
        and
        (
          sum(
            increase(pashx_financial_command_internal_duration_ms_count[${var.p95_window}])
          ) >= ${var.p95_min_samples}
        )
      EOT

      duration            = var.p95_duration
      evaluation_interval = "60s"

      alert_rule = "${local.promql_name_prefix}_financial_command_p95"
    }
  }

  notification_channels = [google_monitoring_notification_channel.email[0].id]

  alert_strategy {
    auto_close = "3600s"
  }
}

# Low-volume companion. At pilot traffic the p95 policy above can legitimately never gather
# ${var.p95_min_samples} samples in ${var.p95_window}, which would leave pathological latency
# entirely undetected. This catches a single command over the hard ceiling. It is deliberately a
# separate, lower-severity policy so the statistically sound detector above is not weakened to
# accommodate low traffic.
# Same GMP constraint as financial_command_p95 — see the note there.
resource "google_monitoring_alert_policy" "financial_command_slow_outlier" {
  count = local.promql_metric_gate

  display_name = "${var.name_prefix} — single financial command over ${var.p95_outlier_ms}ms (low-volume safety net)"
  combiner     = "OR"
  severity     = "WARNING"

  documentation {
    content   = "A single internal financial command exceeded ${var.p95_outlier_ms} ms. Not itself a rollback trigger — investigate, and check whether the p95 policy is being suppressed by low sample volume."
    mime_type = "text/markdown"
  }

  conditions {
    display_name = "any command over ${var.p95_outlier_ms}ms"

    condition_prometheus_query_language {
      # Everything above the 2500ms bucket boundary in the last 10 minutes.
      query = <<-EOT
        sum(
          increase(pashx_financial_command_internal_duration_ms_bucket{le="+Inf"}[10m])
          -
          increase(pashx_financial_command_internal_duration_ms_bucket{le="${var.p95_outlier_ms}"}[10m])
        ) > 0
      EOT

      duration            = "0s"
      evaluation_interval = "60s"

      alert_rule = "${local.promql_name_prefix}_financial_command_slow_outlier"
    }
  }

  notification_channels = [google_monitoring_notification_channel.email[0].id]

  alert_strategy {
    auto_close = "3600s"
  }
}

# Detects the failure mode that would make both policies above silently useless: the collector
# stopped scraping, so no samples arrive and no alert can ever fire. An absent detector is worse
# than a noisy one, because it looks like health.
resource "google_monitoring_alert_policy" "metric_pipeline_down" {
  count = local.gate

  display_name = "${var.name_prefix} — financial-command metric pipeline not reporting"
  combiner     = "OR"
  severity     = "ERROR"

  documentation {
    content   = "No samples from the twenty-server Prometheus endpoint for 15 minutes. The p95 rollback detector is BLIND while this is firing. Check the otel-collector container and that METER_DRIVER=prometheus is set."
    mime_type = "text/markdown"
  }

  conditions {
    display_name = "scrape target down or absent"

    condition_prometheus_query_language {
      query               = "up{job=\"pashx-server\"} == 0 or absent(up{job=\"pashx-server\"})"
      duration            = "900s"
      evaluation_interval = "60s"

      alert_rule = "${local.promql_name_prefix}_metric_pipeline_down"
    }
  }

  notification_channels = [google_monitoring_notification_channel.email[0].id]
}

# --- Cloud SQL: "database connections exhaust" --------------------------------

resource "google_monitoring_alert_policy" "sql_connections" {
  count = local.gate

  display_name = "${var.name_prefix} — Cloud SQL connections near limit (rollback trigger)"
  combiner     = "OR"

  documentation {
    content   = "Connection utilisation is approaching max_connections (200). Connection exhaustion is an explicit rollback trigger."
    mime_type = "text/markdown"
  }

  conditions {
    display_name = "connections > 80% of max"
    condition_threshold {
      filter          = "metric.type=\"cloudsql.googleapis.com/database/postgresql/num_backends\" AND resource.type=\"cloudsql_database\" AND resource.labels.database_id=\"${var.project_id}:${google_sql_database_instance.main[0].name}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 160
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email[0].id]
}

resource "google_monitoring_alert_policy" "sql_disk" {
  count = local.gate

  display_name = "${var.name_prefix} — Cloud SQL disk utilisation high"
  combiner     = "OR"

  conditions {
    display_name = "disk > 85%"
    condition_threshold {
      filter          = "metric.type=\"cloudsql.googleapis.com/database/disk/utilization\" AND resource.type=\"cloudsql_database\" AND resource.labels.database_id=\"${var.project_id}:${google_sql_database_instance.main[0].name}\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.85
      duration        = "600s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email[0].id]
}

# --- VM resource pressure -----------------------------------------------------

resource "google_monitoring_alert_policy" "vm_memory" {
  count = local.gate

  display_name = "${var.name_prefix} — application VM memory high"
  combiner     = "OR"

  conditions {
    display_name = "memory > 90%"
    condition_threshold {
      filter          = "metric.type=\"agent.googleapis.com/memory/percent_used\" AND resource.type=\"gce_instance\" AND metric.label.state=\"used\""
      comparison      = "COMPARISON_GT"
      threshold_value = 90
      duration        = "600s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email[0].id]
}
