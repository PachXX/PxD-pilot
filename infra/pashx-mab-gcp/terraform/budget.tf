# Budget alert. The graph forbids creating billable resources before a budget ceiling is
# recorded, so this is created in the same apply as the first billable resource.
#
# A budget alert does NOT cap spend — GCP has no hard spend cap. It notifies at thresholds. The
# enforcement mechanism for the pilot is human: on the 100% alert, run the teardown runbook.
#
# ALREADY CREATED OUT OF BAND on 2026-08-06, because the ceiling was needed before the H0 gate
# opened. Adopt it instead of creating a duplicate:
#
#   terraform import 'google_billing_budget.pilot[0]' \
#     billingAccounts/0154D8-6A85C0-668177/budgets/a63f7501-68f3-4630-b44b-b12cc62ec353
#
# Without the import, the first gate-open apply creates a SECOND budget over the same project.

resource "google_billing_budget" "pilot" {
  count = var.h0_controls_recorded && var.billing_account_id != "" ? 1 : 0

  billing_account = var.billing_account_id
  display_name    = "${var.name_prefix} pilot monthly ceiling"

  budget_filter {
    # Project NUMBER, not id. The Budget API stores and returns the number, so writing the id
    # here produced a perpetual diff: every plan showed projects/<number> -> projects/<id> and
    # every apply "fixed" it, then it drifted straight back. A plan that never reads clean is
    # how a real change gets missed, so the config matches what the API actually stores.
    projects               = ["projects/${data.google_project.this.number}"]
    calendar_period        = "MONTH"
    credit_types_treatment = "INCLUDE_ALL_CREDITS"
  }

  amount {
    specified_amount {
      currency_code = var.budget_currency_code
      units         = tostring(var.budget_amount)
    }
  }

  threshold_rules {
    threshold_percent = 0.5
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 0.8
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  # Forecast alert gives warning before the ceiling is actually reached.
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "FORECASTED_SPEND"
  }

  all_updates_rule {
    monitoring_notification_channels = [google_monitoring_notification_channel.email[0].id]
    disable_default_iam_recipients   = false
  }

  depends_on = [google_project_service.required]
}
