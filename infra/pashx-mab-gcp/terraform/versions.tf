terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.12"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone

  # Fixes a real incident from the first Cloud Shell apply attempt: `project` above sets which
  # project each RESOURCE is created in, but Google's client libraries attach a SEPARATE "quota
  # project" header to every API call for billing/quota tracking, and that comes from
  # Application Default Credentials, not from this block. In Cloud Shell, ADC's quota project is
  # whatever `gcloud config set project` was last set to — which was `pashxd`, an unrelated
  # project — not `pashx-mab-pilot`. Every google_project_service call failed with
  # "Cloud Resource Manager API has not been used in project pashxd" as a result, even though
  # every resource in this plan correctly targeted pashx-mab-pilot.
  #
  # user_project_override + billing_project pins the quota project explicitly, so the apply is
  # correct regardless of whatever project the calling shell happens to have active — Cloud
  # Shell, this workstation, or a CI runner.
  user_project_override = true
  billing_project       = var.project_id
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
  zone    = var.zone

  user_project_override = true
  billing_project       = var.project_id
}
