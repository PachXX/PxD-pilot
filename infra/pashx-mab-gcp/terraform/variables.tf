variable "project_id" {
  description = "Target GCP project. See docs/operations/pashx-mab-gcp/IDR-0001. Must NOT be pashxd-e56c5 unless Shahil explicitly accepts the shared blast radius."
  type        = string

  validation {
    condition     = var.project_id != ""
    error_message = "project_id is an H0 input and must be recorded before apply."
  }
}

variable "region" {
  description = "Single region for every regional resource. Immutable for Cloud SQL and the bucket."
  type        = string

  validation {
    condition     = contains(["me-central1", "europe-west1"], var.region)
    error_message = "Allowed regions: me-central1 (Doha) or europe-west1. me-central2 (Dammam) is deliberately NOT in this list — it is gated behind Invoiced Billing for non-KSA customers or a CNTXT reseller contract for KSA customers, and is unreachable from this billing account. See docs/operations/pashx-mab-gcp/BLOCKER-me-central2-region-access.md. Widen this list only after a real create-and-delete probe succeeds in the new region."
  }
}

variable "zone" {
  description = "Zone for the application VM, inside var.region."
  type        = string
}

variable "name_prefix" {
  description = "Prefix for every resource name. Keeps MAB resources visually separable from PashxD product resources if a shared project is ever chosen."
  type        = string
  default     = "pashx-mab"
}

variable "data_classification" {
  description = "What kind of data this environment is permitted to hold. H0 input 5. 'disposable' is the only value compatible with destructive T3 tests and with the nightly PITR gaps introduced by scheduled shutdown; guards.tf enforces that. Raising it to 'real' is a deliberate act that forces the schedule off."
  type        = string
  default     = "disposable"

  validation {
    condition     = contains(["disposable", "real"], var.data_classification)
    error_message = "data_classification must be 'disposable' or 'real'. There is no middle value on purpose — the destructive-test and RPO rules differ absolutely between them."
  }
}

variable "environment" {
  description = "Environment label. The pilot is 'pilot'; nothing here is production-promoted until SG passes."
  type        = string
  default     = "pilot"
}

# --- H0 gate -----------------------------------------------------------------

variable "h0_controls_recorded" {
  description = "Set true ONLY after project, region, hostname, budget ceiling, data classification, and deploy authority are recorded in the shared context. Guards every billable resource."
  type        = bool
  default     = false
}

variable "budget_amount" {
  description = "Monthly budget ceiling, denominated in budget_currency_code. Drives the budget alert. NOTE: cost-estimate.md is in USD because GCP list prices are USD, but this account bills in INR — convert before comparing. See docs/operations/pashx-mab-gcp/cost-estimate.md."
  type        = number
  default     = 9000
}

variable "budget_currency_code" {
  description = "Currency for the budget amount. MUST match the billing account's currency or the API rejects the budget with INVALID_ARGUMENT. Billing account 0154D8-6A85C0-668177 is INR."
  type        = string
  default     = "INR"
}

variable "billing_account_id" {
  description = "Billing account the budget attaches to. Empty disables budget creation (and then h0_controls_recorded must stay false)."
  type        = string
  default     = ""
}

variable "alert_email" {
  description = "Email address for budget and monitoring alerts."
  type        = string
}

# --- Networking --------------------------------------------------------------

variable "subnet_cidr" {
  description = "Primary subnet range for the application VM."
  type        = string
  default     = "10.20.0.0/24"
}

variable "psa_cidr" {
  description = "Private Services Access range reserved for Cloud SQL peering. Must not overlap subnet_cidr."
  type        = string
  default     = "10.30.0.0"
}

variable "psa_prefix_length" {
  description = "Prefix length for the PSA range. /16 is the Google-recommended minimum for Cloud SQL."
  type        = number
  default     = 16
}

variable "operator_source_ranges" {
  description = "Source ranges permitted to reach the VM over IAP-tunnelled SSH. 35.235.240.0/20 is Google's IAP forwarding range and is the only entry that should normally be here."
  type        = list(string)
  default     = ["35.235.240.0/20"]
}

# --- Application VM ----------------------------------------------------------

variable "vm_machine_type" {
  description = "Application VM machine type. RECORDED 2026-08-06: e2-standard-2 (lean tier) combined with scheduled shutdown — the only combination that fits the recorded ₹9,000/month ceiling in me-central2. e2-standard-4 is the recommended tier if the ceiling is raised."
  type        = string
  default     = "e2-standard-2"
}

variable "vm_boot_disk_gb" {
  description = "Boot disk size. Holds the OS, container images, and NO durable application state."
  type        = number
  default     = 50
}

# --- Cloud SQL ---------------------------------------------------------------

variable "sql_tier" {
  description = "Cloud SQL machine tier. RECORDED 2026-08-06: db-custom-1-3840 (lean tier). NOT a shared-core tier (db-g1-small) on purpose — a throttled database would distort the very p95 the CL0-M1 rollback detector measures, so cheapness stops here."
  type        = string
  default     = "db-custom-1-3840"
}

variable "sql_disk_gb" {
  description = "Cloud SQL SSD size. Autoresize is enabled, so this is a floor."
  type        = number
  default     = 50
}

variable "sql_availability_type" {
  description = "ZONAL for the pilot. REGIONAL doubles cost and is only justified once RTO is contractual."
  type        = string
  default     = "ZONAL"
}

variable "sql_deletion_protection" {
  description = "Blocks accidental Cloud SQL deletion. Teardown must flip this to false deliberately."
  type        = bool
  default     = true
}

variable "sql_backup_start_time_utc" {
  description = "Cloud SQL automated backup start, UTC HH:MM. MUST fall inside the scheduled running window — a stopped instance takes no backup, and the failure is silent. Default 05:30 UTC = 08:30 Asia/Riyadh, half an hour after the 08:00 start."
  type        = string
  default     = "05:30"

  validation {
    condition     = can(regex("^([01][0-9]|2[0-3]):[0-5][0-9]$", var.sql_backup_start_time_utc))
    error_message = "sql_backup_start_time_utc must be HH:MM in 24-hour UTC."
  }
}

variable "sql_backup_retention_days" {
  description = "Automated backup retention. Seven days covers the pilot; PITR window is set separately."
  type        = number
  default     = 7
}

variable "sql_pitr_retention_days" {
  description = "Point-in-time recovery window in days. Backs the five-minute RPO target in the architecture overview."
  type        = number
  default     = 7
}

# --- Scheduled shutdown --------------------------------------------------------

variable "schedule_enabled" {
  description = "Stop the VM and Cloud SQL outside working hours. RECORDED 2026-08-06 as true: it is the only configuration that fits the ₹9,000/month ceiling in me-central2. Set false only alongside raising the budget."
  type        = bool
  default     = true
}

variable "schedule_timezone" {
  description = "IANA timezone for the start/stop schedule. Asia/Riyadh matches the pilot users and the me-central2 region; the operator is in Europe/Berlin, one hour behind."
  type        = string
  default     = "Asia/Riyadh"
}

variable "schedule_start_cron" {
  description = "When to bring the environment up. Default 08:00 Sunday-Thursday, the Saudi working week."
  type        = string
  default     = "0 8 * * 0-4"
}

variable "schedule_stop_cron" {
  description = "When to take it down. Default 18:00 Sunday-Thursday. 10h x 22 days is ~30% of a 730-hour month, which is what the cost estimate assumes."
  type        = string
  default     = "0 18 * * 0-4"
}

# --- Storage -----------------------------------------------------------------

variable "gcs_versioning_retention_days" {
  description = "How long noncurrent object versions are kept before lifecycle deletion."
  type        = number
  default     = 30
}

# --- CL0-M1: financial-command p95 detector ------------------------------------

variable "financial_metric_is_live" {
  description = "Set true ONLY after CL3 has deployed the app and the collector has scraped at least one pashx_financial_command_internal_duration_ms sample. Google Managed Prometheus rejects a PromQL alert policy whose metric has never ingested data, so the p95 detector and its low-volume companion cannot exist before then. Verify with Phase A of scripts/60-p95-alert-drill.sh, then flip this and re-apply."
  type        = bool
  default     = false
}

variable "p95_threshold_ms" {
  description = "p95 threshold for the internal financial-command rollback trigger, in milliseconds. The graph specifies one second. Codex placed a histogram bucket boundary at exactly 1000, so the estimate is most accurate at this value; moving it away from a boundary degrades precision."
  type        = number
  default     = 1000
}

variable "p95_window" {
  description = "PromQL rate/increase window for the p95 detector. Ten minutes balances detection speed against gathering enough samples at pilot volume."
  type        = string
  default     = "10m"

  validation {
    condition     = can(regex("^[0-9]+[ms]$", var.p95_window))
    error_message = "p95_window must be a PromQL duration such as 5m, 10m, or 30m."
  }
}

variable "p95_min_samples" {
  description = "Minimum commands observed within p95_window before the alert may fire. Below roughly 20 samples a p95 is not a meaningful statistic and the policy would be alerting on individual requests."
  type        = number
  default     = 20

  validation {
    condition     = var.p95_min_samples >= 5
    error_message = "A p95 computed from fewer than 5 samples is noise, not a signal. Use the slow-outlier policy for low-volume detection instead of lowering this."
  }
}

variable "p95_duration" {
  description = "How long the condition must hold before the alert fires. Suppresses a single transient window."
  type        = string
  default     = "300s"
}

variable "p95_outlier_ms" {
  description = "Hard ceiling for the low-volume companion policy. Must match a histogram bucket boundary from PASHX_FINANCIAL_COMMAND_DURATION_MS_BUCKET_BOUNDARIES, otherwise the `le` label selector matches no series and the policy silently never fires."
  type        = string
  default     = "2500"

  validation {
    condition     = contains(["1000", "1500", "2500", "5000", "10000"], var.p95_outlier_ms)
    error_message = "p95_outlier_ms must be one of the upper histogram bucket boundaries Codex defined: 1000, 1500, 2500, 5000, 10000."
  }
}

# --- Application -------------------------------------------------------------

variable "server_hostname" {
  description = "Public HTTPS hostname. Empty selects the nip.io fallback derived from the static IP — acceptable for the pilot only."
  type        = string
  default     = ""
}

variable "container_image" {
  description = "Twenty/PashX image pinned by immutable digest, e.g. europe-west1-docker.pkg.dev/PROJECT/pashx-mab/twenty-pashx@sha256:... . A tag-only reference is rejected: CL3 requires digest-pinned deploys."
  type        = string
  default     = ""

  validation {
    condition     = var.container_image == "" || can(regex("@sha256:[0-9a-f]{64}$", var.container_image))
    error_message = "container_image must be pinned by @sha256 digest, not by tag."
  }
}
