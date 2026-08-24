# `infra/pashx-mab-gcp`

Reproducible Google Cloud infrastructure for the PashX MAB pilot. Owned by node CL0 (Claude
Code) per `docs/execution/2026-08-05 - Codex Claude Graph Engineering.md`.

Operational documentation lives in `docs/operations/pashx-mab-gcp/`. This README covers the code.

## Status

**Nothing is provisioned.** The H0 controls — target project, region, hostname, budget ceiling,
data classification, and deploy authority — are not yet recorded, and the configuration refuses
to create billable resources until they are. See
`docs/operations/pashx-mab-gcp/IDR-0001-target-project-and-topology.md`, which recommends against
the currently recorded project.

## The H0 gate

`var.h0_controls_recorded` defaults to `false`. Every billable resource multiplies its `count` by
`local.gate`, so with the gate closed:

- `terraform validate` and `terraform plan` fully typecheck the configuration;
- the plan creates only `google_project_service` entries, which are free, plus one local
  `terraform_data` guard that makes no API call;
- nothing costs money and nothing can be accidentally applied.

Flip it to `true` only after the six inputs are recorded in the shared Obsidian context and the
plan plus cost summary have been reviewed. That is the graph's creation gate, expressed as code
instead of as a promise.

## Layout

```
infra/pashx-mab-gcp/
├── README.md
├── .gitignore                  state, tfvars, backend, and key files are never committed
├── terraform/
│   ├── versions.tf             provider pins
│   ├── variables.tf            every input, with validation on region and image pinning
│   ├── apis.tf                 service enablement — NOT gated, enabling an API is free
│   ├── network.tf              VPC, subnet, PSA peering, NAT, static IP, firewall
│   ├── sql.tf                  private Cloud SQL PG16, backups, PITR, disposable test database
│   ├── storage.tf              versioned document bucket
│   ├── secrets.tf              Artifact Registry + Secret Manager containers
│   ├── iam.tf                  runtime and deployer service accounts, resource-scoped roles
│   ├── compute.tf              the application VM
│   ├── monitoring.tf           uptime, alerts, log-based metrics
│   ├── budget.tf               budget alert at 50/80/100% and forecast
│   ├── guards.tf               cross-variable preconditions the gate depends on
│   ├── outputs.tf              acceptance evidence; no secret values
│   ├── backend.tf.example      remote state template
│   ├── terraform.tfvars.example
│   └── templates/
│       └── startup-script.sh.tftpl
└── scripts/
    ├── 00-inventory.sh         read-only; safe before the gate
    ├── 10-enable-apis.sh       free; safe before the gate
    ├── 20-create-state-bucket.sh
    ├── 30-put-secrets.sh
    ├── 40-create-storage-hmac.sh
    ├── 50-verify-acceptance.sh read-only acceptance check, prints a markdown table
    └── 90-teardown.sh          destructive; refuses to run against protected projects
```

## Topology

```
                    Internet
                       │ HTTPS 443 only
                 ┌─────▼──────┐
                 │ static IP  │
                 └─────┬──────┘
  ┌────────────────────▼─────────────────────┐   VPC, no default network
  │ GCE VM (COS, Shielded, no default SA)    │
  │  caddy → server:3000 → worker            │
  │  redis (container, noeviction)           │
  │  secrets in tmpfs only                   │
  └──────┬───────────────────────┬───────────┘
         │ private IP            │ Cloud NAT (egress only)
  ┌──────▼────────┐              └──────────► internet
  │ Cloud SQL PG16│  no public IP · ENCRYPTED_ONLY · PITR 7d
  │  twenty       │  pilot database
  │  twenty_test  │  disposable boundary for destructive T3 tests
  └───────────────┘
         GCS bucket (versioned) ◄── S3 driver ── server
         Secret Manager, Artifact Registry, Logging, Monitoring
```

## Design decisions worth knowing before editing

- **The VM is disposable.** No durable application state on its filesystem, no `local-storage`
  volume. `STORAGE_TYPE=s3` sends every byte to GCS. Replacing the VM is a supported rollback.
- **Secrets never enter state or git**, with one unavoidable exception: Terraform generates the
  Cloud SQL password, so it lands in state. State therefore lives in a private versioned bucket
  and is treated as a secret. See `docs/operations/pashx-mab-gcp/iam-design.md`.
- **The image must be digest-pinned.** `var.container_image` validation rejects a tag. A tag can
  be repointed; CL3 evidence needs a reference that cannot.
- **The VM always sets an explicit service account.** Omitting it makes GCE fall back to the
  default compute SA, which the inventory found holding project-wide `roles/editor`.
- **Redis is a container, not Memorystore.** Saves ~$35/month; costs queue durability, which the
  pilot does not need because every authoritative write is in the Cloud SQL transaction.
- **`disable_on_destroy = false` on every API.** Disabling APIs on destroy would break unrelated
  workloads in a shared project and gains nothing in a dedicated one.

## Usage

Full procedure: `docs/operations/pashx-mab-gcp/runbook-deploy.md`. Short form:

```bash
infra/pashx-mab-gcp/scripts/00-inventory.sh <PROJECT> <REGION>
```

```bash
infra/pashx-mab-gcp/scripts/10-enable-apis.sh <PROJECT>
```

```bash
cd infra/pashx-mab-gcp/terraform && cp terraform.tfvars.example terraform.tfvars && terraform init && terraform validate && terraform plan
```

With the gate open, after `20-create-state-bucket.sh` and `terraform init -migrate-state`:

```bash
cd infra/pashx-mab-gcp/terraform && terraform plan -out=cl0.tfplan
```

```bash
cd infra/pashx-mab-gcp/terraform && terraform apply cl0.tfplan
```

## Verification status

Verified with Terraform v1.15.8, provider `hashicorp/google` 6.50.0:

| Check | Result |
|---|---|
| `terraform init` | providers installed and pinned in the committed `.terraform.lock.hcl` |
| `terraform validate` | Success |
| `terraform fmt -check -recursive` | clean |
| `terraform plan`, gate closed | `16 to add` — 15 free `google_project_service` + 1 local `terraform_data`. **Zero billable resources** |
| `terraform plan`, gate open with complete inputs | `72 to add`, no errors |
| Tag-only `container_image` | rejected |
| Region outside the two H0 candidates | rejected |
| Gate open with no billing account | rejected by precondition |

Four defects were found and fixed during this pass; see
`docs/operations/pashx-mab-gcp/CL0-provisioning-evidence.md`, section "Defects found by
validation and fixed".

**Still unverified:** everything that needs a live environment — apply, smoke checks, the Gate 0
storage suite, and the backup, rollback, and teardown rehearsals. A plan is not an apply.

## Ownership boundary

CL0 owns `infra/pashx-mab-gcp/`, `deploy/pashx-mab/`, and `docs/operations/pashx-mab-gcp/`.
It does not modify PashX production source, contract or app source, existing manifests, the
lockfile, module registration, `docs/architecture/`, `DESIGN.md`, or `TODOS.md`. Infrastructure
needs that require application changes are recorded as requests in the shared context for Codex.
