# Secret Manager.
#
# Rule: Terraform creates the secret CONTAINERS and the IAM bindings. It does not create versions
# for operator-supplied values, so those values never enter Terraform state, the repository, a
# tfvars file, a plan output, or a chat transcript.
#
# The one exception is the database password, which Terraform itself generates in sql.tf — there
# is no way to create the SQL user without it. That value lands in state, which is why state
# lives in a private versioned GCS bucket and never in git.
#
# Populate the operator-supplied secrets with scripts/30-put-secrets.sh, which reads from stdin
# or a local file and never echoes.

resource "google_artifact_registry_repository" "images" {
  count = local.gate

  location      = var.region
  repository_id = "${var.name_prefix}-images"
  description   = "Pinned Twenty/PashX container images for the MAB pilot"
  format        = "DOCKER"
  labels        = local.common_labels

  docker_config {
    immutable_tags = true # a tag can never be repointed; digests stay meaningful
  }

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  depends_on = [google_project_service.required]
}

locals {
  # Operator-supplied. Terraform creates the container only.
  operator_secret_names = [
    "app-secret",              # APP_SECRET
    "encryption-key",          # ENCRYPTION_KEY
    "fallback-encryption-key", # FALLBACK_ENCRYPTION_KEY
    "storage-hmac-access-key", # STORAGE_S3_ACCESS_KEY_ID
    "storage-hmac-secret",     # STORAGE_S3_SECRET_ACCESS_KEY
  ]

  # Terraform-supplied.
  managed_secret_names = [
    "pg-database-url",
  ]

  all_secret_names = concat(local.operator_secret_names, local.managed_secret_names)
}

resource "google_secret_manager_secret" "app" {
  for_each = var.h0_controls_recorded ? toset(local.all_secret_names) : toset([])

  secret_id = "${var.name_prefix}-${each.value}"
  labels    = local.common_labels

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  depends_on = [google_project_service.required]
}

# The only secret version Terraform writes. Built from the generated password and the private IP,
# so the connection string is never assembled by hand in a runbook.
resource "google_secret_manager_secret_version" "pg_database_url" {
  count = local.gate

  secret = google_secret_manager_secret.app["pg-database-url"].id

  secret_data = format(
    "postgres://%s:%s@%s:5432/%s",
    google_sql_user.app[0].name,
    urlencode(random_password.app_db[0].result),
    google_sql_database_instance.main[0].private_ip_address,
    google_sql_database.app[0].name,
  )
}
