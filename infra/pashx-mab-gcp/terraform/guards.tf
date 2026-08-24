# Cross-variable preconditions.
#
# Terraform variable `validation` blocks cannot reference another variable, so the rules that
# span inputs live here. `terraform_data` creates nothing; its preconditions are evaluated during
# plan and fail the plan, not the apply.

locals {
  # Asia/Riyadh is UTC+3 year-round (no DST), so a fixed offset is correct here. If
  # schedule_timezone is ever changed to a DST-observing zone, this guard becomes approximate
  # and the backup window should be re-checked by hand.
  schedule_utc_offset_hours = var.schedule_timezone == "Asia/Riyadh" ? 3 : 0
}

resource "terraform_data" "h0_gate_preconditions" {
  lifecycle {
    # Found by the first real gate-open plan: with h0_controls_recorded = true and an empty
    # billing_account_id, budget.tf's count evaluated to 0 — the plan produced 70 billable
    # resources and no budget alert at all. That is exactly the situation the graph's creation
    # gate exists to prevent, so it is now a hard plan failure.
    precondition {
      condition     = !var.h0_controls_recorded || var.billing_account_id != ""
      error_message = "h0_controls_recorded is true but billing_account_id is empty. The budget alert would not be created, so billable resources would exist with no cost ceiling. Record the billing account (gcloud beta billing accounts list) before opening the gate."
    }

    precondition {
      condition     = !var.h0_controls_recorded || var.budget_amount > 0
      error_message = "budget_amount must be greater than zero when the gate is open."
    }

    # The zone must be inside the region, or Cloud SQL and the VM end up in different regions
    # and the private-IP path silently costs cross-region egress.
    precondition {
      condition     = startswith(var.zone, "${var.region}-")
      error_message = "zone must be inside region. Got zone '${var.zone}' with region '${var.region}'."
    }

    # Data classification (H0 input 5) is a mechanism here, not a note in a document.
    #
    # Scheduled shutdown means Cloud SQL writes no transaction log overnight, so point-in-time
    # recovery has nightly and weekend gaps. That is fine for disposable pilot data and is not
    # fine for real MAB financial records. Rather than leaving the two settings independently
    # adjustable and hoping nobody combines them, the combination fails the plan.
    precondition {
      condition     = var.data_classification == "disposable" || !var.schedule_enabled
      error_message = "data_classification is 'real' but schedule_enabled is true. A stopped Cloud SQL instance produces no transaction log, so PITR would have nightly and weekend gaps against real MAB data. Set schedule_enabled = false (and raise the budget to ~27000 INR — see cost-estimate.md), or keep the data disposable."
    }

    # The disposable test database exists so CL2 can drop and recreate it. Against real data that
    # is a loaded gun sitting in the same instance.
    precondition {
      condition     = var.data_classification == "disposable" || !var.h0_controls_recorded
      error_message = "data_classification 'real' is not yet supported by this configuration: the twenty_test disposable database and the destructive CL2 test path both assume disposable data. Promoting to real data is a deliberate change that must go through the SG gate, not a variable flip."
    }

    # The backup window must fall inside the scheduled running window. A stopped Cloud SQL
    # instance takes no automated backup and raises no error, so this misconfiguration is
    # invisible until a restore is attempted and there is nothing to restore from.
    #
    # Compares the backup hour (UTC) against the start/stop crons converted to UTC. Only the
    # hour is compared, which is enough for the whole-hour schedules this module uses.
    precondition {
      condition = (
        !var.schedule_enabled ||
        !var.h0_controls_recorded ||
        (
          tonumber(split(":", var.sql_backup_start_time_utc)[0]) >= (tonumber(split(" ", var.schedule_start_cron)[1]) - local.schedule_utc_offset_hours) &&
          tonumber(split(":", var.sql_backup_start_time_utc)[0]) < (tonumber(split(" ", var.schedule_stop_cron)[1]) - local.schedule_utc_offset_hours)
        )
      )
      error_message = "sql_backup_start_time_utc (${var.sql_backup_start_time_utc} UTC) falls outside the scheduled running window (${var.schedule_start_cron} to ${var.schedule_stop_cron} ${var.schedule_timezone}). A stopped Cloud SQL instance takes NO automated backup and reports no error. Move the backup time inside the window."
    }

    precondition {
      condition     = !var.schedule_enabled || can(regex("^[0-9]+ [0-9]+ ", var.schedule_start_cron)) && can(regex("^[0-9]+ [0-9]+ ", var.schedule_stop_cron))
      error_message = "schedule_start_cron and schedule_stop_cron must begin with literal minute and hour fields (e.g. \"0 8 * * 0-4\"); the backup-window guard cannot reason about wildcards or step values there."
    }

    # The PSA range and the subnet must not overlap, or Cloud SQL peering conflicts with the VM
    # subnet and the apply fails partway through.
    #
    # Terraform has no CIDR containment function, so this is a HEURISTIC, not a proof: it
    # compares the first two octets, which catches every realistic misconfiguration for the
    # RFC1918 /16-and-narrower ranges this module uses (defaults 10.20.0.0/24 and 10.30.0.0/16).
    # It would not catch an exotic overlap across differing prefix lengths. Verify the plan.
    precondition {
      condition     = join(".", slice(split(".", var.psa_cidr), 0, 2)) != join(".", slice(split(".", var.subnet_cidr), 0, 2))
      error_message = "psa_cidr and subnet_cidr share the same /16 and would overlap. Choose distinct ranges."
    }
  }
}

# A missing container image is a WARNING, not an error.
#
# This was originally a precondition and it was wrong: it blocked the CL0 apply outright, because
# the image is not built until CL3. CL0 provisions infrastructure; CL3 deploys the application.
# Conflating the two meant the infrastructure could never be created in the documented order.
check "container_image_is_set" {
  assert {
    condition     = !var.h0_controls_recorded || var.container_image != ""
    error_message = "container_image is empty, so the VM will boot and its startup script will exit 1 without starting any container. That is the expected state between CL0 (provision) and CL3 (deploy) — but the /healthz uptime alert WILL fire until an image is deployed. Either deploy immediately with deploy/pashx-mab/deploy.sh, or expect the alert."
  }
}
