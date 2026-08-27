# Blocker — `me-central2` region access denied

- Node: CL0 (apply)
- Owner: Claude Code; resolution requires Shahil
- Found: 2026-08-06 during the first apply attempt
- Status: **open — apply paused by decision, waiting on Google to grant region access**

## What happened

The CL0 apply was authorized and began at Phase 2 (create the Terraform state bucket). It failed
immediately:

```
ERROR: (gcloud.storage.buckets.create) HTTPError 403:
Permission denied on 'locations/me-central2' (or it may not exist).
```

This is not a Cloud Storage problem. Probing confirmed the whole region is closed to this
account:

| Probe | Region | Result |
|---|---|---|
| `gcloud storage buckets create` | `me-central2` | **403 Permission denied on locations/me-central2** |
| `gcloud compute addresses create` | `me-central2` | **403 Permission denied on locations/me-central2** |
| `gcloud compute networks subnets create` | `me-central2` | **403 Permission denied on locations/me-central2** |
| `gcloud storage buckets create` | `me-central1` | succeeded |
| `gcloud compute addresses create` | `me-central1` | succeeded |
| `gcloud storage buckets create` | `europe-west1` | succeeded |

Every probe resource was deleted immediately. The project holds zero resources.

`me-central2` (Dammam) is one of Google Cloud's **restricted regions**: available in the API
surface but requiring an explicit per-account access grant before any resource can be created
there. This is why the earlier availability checks passed and were still not sufficient.

## Why the earlier verification did not catch this

Worth recording, because the same trap applies to any restricted region.

The pre-flight checks run when the region was recorded were all **read** operations:

- `gcloud compute zones list --filter="region:me-central2"` → three zones UP
- `gcloud compute machine-types list` → `e2-standard-4` present in all three zones
- `gcloud sql tiers list` → `me-central2` listed as a supported Cloud SQL region
- `terraform plan` → 89 resources, all placed in `me-central2`, no errors

Every one of those still passes today. Region metadata is world-readable, and **`terraform plan`
does not attempt to create anything**, so it cannot detect a location-level authorization
failure. A green plan is not proof that a region is usable.

The check that would have caught it is the one that was only run at apply time: creating a real
resource. That probe now exists in
[`runbook-deploy.md`](runbook-deploy.md) Phase 1 so it happens before the region is recorded, not
after.

## Decision

**Shahil chose on 2026-08-06: request `me-central2` access and pause the apply.**

The reason `me-central2` was selected in the first place — in-kingdom Saudi data residency, on a
region that is immutable once Cloud SQL exists — is unchanged by this. Substituting Qatar or
Belgium to unblock a few days of work would trade the actual objective for schedule.

Alternatives that were offered and declined:

| Option | Verified | Why declined |
|---|---|---|
| `me-central1` (Doha, Qatar) | works today | Middle East, low latency to Saudi, but **not in-kingdom**. Immutable, so a later residency requirement means a rebuild |
| `europe-west1` | works today | Cheapest (~₹5,800 scheduled vs ~₹7,000), matches the existing PashxD footprint, no residency or latency benefit |
| `europe-west1` now, rebuild in Saudi later | works today | Would unblock CL2/CL3 immediately; rejected in favour of getting the region right once |

## How to unblock

Region access is requested through Google, not through `gcloud`. Claude cannot do this — it needs
an account holder.

1. Google Cloud Console → **IAM & Admin → Settings**, or the Cloud Console region-access request
   flow, and request access to `me-central2` for project `pashx-mab-pilot`
   (`673510652800`) on billing account `0154D8-6A85C0-668177`.
2. If no self-serve option appears, raise it through Cloud Support or your Google sales contact.
   Restricted-region grants are usually handled at the billing-account level.
3. Expect days, not hours.

Confirm the grant landed with a real create, not a read:

```bash
gcloud compute addresses create regiontest --region=me-central2 --project=pashx-mab-pilot && gcloud compute addresses delete regiontest --region=me-central2 --project=pashx-mab-pilot -q
```

If that round-trips cleanly, the region is open and apply can proceed from Phase 2 of
[`runbook-deploy.md`](runbook-deploy.md) unchanged.

## State of the work while paused

Nothing needs redoing. The configuration is staged and apply-ready:

| | |
|---|---|
| `terraform validate` | Success |
| `terraform fmt -check -recursive` | clean |
| Gate-closed plan | `19 to add` — all free |
| Gate-open plan | `89 to add`, no errors |
| Cloud resources in `pashx-mab-pilot` | **none** |
| Budget | live, ₹9,000/month, scoped to this project only |

One defect was found and fixed while confirming the apply path is genuinely one command:

**The `container_image` precondition would have blocked the CL0 apply outright.** It required a
digest-pinned image whenever the gate was open — but the image is not built until CL3. CL0
provisions infrastructure; CL3 deploys the application. Conflating the two made the documented
order impossible to execute. It is now a `check` block that warns instead of failing, and the
warning says plainly that `/healthz` will alert until an image is deployed.

## Separate finding: the auto-created `default` VPC

Project creation added a `default` auto-mode VPC with the standard permissive rules:

| Rule | Priority | Allows |
|---|---|---|
| `default-allow-ssh` | 65534 | `tcp:22` from `0.0.0.0/0` |
| `default-allow-rdp` | 65534 | `tcp:3389` from `0.0.0.0/0` |
| `default-allow-icmp` | 65534 | `icmp` from `0.0.0.0/0` |
| `default-allow-internal` | 65534 | all TCP/UDP within the network |

**This does not expose the pilot.** The MAB VM is created in `pashx-mab-vpc`, and firewall rules
do not cross VPCs. But an unused network with world-open SSH is exactly the kind of thing that
catches something later by accident, and the CL0 acceptance criterion is "only HTTPS is public".

Recommended cleanup before apply — it is empty, so this is safe:

```bash
gcloud compute firewall-rules delete default-allow-ssh default-allow-rdp default-allow-icmp default-allow-internal --project=pashx-mab-pilot -q && gcloud compute networks delete default --project=pashx-mab-pilot -q
```

Not done unilaterally: deleting a network is destructive, and it is Shahil's project.
