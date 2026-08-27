# Document bucket consumed through Twenty's S3-compatible driver via the GCS XML interoperability
# endpoint (STORAGE_TYPE=s3). The Gate 0 compatibility suite in the CX0 contract must pass before
# any user document work; see docs/operations/pashx-mab-gcp/runbook-deploy.md.

resource "google_storage_bucket" "documents" {
  count = local.gate

  name     = "${var.name_prefix}-documents-${var.project_id}"
  location = upper(var.region)

  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  # Object versioning is a CL0 acceptance requirement: it is what makes "version recovery" in the
  # Gate 0 storage suite testable.
  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 3
      with_state         = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      days_since_noncurrent_time = var.gcs_versioning_retention_days
      with_state                 = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  # Browser CORS is part of the Gate 0 suite (presigned direct PUT from the SPA).
  cors {
    origin          = [local.server_url]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  labels = local.common_labels

  # Teardown must be deliberate: a non-empty bucket refuses to delete unless force_destroy is
  # flipped. See runbook-teardown.md.
  force_destroy = false
}

# Terraform state bucket is NOT managed here — it must exist before Terraform runs. See
# scripts/20-create-state-bucket.sh.
