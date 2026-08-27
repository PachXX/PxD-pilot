# One reproducible application VM running the pinned Twenty/PashX containers.
#
# The VM is disposable by design: no durable application state on its filesystem. Everything
# authoritative lives in Cloud SQL and GCS. Replacing it is the rollback mechanism of last
# resort (see runbook-rollback.md).

locals {
  # Direct indexing (not `one()`): `one()` materializes the whole resource object, which carries
  # sensitive attributes, and the mark propagates to plain fields like .name. try() handles the
  # gate-closed case where the list is empty.
  public_ip = try(google_compute_address.public[0].address, "0.0.0.0")

  server_url = var.server_hostname != "" ? "https://${var.server_hostname}" : "https://${replace(local.public_ip, ".", "-")}.nip.io"

  server_host = var.server_hostname != "" ? var.server_hostname : "${replace(local.public_ip, ".", "-")}.nip.io"

  # GCS XML API, S3-interoperability endpoint. Twenty talks to it through its S3 driver.
  storage_endpoint = "https://storage.googleapis.com"

  # Injected verbatim so deploy/pashx-mab/ stays the single source of truth for what runs on the
  # VM. Read with file(), not templatefile(), because the compose file contains its own
  # shell-style ${...} references that must reach the VM untouched.
  compose_content        = file("${path.module}/../../../deploy/pashx-mab/docker-compose.cloud.yml")
  otel_collector_content = file("${path.module}/../../../deploy/pashx-mab/otel-collector-config.yaml")

  startup_script = templatefile("${path.module}/templates/startup-script.sh.tftpl", {
    project_id             = var.project_id
    region                 = var.region
    name_prefix            = var.name_prefix
    container_image        = var.container_image
    server_url             = local.server_url
    server_host            = local.server_host
    bucket_name            = try(google_storage_bucket.documents[0].name, "")
    storage_endpoint       = local.storage_endpoint
    compose_content        = local.compose_content
    otel_collector_content = local.otel_collector_content
  })
}

# Tracks the rendered startup script so the VM can be forced to recreate when it changes.
#
# This exists because of a real defect found during the first CL3 deploy: changing
# container_image only alters metadata.startup-script, and Terraform reported
# "will be updated in-place". GCE runs a startup script ONLY AT BOOT, so an in-place metadata
# update writes the new script and never executes it — the deploy reports success, the VM keeps
# running its previous state, the new image is never pulled, and /healthz is polled forever
# against a change that silently did nothing.
#
# The startup-script template itself says "edit the template and recreate the instance". That
# instruction was correct and the deploy path ignored it. Encoding it here makes the invariant
# structural rather than a thing the operator has to remember.
resource "terraform_data" "startup_script_revision" {
  count = local.gate

  input = sha256(local.startup_script)
}

# TLS certificate storage that OUTLIVES the VM.
#
# Caddy's /data holds the ACME account and issued certificates. It was originally a docker named
# volume, which lives on the boot disk — and the deploy mechanism for this environment REPLACES the
# instance (see replace_triggered_by below). So every single deploy destroyed the certificate store
# and forced a fresh Let's Encrypt issuance.
#
# That is not free. Let's Encrypt allows 5 certificates per exact set of identifiers per 168 hours.
# Twelve VM replacements exhausted it and public HTTPS went down hard:
#   HTTP 429 urn:ietf:params:acme:error:rateLimited - too many certificates (5) already issued
#   for this exact set of identifiers in the last 168h0m0s
# with Caddy falling back to an untrusted staging certificate, so every client got
#   SSL routines::tlsv1 alert internal error
#
# A separate persistent disk survives instance replacement, so the certificate is issued once and
# reused across deploys. This also removes the rate limit from the deploy path entirely, which
# matters more than the disk: it means the number of deploys is no longer bounded by an external
# quota we do not control.
#
# 10 GB pd-standard is the smallest supported size and costs roughly ₹35/month — the cheapest
# resource in the environment, protecting the only one with a hard external rate limit.
resource "google_compute_disk" "caddy_certs" {
  count = local.gate

  name   = "${var.name_prefix}-caddy-certs"
  type   = "pd-standard"
  zone   = var.zone
  size   = 10
  labels = local.common_labels

  lifecycle {
    # Destroying this disk means re-issuing the certificate, which is exactly what this resource
    # exists to prevent. Teardown must remove it deliberately, not as a side effect of a VM change.
    prevent_destroy = true
  }
}

resource "google_compute_instance" "app" {
  count = local.gate

  name         = "${var.name_prefix}-app"
  machine_type = var.vm_machine_type
  zone         = var.zone
  tags         = ["${var.name_prefix}-app"]
  labels       = local.common_labels

  # Certificate store. auto_delete is absent on purpose — the default is false for attached_disk,
  # and the disk must outlive this instance.
  attached_disk {
    source      = google_compute_disk.caddy_certs[0].id
    device_name = "caddy-certs"
    mode        = "READ_WRITE"
  }

  boot_disk {
    initialize_params {
      # Container-Optimized OS: read-only rootfs, automatic security updates, no package manager
      # to drift. Matches "no durable VM filesystem state".
      image  = "projects/cos-cloud/global/images/family/cos-stable"
      size   = var.vm_boot_disk_gb
      type   = "pd-balanced"
      labels = local.common_labels
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.app[0].id

    access_config {
      nat_ip       = google_compute_address.public[0].address
      network_tier = "PREMIUM"
    }
  }

  # Explicit, non-default identity. Without this block the VM would silently inherit the default
  # compute service account, which the inventory found holding project-wide roles/editor.
  service_account {
    email  = google_service_account.runtime[0].email
    scopes = ["https://www.googleapis.com/auth/cloud-platform"]
  }

  metadata = {
    enable-oslogin         = "TRUE"
    block-project-ssh-keys = "TRUE"
    startup-script         = local.startup_script

    # Ops Agent installs itself from the COS image's google-cloud-ops-agent container.
    google-logging-enabled    = "true"
    google-monitoring-enabled = "true"
  }

  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }

  allow_stopping_for_update = true

  # A new digest must produce a new VM, not an in-place mutation of a long-lived one.
  lifecycle {
    # false, not true: the VM holds the single static external IP, and two instances cannot bind
    # it simultaneously. This does mean a brief gap during a deploy, which is acceptable for a
    # pilot with no real users and is the reason the VM is designed to hold no durable state.
    create_before_destroy = false
    ignore_changes        = [] # deliberately empty: image drift must be visible in the plan

    # Any change to the rendered startup script — a new image digest, a new secret name, a new
    # collector config — must RECREATE the instance so the script actually runs. Without this the
    # deploy is a silent no-op. See terraform_data.startup_script_revision above.
    replace_triggered_by = [terraform_data.startup_script_revision[0]]
  }

  depends_on = [
    google_sql_database_instance.main,
    google_secret_manager_secret_version.pg_database_url,
    google_artifact_registry_repository.images,
  ]
}
