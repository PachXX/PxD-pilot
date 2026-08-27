# CL0 — Read-only inventory of `pashxd-e56c5`

- Node: CL0
- Owner: Claude Code
- Date: 2026-08-05, Europe/Berlin
- Mode: read-only. No resource was created, modified, or deleted.
- Authenticated principal: `moideenshahil2@gmail.com` (`roles/owner`)

## Headline finding

**`pashxd-e56c5` is not an empty or dedicated environment. It is the live PashxD product project.**

It currently runs a production Cloud Run API, six scheduled Cloud Run agent jobs with active
outbound LinkedIn/blog/outreach automation, Firebase Auth, Firestore/Datastore, and a 4.9 GB
container registry. The execution graph records it only as the "detected GCP project"; that
detection is accurate about the account, and wrong as a *target* for the MAB pilot.

The graph requires a **dedicated MAB environment** with a **disposable database/workspace
boundary for destructive T3 tests**. Placing the MAB pilot into this project would put
destructive concurrency and rollback testing, VPC changes, firewall rules, and IAM changes into
the same blast radius as a running product. See
[`IDR-0001-target-project-and-topology.md`](IDR-0001-target-project-and-topology.md) for the
decision record and options.

This is an H0 input, not a CL0 decision. No billable resource is created until Shahil records it.

## Project

| Property | Value |
|---|---|
| Project ID | `pashxd-e56c5` |
| Project number | `214145020309` |
| Display name | `PashxD` |
| Created | 2026-07-05 |
| Lifecycle | `ACTIVE` |
| Ancestry | standalone — no organization, no folder |
| Labels | `firebase=enabled`, `firebase-core=disabled` |
| Billing | **unknown** — `cloudbilling.googleapis.com` is disabled, so billing account, budget, and spend could not be read |

Command: `gcloud projects describe pashxd-e56c5`, `gcloud projects get-ancestors pashxd-e56c5`.

## Existing workloads (all live)

### Cloud Run service

| Field | Value |
|---|---|
| Service | `pashxd-api` |
| Region | `europe-west1` |
| URL | `https://pashxd-api-q2ccs4ytaq-ew.a.run.app` |
| Image | `europe-west1-docker.pkg.dev/pashxd-e56c5/pashxd/pashxd-api:a916e75` |
| Runtime SA | `pashxd-api-runtime@pashxd-e56c5.iam.gserviceaccount.com` |
| Port | 8080 |
| Serving revision | `pashxd-api-00066-pgh` at 100% traffic |
| Last deployed | 2026-08-02 |
| Domain mappings | none |

### Cloud Run jobs and schedulers

| Job | Last run |
|---|---|
| `pashxd-blog-agent` | 2026-08-05 07:00 UTC |
| `pashxd-linkedin-agent` | 2026-08-05 07:30 UTC |
| `pashxd-outreach-agent` | 2026-08-05 06:30 UTC |
| `pashxd-saudi-lead-agent` | 2026-08-03 05:30 UTC |
| `pashxd-uk-eu-lead-agent` | 2026-08-03 06:00 UTC |

Six enabled Cloud Scheduler jobs in `europe-west1` drive them plus
`pashxd-mark-overdue-invoices` (daily 02:00 Europe/Berlin). **These fire daily and perform
outbound external actions.** Any teardown or IAM change must not touch them.

### Storage, registry, secrets

| Resource | Detail |
|---|---|
| Bucket `pashxd-e56c5-cloudbuild-source` | `EUROPE-WEST1`, uniform bucket-level access **off**, public access prevention inherited, versioning off |
| Bucket `pashxd-e56c5_cloudbuild` | multi-region `US` |
| Artifact Registry `pashxd` | Docker, `europe-west1`, 4895 MB, Google-managed key |
| Secret Manager | 13 secrets, all `pashxd-*`, automatic replication (`mongo-url`, `jwt-secret`, `anthropic-api-key`, `sendgrid`, `resend`, `linkedin-*`, `apify-token`, `cron-secret`, `admin-*`, `agent-password`) |

No MAB-related bucket, registry, or secret exists. Nothing to reuse; nothing to collide with by
name if the MAB prefix `pashx-mab-*` is used.

### Service accounts

| Service account | Purpose (inferred) |
|---|---|
| `pashxd-deployer@` | CI deployer — `roles/artifactregistry.writer`, `roles/cloudbuild.builds.editor` |
| `pashxd-api-runtime@` | Cloud Run runtime — `roles/datastore.user`, `roles/firebaseauth.admin` |
| `pashxd-scheduler-invoker@` | Cloud Scheduler → Cloud Run Jobs invoker |
| `firebase-adminsdk-fbsvc@` | Firebase Admin SDK |
| `214145020309-compute@developer` | **default compute SA holding `roles/editor`** |

IAM observations relevant to CL0:

- The only human principal is `user:moideenshahil2@gmail.com` with `roles/owner`. There is no
  separation between deploy authority and owner authority today.
- The default compute service account holds project-wide `roles/editor`. If a MAB GCE VM were
  created in this project without an explicit service account, it would inherit `editor` —
  directly violating the CL0 least-privilege acceptance criterion. The Terraform in
  `infra/pashx-mab-gcp/` always sets an explicit runtime service account for this reason.

## Enabled and missing APIs

Enabled and relevant: `artifactregistry`, `secretmanager`, `storage`, `logging`, `monitoring`,
`cloudtrace`, `cloudbuild`, `cloudscheduler`, `run`, `iam`, `iamcredentials`,
`cloudresourcemanager`, `serviceusage`, `sql-component`.

**Disabled — every one is required before CL0 can apply anything:**

| API | Needed for |
|---|---|
| `compute.googleapis.com` | GCE VM, VPC, firewall, static IP, Cloud NAT, load balancing |
| `sqladmin.googleapis.com` | Cloud SQL instance, backups, PITR (`sql-component` alone is not enough) |
| `servicenetworking.googleapis.com` | Private Services Access peering for private Cloud SQL |
| `cloudbilling.googleapis.com` | Reading the billing account; prerequisite for budgets |
| `billingbudgets.googleapis.com` | Creating the budget alert that the cost ceiling depends on |
| `oslogin.googleapis.com` | OS Login operator access |
| `iap.googleapis.com` | IAP-tunnelled SSH instead of public SSH |
| `redis.googleapis.com` | only if Memorystore is chosen over containerized Redis |

Enabling an API is not itself billable. `infra/pashx-mab-gcp/scripts/10-enable-apis.sh` performs
exactly this step and nothing else, and is safe to run before the H0 gate.

## Quotas

Compute Engine quotas could not be read because `compute.googleapis.com` is disabled
(`gcloud compute project-info describe` fails with `SERVICE_DISABLED`). Quota verification is
therefore deferred to immediately after API enablement and before apply; it is a listed step in
[`runbook-deploy.md`](runbook-deploy.md).

Expected new-project defaults are far above pilot need (24 vCPU/region, 8 in-use IPs, 1 Cloud SQL
instance is unlimited by quota). No quota increase is anticipated for the recommended sizing.

## Second project observed

`pashxd` (project number `420335801287`, display name `PashxD`) also exists and is nearly empty —
only default APIs, no Cloud Run, no compute. It is a viable low-collision alternative target, but
its name invites confusion with `pashxd-e56c5`. IDR-0001 recommends a clearly named new project
instead.

Other projects on the account, out of scope: `lynex-ai`, `gen-lang-client-0062331733`,
`project-aeb40bc6-…`.

## Commands run

All read-only:

```
gcloud auth list
gcloud config list
gcloud projects list
gcloud projects describe pashxd-e56c5
gcloud projects get-ancestors pashxd-e56c5
gcloud projects get-iam-policy pashxd-e56c5 --format=json
gcloud services list --enabled --project=pashxd-e56c5
gcloud storage buckets list --project=pashxd-e56c5
gcloud storage buckets describe gs://pashxd-e56c5-cloudbuild-source --project=pashxd-e56c5
gcloud artifacts repositories list --project=pashxd-e56c5
gcloud secrets list --project=pashxd-e56c5
gcloud iam service-accounts list --project=pashxd-e56c5
gcloud run services list --project=pashxd-e56c5
gcloud run services describe pashxd-api --region=europe-west1 --project=pashxd-e56c5
gcloud run jobs list --project=pashxd-e56c5
gcloud scheduler jobs list --location=europe-west1 --project=pashxd-e56c5
gcloud beta run domain-mappings list --region=europe-west1 --project=pashxd-e56c5
gcloud compute instances list --project=pashxd-e56c5      # SERVICE_DISABLED
gcloud compute networks list --project=pashxd-e56c5       # SERVICE_DISABLED
gcloud sql instances list --project=pashxd-e56c5          # SERVICE_DISABLED
gcloud beta billing projects describe pashxd-e56c5        # SERVICE_DISABLED
gcloud services list --enabled --project=pashxd
```

Only side effect of the session: `gcloud` auto-installed its local `beta` component. That is a
workstation change, not a cloud change, and is not billable. No secret value was read, printed,
or stored.

## Open H0 inputs blocked on Shahil

| Input | Status | Why it blocks apply |
|---|---|---|
| Target project | **contested** — see IDR-0001 | Determines blast radius |
| Region | not recorded — `europe-west1` is the existing footprint; `me-central2` (Dammam) is the ZATCA/Saudi-residency candidate | Region is immutable for Cloud SQL and the bucket |
| Public hostname | not recorded — no domain mapping exists anywhere in the account | Determines `SERVER_URL`, TLS strategy, and whether a managed cert is possible |
| Budget ceiling | not recorded; billing API disabled so current spend is unreadable | Budget alert must exist before billable apply |
| Data classification | not recorded | Decides whether disposable-only data is enforced by policy or convention |
| Deploy authority | today one principal is both owner and deployer | Least-privilege IAM split cannot be proven with one account |
