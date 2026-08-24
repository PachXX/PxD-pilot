# Private VPC. The application VM has no public IP; it reaches the internet through Cloud NAT
# and is reached by operators only through IAP. Cloud SQL is peered over Private Services Access
# and has no public IP at all.

locals {
  # Every billable resource multiplies its count by this. Before H0 is recorded, `terraform plan`
  # produces a zero-resource plan for billable infrastructure while still validating the config.
  gate = var.h0_controls_recorded ? 1 : 0
}

resource "google_compute_network" "vpc" {
  count = local.gate

  name                    = "${var.name_prefix}-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"

  depends_on = [google_project_service.required]
}

resource "google_compute_subnetwork" "app" {
  count = local.gate

  name                     = "${var.name_prefix}-subnet-${var.region}"
  ip_cidr_range            = var.subnet_cidr
  region                   = var.region
  network                  = google_compute_network.vpc[0].id
  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# --- Private Services Access for Cloud SQL -----------------------------------

resource "google_compute_global_address" "psa" {
  count = local.gate

  name          = "${var.name_prefix}-psa-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  address       = var.psa_cidr
  prefix_length = var.psa_prefix_length
  network       = google_compute_network.vpc[0].id
}

resource "google_service_networking_connection" "psa" {
  count = local.gate

  network                 = google_compute_network.vpc[0].id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.psa[0].name]
}

# --- Egress ------------------------------------------------------------------

resource "google_compute_router" "nat" {
  count = local.gate

  name    = "${var.name_prefix}-router"
  region  = var.region
  network = google_compute_network.vpc[0].id
}

resource "google_compute_router_nat" "nat" {
  count = local.gate

  name                               = "${var.name_prefix}-nat"
  router                             = google_compute_router.nat[0].name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# --- Ingress -----------------------------------------------------------------

# The only public address in the environment. Attached to the VM's forwarded HTTPS path.
resource "google_compute_address" "public" {
  count = local.gate

  name         = "${var.name_prefix}-public-ip"
  region       = var.region
  address_type = "EXTERNAL"
  network_tier = "PREMIUM"
}

resource "google_compute_firewall" "allow_https" {
  count = local.gate

  name    = "${var.name_prefix}-allow-https"
  network = google_compute_network.vpc[0].id

  # 80 is open only so the ACME HTTP-01 challenge can complete; the proxy redirects it to 443.
  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["${var.name_prefix}-app"]
  priority      = 1000

  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }
}

resource "google_compute_firewall" "allow_iap_ssh" {
  count = local.gate

  name    = "${var.name_prefix}-allow-iap-ssh"
  network = google_compute_network.vpc[0].id

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = var.operator_source_ranges
  target_tags   = ["${var.name_prefix}-app"]
  priority      = 1000

  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }
}

# Explicit deny so that "the database is not publicly exposed" is enforced by a rule, not by the
# absence of one. Nothing in this VPC should ever accept traffic on 5432 or 6379 from outside it.
resource "google_compute_firewall" "deny_external_data_ports" {
  count = local.gate

  name    = "${var.name_prefix}-deny-external-data-ports"
  network = google_compute_network.vpc[0].id

  deny {
    protocol = "tcp"
    ports    = ["5432", "6379"]
  }

  direction     = "INGRESS"
  source_ranges = ["0.0.0.0/0"]
  priority      = 900

  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }
}
