# CL0 — IAM design

- Node: CL0
- Owner: Claude Code
- Date: 2026-08-05
- Acceptance criterion this serves: "IAM is least privilege" (SG gate), "dedicated least-privilege
  deployer and runtime service accounts" (CL0), "no plaintext secrets" (CL0).

## Principles

1. **No principal holds a role it does not need for a step in a runbook.** If a role is not
   exercised by a documented command, it is not granted.
2. **Resource-scoped over project-scoped.** A project-level binding appears only where the API
   offers no narrower scope. Four such cases exist and are listed below with justification.
3. **The default compute service account is never used.** The inventory found it holding
   project-wide `roles/editor` in `pashxd-e56c5`. A VM created without an explicit
   `service_account` block inherits that. The Terraform always sets one.
4. **Secrets are granted per named secret.** There is no project-level
   `roles/secretmanager.secretAccessor`. A secret added later is unreadable until granted.
5. **Deploy authority cannot read application secrets.** The deployer can ship a new image and
   restart the VM. It cannot read `ENCRYPTION_KEY`, cannot administer Cloud SQL, and cannot
   delete the document bucket.
6. **No service account keys.** Every identity is used through attached-VM credentials, Cloud
   Build's own identity, or workload identity. No `.json` key file is created, downloaded, or
   stored. `infra/pashx-mab-gcp/.gitignore` blocks `*.json.key` as a backstop.

## Identities

### `pashx-mab-runtime@PROJECT.iam.gserviceaccount.com`

Attached to the application VM. Runs the Twenty server and worker containers.

| Role | Scope | Why it is needed |
|---|---|---|
| `roles/artifactregistry.reader` | the `pashx-mab-images` repository | pull the pinned image at boot |
| `roles/secretmanager.secretAccessor` | each of the 6 named secrets, individually | read config into tmpfs at boot |
| `roles/storage.objectAdmin` | the `pashx-mab-documents-*` bucket only | Twenty uploads, downloads, and deletes its own document objects |
| `roles/cloudsql.client` | **project** | Cloud SQL offers no resource-level connect binding. The role only permits connecting; it cannot create, delete, or restore an instance |
| `roles/logging.logWriter` | **project** | the Logging API has no resource-level write binding |
| `roles/monitoring.metricWriter` | **project** | same |
| `roles/cloudtrace.agent` | **project** | same |

Explicitly **not** granted: `roles/editor`, `roles/owner`, `roles/cloudsql.admin`,
`roles/storage.admin`, any bucket outside its own, any secret not in the list, and
`roles/iam.serviceAccountTokenCreator`.

### `pashx-mab-deployer@PROJECT.iam.gserviceaccount.com`

CI/deploy identity. Builds images and rolls the VM.

| Role | Scope | Why it is needed |
|---|---|---|
| `roles/artifactregistry.writer` | the `pashx-mab-images` repository | push a new image |
| `roles/compute.instanceAdmin.v1` | **the single application VM** | recreate/restart the VM to roll a digest |
| `roles/iam.serviceAccountUser` | the runtime SA only | required to start a VM that runs as the runtime SA |
| `roles/iap.tunnelResourceAccessor` | project | reach the VM for a smoke check without public SSH |

Explicitly **not** granted: `roles/secretmanager.secretAccessor` (the deployer must never read
application secrets), `roles/cloudsql.admin`, `roles/storage.admin`, project-wide
`roles/compute.admin`, and any ability to change IAM.

### Human operator — `moideenshahil2@gmail.com`

| Role | Scope | Notes |
|---|---|---|
| `roles/owner` | project | Inherent to the project creator. See the finding below |
| `roles/iap.tunnelResourceAccessor` | project | IAP-tunnelled SSH |
| `roles/compute.osLogin` | project | **not** `osAdminLogin` — no passwordless root by default |

### Google-managed service agents

Created automatically for Cloud SQL, Service Networking, Artifact Registry, Secret Manager, and
Cloud Build. Not granted or modified by this configuration.

## Access paths

```
Internet ──HTTPS 443──► static IP ──► Caddy (VM) ──► server:3000
                                                       │
Operator ──IAP tunnel──► SSH 22 (35.235.240.0/20 only)─┘

VM ──private IP──► Cloud SQL          (no public IP; ENCRYPTED_ONLY)
VM ──Cloud NAT───► internet egress    (no public inbound on the VM itself)
VM ──API──────────► Secret Manager, GCS, Logging, Monitoring
```

There is no path from the internet to Cloud SQL or Redis. `deny_external_data_ports` in
`network.tf` denies ingress on 5432 and 6379 from `0.0.0.0/0` at priority 900 so the property is
enforced by an explicit rule rather than by the absence of one.

## Secret handling

| Secret | Origin | Ever in Terraform state? | Ever in git? |
|---|---|---|---|
| `pashx-mab-pg-database-url` | Terraform generates the password and assembles the URL | **yes** — unavoidable, the SQL user cannot be created otherwise | no |
| `pashx-mab-app-secret` | `scripts/30-put-secrets.sh generate` | no | no |
| `pashx-mab-encryption-key` | same | no | no |
| `pashx-mab-fallback-encryption-key` | same | no | no |
| `pashx-mab-storage-hmac-access-key` | `scripts/40-create-storage-hmac.sh` | no | no |
| `pashx-mab-storage-hmac-secret` | same | no | no |

Because the database password is in state, **Terraform state is itself a secret**. It lives in a
private, versioned, uniform-access GCS bucket with public access prevention enforced, created by
`scripts/20-create-state-bucket.sh`. `backend.tf`, `terraform.tfvars`, and `*.tfstate` are all
gitignored.

At runtime, secrets are read into `/run/pashx-mab/app.env` on a **tmpfs mount** (`size=1m,
mode=0700`). They never touch the boot disk and disappear on reboot. The
`possible-secret-in-logs` log-based metric in `monitoring.tf` is the detective control for the
"secrets appear in logs" rollback trigger.

## Rotation

| Secret | Procedure |
|---|---|
| `ENCRYPTION_KEY` | Move the current value into `FALLBACK_ENCRYPTION_KEY`, add a new version to `ENCRYPTION_KEY`, restart the VM. Twenty reads the fallback during the transition |
| `APP_SECRET` | Add a new version and restart. All sessions are invalidated |
| Storage HMAC | Create a new key with `40-create-storage-hmac.sh`, restart, verify uploads, then deactivate and delete the old key |
| Database password | `terraform apply -replace=random_password.app_db[0]` regenerates the password, the SQL user, and the URL secret in one plan, then restart the VM |

## Findings and residual risk

| # | Finding | Severity | Recommendation |
|---|---|---|---|
| 1 | One human principal is simultaneously owner, deployer, and operator. Least privilege cannot be *demonstrated* for the human path — only for the machine path | Medium | H0 should name a deploy authority distinct from the owner, or Shahil should explicitly accept this for a single-operator pilot |
| 2 | `roles/owner` on the project can read every secret and delete every resource. It is the real blast radius, not the service accounts | Medium | Accept for the pilot; before real MAB data, move day-to-day work to a non-owner principal and reserve owner for break-glass |
| 3 | In `pashxd-e56c5`, the default compute SA holds `roles/editor`. If Option B in IDR-0001 is chosen, that pre-existing grant sits inside the MAB blast radius and CL0 cannot fix it without touching the live product | High if Option B | Choose Option A or C |
| 4 | The Cloud SQL password exists in Terraform state | Low, accepted | Mitigated by a private versioned state bucket; the alternative — a hand-managed password outside IaC — trades one exposure for a worse one |
| 5 | Caddy holds the TLS private key in a Docker volume on the VM | Low, accepted | Certificate keys are re-issuable; losing the VM costs one ACME round trip |

## Verification

`infra/pashx-mab-gcp/scripts/50-verify-acceptance.sh` checks the machine-enforceable subset:
Cloud SQL has no public IP and requires TLS, the bucket enforces uniform access and public access
prevention, the VM uses the runtime SA and not the default, OS Login is on, project SSH keys are
blocked, the runtime SA holds no editor/owner binding, the deployed image is digest-pinned, and
only 80/443 are open to the internet.
