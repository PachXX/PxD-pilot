# Outputs deliberately expose no secret value. `terraform output` is safe to paste into evidence.

output "h0_gate_open" {
  description = "False means this plan creates no billable resource. Flip var.h0_controls_recorded only after Shahil records the H0 inputs."
  value       = var.h0_controls_recorded
}

output "server_url" {
  description = "Canonical external HTTPS origin. Set this as SERVER_URL."
  value       = local.server_url
}

output "public_ip" {
  description = "The single public address in the environment."
  value       = local.public_ip
}

output "vpc_name" {
  value = try(google_compute_network.vpc[0].name, null)
}

output "vm_name" {
  value = try(google_compute_instance.app[0].name, null)
}

output "vm_zone" {
  value = var.zone
}

output "sql_instance_name" {
  value = try(google_sql_database_instance.main[0].name, null)
}

output "sql_connection_name" {
  description = "For Cloud SQL Auth Proxy and gcloud sql commands."
  value       = try(google_sql_database_instance.main[0].connection_name, null)
}

output "sql_private_ip" {
  description = "Private IP only. There is no public IP on this instance by design."
  value       = try(google_sql_database_instance.main[0].private_ip_address, null)
}

output "sql_public_ip_is_absent" {
  description = "Acceptance evidence: must be true."
  value       = try(google_sql_database_instance.main[0].public_ip_address, "") == ""
}

output "documents_bucket" {
  value = try(google_storage_bucket.documents[0].name, null)
}

output "documents_bucket_versioning_enabled" {
  description = "Acceptance evidence: must be true."
  value       = try(google_storage_bucket.documents[0].versioning[0].enabled, null)
}

output "artifact_registry" {
  value = try("${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images[0].repository_id}", null)
}

output "runtime_service_account" {
  value = try(google_service_account.runtime[0].email, null)
}

output "deployer_service_account" {
  value = try(google_service_account.deployer[0].email, null)
}

output "secret_names" {
  description = "Secret Manager containers. Values are never in state except pg-database-url, which Terraform generates."
  value       = [for s in google_secret_manager_secret.app : s.secret_id]
}

output "p95_threshold_ms" {
  description = "Configured p95 threshold for the financial-command rollback detector."
  value       = var.p95_threshold_ms
}

output "p95_window" {
  description = "PromQL window for the p95 detector. Read by the alert drill script."
  value       = var.p95_window
}

output "p95_min_samples" {
  description = "Minimum samples in the window before the p95 alert may fire. Read by the alert drill script."
  value       = var.p95_min_samples
}

output "deployed_image" {
  description = "Digest-pinned image currently configured on the VM. This is the rollback target to record before every deploy."
  value       = var.container_image
}

output "disposable_test_database" {
  description = "CL2 destructive-test target. Never point destructive tests at the app database."
  value       = try(google_sql_database.disposable_test[0].name, null)
}
