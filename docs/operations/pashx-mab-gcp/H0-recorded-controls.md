# H0 — recorded Google Cloud controls

- Node: H0 (owner Shahil, captured by Claude Code)
- Date recorded: 2026-08-06
- Consumed by: CL0 apply gate (`var.h0_controls_recorded`)

The execution graph forbids creating billable resources until these six are recorded. This is
the record. Where a value is provisional, it says so and states what would change it.

| # | Control | Recorded value | Status |
|---|---|---|---|
| 1 | Target project | `pashx-mab-pilot` (`673510652800`) | **firm** — created, billing linked |
| 2 | Region | `me-central2` (Dammam), zone `me-central2-a` | **firm** — immutable after apply |
| 3 | Public hostname | none; `nip.io` fallback from the static IP | **provisional** — see below |
| 4 | Budget ceiling | ₹9,000/month, scoped to this project only | **firm** — created, id `a63f7501-…` |
| 5 | Data classification | `disposable` | **firm, and enforced in code** |
| 6 | Deploy authority | `pashx-mab-deployer@` for CI; Shahil is the sole human | **provisional** — see below |

Sizing follows from 4: lean tier plus scheduled shutdown, ~₹7,000/month. See
[`runbook-scheduled-shutdown.md`](runbook-scheduled-shutdown.md).

## 3 — Public hostname: `nip.io` fallback, provisionally

No domain is mapped anywhere in the account; the existing PashxD product runs on `run.app` URLs.
With no domain to point at, the pilot uses the wildcard-DNS fallback: the static IP `34.1.2.3`
resolves as `34-1-2-3.nip.io`, and Caddy obtains a Let's Encrypt certificate for it.

**Why this is acceptable now.** The CL0 acceptance criterion is that only HTTPS is public and the
certificate validates — both hold. The environment has test users only. The static IP survives
the nightly shutdown, so the hostname is stable across restarts.

**Why it is not acceptable later, and what to do.** Three concrete problems:

1. It puts a **third-party DNS service in the path** of a pilot chosen for in-kingdom data
   residency. `nip.io` is not operated by you and has no availability commitment. If it is down,
   Let's Encrypt renewal fails and, 90 days later, so does HTTPS.
2. `nip.io` is on the Public Suffix List, so Let's Encrypt rate limits are per-subdomain rather
   than shared — but repeated VM rebuilds that change the IP will burn issuance attempts.
3. It is not a hostname you can put in front of MAB.

Before MAB user-facing acceptance: register a hostname, create a Cloud DNS zone or add an A
record at your existing registrar pointing at the static IP, and set `server_hostname`. Nothing
else changes — Caddy picks up the new name and re-issues, and `SERVER_URL`, the CORS origin on
the document bucket, and the uptime check all derive from the same variable.

## 5 — Data classification: `disposable`, enforced

This is the one control that is a **mechanism rather than a promise**. `var.data_classification`
accepts only `disposable` or `real`, and `guards.tf` fails the plan on two combinations:

| Rejected combination | Why |
|---|---|
| `real` + `schedule_enabled = true` | A stopped Cloud SQL instance writes no transaction log, so PITR has nightly and weekend gaps. Acceptable against disposable data; not against real MAB financial records |
| `real` + `h0_controls_recorded = true` | The `twenty_test` disposable database and the destructive CL2 test path both assume disposable data. Promoting to real data must go through the SG gate, not a variable flip |

Verified: setting `data_classification=real` against the current configuration fails the plan
with two preconditions.

The value is also stamped as a `data_class` label on every resource, so classification is visible
in the console and in billing exports rather than living only in this document.

**This also resolves the tension IDR-0001 flagged** when `me-central2` was chosen. In-kingdom
residency was picked as *forward-looking insurance*, because the region is immutable and moving
later is a rebuild — not because real Saudi data is expected during the pilot. The data stays
disposable until SG, and the code now refuses to let those two statements drift apart.

## 6 — Deploy authority: the deployer service account, provisionally

**Machine deploy authority: `pashx-mab-deployer@pashx-mab-pilot.iam.gserviceaccount.com`.** It
can push an image to Artifact Registry and roll the single VM. It deliberately **cannot** read
application secrets, administer Cloud SQL, or change IAM. See
[`iam-design.md`](iam-design.md).

**Human authority: Shahil, sole `roles/owner`.** This is the provisional part, and the honest
statement is that human-path least privilege cannot currently be *demonstrated* — one principal
is owner, deployer, and operator simultaneously. The machine path is provably least-privilege;
the human path is a single trusted account.

For a one-person pilot this is a reasonable and common position. It should not survive contact
with real MAB data. Before then:

- Move day-to-day work to a non-owner principal holding `roles/compute.osLogin`,
  `roles/iap.tunnelResourceAccessor`, and `roles/monitoring.viewer`.
- Reserve `roles/owner` for break-glass, and note each use.
- Grant production promotion to a principal distinct from the one that authors the change.

Recorded as CL0 findings 1 and 2 in [`iam-design.md`](iam-design.md#findings-and-residual-risk).

## What is still not settled

None of these block apply. All of them block *MAB user-facing acceptance*.

| Item | Blocks |
|---|---|
| A real hostname | showing the pilot to MAB |
| A non-owner human principal | demonstrating least privilege at the SG gate |
| Promotion from `disposable` to `real` | the SG gate itself, by design |
| An offline copy of `ENCRYPTION_KEY` | any restore after total project loss |
