# CL0 — GCP provisioning evidence

- Node: CL0
- Owner: Claude Code
- State: **blocked — H0 complete and configuration apply-ready; apply paused because `me-central2` region access is denied. See [`BLOCKER-me-central2-region-access.md`](BLOCKER-me-central2-region-access.md)**
- Nodes covered: CL0, and CL0-M1 (see [`CL0-M1-p95-alert.md`](CL0-M1-p95-alert.md))
- Opened: 2026-08-05 23:53 CEST
- Last updated: 2026-08-06 01:05 CEST
- Infrastructure contract consumed: `docs/execution/evidence/CX0-cloud-readiness.md`

## Summary

Read-only discovery, the reproducible infrastructure definition, cost summary, IAM design,
deployment configuration, the p95 rollback detector, and the rollback, backup, restore,
monitoring, and teardown runbooks are complete, checked in, and Terraform-validated.

**Cloud resources created so far: a project, a billing link, and a budget. Nothing billable.**
On 2026-08-06 Shahil chose IDR-0001 Option A, so `pashx-mab-pilot` (`673510652800`) was created,
linked to billing account `0154D8-6A85C0-668177`, and given a ₹9,000/month budget scoped to that
project alone. `lynex-ai` and `pashxd-e56c5` keep their own separate budgets and were not
touched. The new project holds only default APIs and no billable resource.

No infrastructure can be created until `var.h0_controls_recorded` is flipped — the graph's
creation gate, expressed as code.

The discovery that drove this: the project originally recorded in the graph, `pashxd-e56c5`, is
the live PashxD product project, not a dedicated MAB environment. See
[`IDR-0001`](IDR-0001-target-project-and-topology.md).

## Deliverables

| Deliverable | Path | State |
|---|---|---|
| Read-only inventory | [`inventory-2026-08-05.md`](inventory-2026-08-05.md) | complete |
| Target/topology decision | [`IDR-0001-target-project-and-topology.md`](IDR-0001-target-project-and-topology.md) | proposed, blocks apply |
| Cost summary | [`cost-estimate.md`](cost-estimate.md) | complete, estimate not measured |
| IAM design | [`iam-design.md`](iam-design.md) | complete |
| Deploy runbook | [`runbook-deploy.md`](runbook-deploy.md) | complete |
| Rollback runbook | [`runbook-rollback.md`](runbook-rollback.md) | complete, not rehearsed |
| Backup/restore runbook | [`runbook-backup-restore.md`](runbook-backup-restore.md) | complete, drill not run |
| Monitoring and alerts | [`monitoring-and-alerts.md`](monitoring-and-alerts.md) | complete, not fired |
| Teardown runbook | [`runbook-teardown.md`](runbook-teardown.md) | complete, not rehearsed |
| Terraform configuration | `infra/pashx-mab-gcp/terraform/` | **validated** — `init`/`validate`/`fmt` clean, both plans succeed |
| p95 rollback detector (CL0-M1) | [`CL0-M1-p95-alert.md`](CL0-M1-p95-alert.md) | complete; **drill not executed — needs a live environment** |
| Metric export pipeline | `deploy/pashx-mab/otel-collector-config.yaml` | written, not exercised |
| p95 alert drill | `infra/pashx-mab-gcp/scripts/60-p95-alert-drill.sh` | written, syntax-checked, **not run** |
| Operational scripts | `infra/pashx-mab-gcp/scripts/` | written, syntax-checked |
| Runtime composition | `deploy/pashx-mab/docker-compose.cloud.yml` | written |
| Environment contract | `deploy/pashx-mab/env.template` | written, no values |
| Build and deploy | `deploy/pashx-mab/{cloudbuild.yaml,build-and-push.sh,deploy.sh}` | written |

## Verification ledger

| Check | Result | Evidence |
|---|---|---|
| Read-only inventory of `pashxd-e56c5` | passed | 20 `gcloud` commands, all read-only; output recorded in the inventory document |
| No cloud resource created/modified/deleted | passed | every command was a `describe`, `list`, or `get-*`; no `create`, `update`, `delete`, or `apply` was issued |
| No secret value read, printed, or stored | passed | `gcloud secrets list` returns names only; no `versions access` was called |
| Shell scripts syntax-check | passed | `bash -n` on all 9 scripts, 0 errors |
| Terraform install | passed | v1.15.8 darwin_arm64 from `releases.hashicorp.com`, SHA256 verified against the official `SHA256SUMS` (`shasum -a 256 -c` → OK), installed to `~/.local/bin` |
| `terraform init` | passed | providers `hashicorp/google` 6.50.0, `hashicorp/google-beta` 6.50.0, `hashicorp/random` 3.9.0, all signed by HashiCorp; `.terraform.lock.hcl` written and committed |
| `terraform validate` | **passed** | `Success! The configuration is valid.` |
| `terraform fmt -check -recursive` | **passed** after one fix | initially failed on `compute.tf` alignment; `terraform fmt` applied, recheck clean |
| `terraform plan` — gate closed | **passed** | `Plan: 19 to add, 0 to change, 0 to destroy.` All 19 free: 18 × `google_project_service` + 1 × `terraform_data`. Zero billable resources, as designed |
| `terraform plan` — gate open, complete inputs | **passed** | `Plan: 89 to add, 0 to change, 0 to destroy.` No errors |
| Lean sizing rendered | passed | `machine_type = "e2-standard-2"`, `tier = "db-custom-1-3840"` — caught and fixed a stale override in `terraform.tfvars.example` that was still pinning the recommended tier |
| Scheduled shutdown rendered | passed | `schedule = "0 8 * * 0-4"` / `"0 18 * * 0-4"`, `time_zone = "Asia/Riyadh"` |
| Workflow YAML renders and parses | passed | both templates rendered via `terraform console` and `yaml.safe_load`-ed; startup steps `init → startCloudSql → waitForCloudSql → startVm → waitForHealthz → reenableAlerts → done`, shutdown `init → disableAlerts → stopVm → settle → stopCloudSql → done` |
| Backup-window guard | passed | `sql_backup_start_time_utc=01:00` and `=16:00` both fail the plan |
| Data-classification guard | passed | `data_classification=real` with the schedule on fails the plan with two preconditions |
| `schedule_enabled=false` removes the automation cleanly | passed | plan drops from 89 to 78 |
| Variable validation — tag-only image rejected | passed | `container_image=eu.gcr.io/x/y:latest` → `Error: Invalid value for variable` at `variables.tf:157` |
| Variable validation — non-candidate region rejected | passed | `region=us-central1` → `Error: Invalid value for variable` at `variables.tf:11` |
| Precondition — gate open without billing account rejected | passed | `Error: Resource precondition failed` at `guards.tf:14` |
| Acceptance attributes present in the gate-open plan | passed | `ipv4_enabled = false`, `ssl_mode = "ENCRYPTED_ONLY"`, `point_in_time_recovery_enabled = true`, `deletion_protection = true` (Cloud SQL), `public_access_prevention = "enforced"`, `uniform_bucket_level_access = true`, `versioning { enabled = true }`, VM `service_account.email = pashx-mab-runtime@…` |
| No `roles/editor` or `roles/owner` created | passed | grep over the full gate-open plan returned zero matches |
| Project `pashx-mab-pilot` created | passed | number `673510652800`, `ACTIVE`, no organization, only default APIs, zero billable resources |
| Billing linked | passed | `billingEnabled: true` against `0154D8-6A85C0-668177` |
| Budget created and **isolated** | passed | id `a63f7501-68f3-4630-b44b-b12cc62ec353`, ₹9,000/month, `calendarPeriod=MONTH`, filter `projects/673510652800` **only**. `lynex-ai` (₹2,000) and `pashxd-e56c5` (₹2,000) keep their own separate budgets and are unaffected |
| Budget thresholds | passed | 50%, 80%, 100% `CURRENT_SPEND` plus 100% `FORECASTED_SPEND` |
| CL0-M1 plan after alert policies | passed | gate-closed still `16 to add`; gate-open `75 to add` (was 72; +3 policies) |
| Budget currency renders as INR in the plan | passed | `currency_code = "INR"`, `units = "9000"` |
| Region `me-central2` availability | passed | Cloud SQL lists the region; `e2-standard-4` present in `me-central2-a/b/c`; `cos-stable-121-18867-528-43` resolves |
| Every regional resource lands in `me-central2` | passed | gate-open plan: 11 `region`/`location`/`zone` assignments, all `me-central2`/`me-central2-a`, no stray `europe-west1` |
| Zone-inside-region guard | passed | `zone=europe-west1-b` with `region=me-central2` → `Error: Resource precondition failed` at `guards.tf:26` |
| p95 PromQL renders correctly through Terraform | passed | plan shows `rate(pashx_financial_command_internal_duration_ms_bucket[10m])`, `> 1000`, `le="2500"` |
| p95 variable validation | passed | `p95_min_samples < 5` and off-boundary `p95_outlier_ms` both rejected |
| API enablement on `pashx-mab-pilot` | partial | `cloudbilling` and `billingbudgets` enabled (needed for the budget). The remaining 13 are enabled by `10-enable-apis.sh` at Phase 1 |
| Quota verification | **blocked** | `compute.googleapis.com` not yet enabled on the new project |
| Provisioning apply | **blocked** | attempted 2026-08-06 and stopped at Phase 2: `403 Permission denied on 'locations/me-central2'`. Restricted region; access must be granted by Google. Shahil chose to request access rather than substitute a region |
| Region write-probe | **failed for `me-central2`** | `storage buckets create`, `compute addresses create`, and `compute networks subnets create` all 403. `me-central1` and `europe-west1` all succeeded. Every probe resource deleted |
| Project is clean after the failed apply | passed | instances, addresses, disks, SQL, buckets, registries, secrets: all empty |
| p95 alert drill | **not run** | requires a live environment; procedure and script are ready |
| PromQL evaluated against real series | **not run** | Phase A of the drill is the hard gate before the detector is trusted |
| Backup/PITR proven | not run | requires a live instance |
| Rollback proven | not run | requires a live deployment |
| Teardown proven | not run | requires a live environment |
| Health/auth/server/worker/database/storage smoke | **verified** | CL3, see Deployment record |
| Gate 0 storage compatibility suite | **verified, 9/9** | driver-level checks by CL3 (2026-08-11); presign/CORS checks (items 3-5) closed 2026-08-14, see "Gate 0 storage suite — presign/CORS closure" below |

## Acceptance criteria — current state

| CL0 acceptance criterion | State | Note |
|---|---|---|
| Infrastructure reproducible from checked-in configuration | **validated** | 13 Terraform files; `validate` passes, `fmt` clean, both gate-closed and gate-open plans succeed; provider versions pinned by the committed `.terraform.lock.hcl` |
| Plan and cost summary reviewed before apply | **ready** | cost summary written; gate-open plan produces 72 resources matching the estimate — 1 VM, 1 Cloud SQL, 1 bucket, 1 registry, 1 static IP, no second VM, no `REGIONAL` Cloud SQL |
| No plaintext secrets | **satisfied by design** | secrets in tmpfs only; only the generated DB password reaches state, which lives in a private versioned bucket |
| No durable VM filesystem state | **satisfied by design** | no `local-storage` volume; `STORAGE_TYPE=s3` |
| Database not publicly exposed | **satisfied by design** | `ipv4_enabled=false`, PSA-only, plus an explicit deny rule on 5432/6379 |
| Only HTTPS public | **satisfied by design** | 80 (ACME) and 443 only; SSH via IAP range only |
| Health/auth/server/worker/db/storage smoke pass | **not started** | CL3 |
| Rollback, teardown, backup, restore documented | **satisfied** | four runbooks; none rehearsed |

## Defects found by validation and fixed

Running Terraform found four real defects in the configuration. All are fixed and re-verified.

| # | Defect | How it surfaced | Fix |
|---|---|---|---|
| 1 | **The gate could open with no budget.** With `h0_controls_recorded = true` and an empty `billing_account_id`, `budget.tf`'s count evaluated to 0. The plan produced 70 billable resources and *no* budget alert — precisely the situation the graph's creation gate exists to prevent | first gate-open plan; `grep -c google_billing_budget` returned 0 | new `guards.tf` with a `terraform_data` precondition that fails the plan. Verified: `Error: Resource precondition failed` at `guards.tf:14` |
| 2 | **Two outputs failed the plan.** `vm_name` and `sql_instance_name` used `one(resource).name`. `one()` materializes the whole resource object, which carries sensitive attributes (`root_password`, `disk_encryption_key_raw`), and the mark propagates to plain fields | `Error: Output refers to sensitive values`, twice | rewrote all 14 `one(X).attr` references to `X[0].attr`, which is direct schema traversal and does not inherit unrelated sensitivity |
| 3 | **`.terraform.lock.hcl` was gitignored.** Without it, a later `terraform init` could resolve a different provider build — directly contradicting "reproducible from checked-in configuration" | noticed when the lock file was written by `init` | removed from `.gitignore` with a comment explaining why it must be committed |
| 4 | **`compute.tf` was not `fmt`-clean** | `terraform fmt -check` | `terraform fmt` applied |

Three additional preconditions were added to `guards.tf` while fixing #1, covering cases that
variable-level `validation` cannot express because they span inputs: zone must sit inside
region; `container_image` must be non-empty when the gate is open; and the PSA range must not
share a /16 with the subnet. The last is a documented **heuristic**, not a proof — Terraform has
no CIDR containment function, so it compares the first two octets. That catches every realistic
misconfiguration for the RFC1918 ranges this module uses, and would miss an exotic
differing-prefix overlap. The comment in `guards.tf` says so rather than implying exactness.

## Findings for H0

| # | Finding | Severity | Owner |
|---|---|---|---|
| 1 | ~~`pashxd-e56c5` is a live product project~~ **RESOLVED 2026-08-06** — Shahil chose IDR-0001 Option A. Project `pashx-mab-pilot` (number `673510652800`) created, billing linked, budget attached. `pashxd-e56c5` remains untouched | resolved | — |
| 2 | ~~Region unrecorded~~ **RESOLVED 2026-08-06** — `me-central2` (Dammam), zone `me-central2-a`, for in-kingdom residency. Availability verified: Cloud SQL supports the region, `e2-standard-4` exists in all three zones, `cos-stable` resolves, and the gate-open plan places every regional resource there | resolved | — |
| 3 | ~~Billing unreadable~~ **RESOLVED 2026-08-06** — billing account `0154D8-6A85C0-668177` linked; budget of ₹9,000/month scoped to `pashx-mab-pilot` alone. See finding 9 for the consequence | resolved | — |
| 4 | One human principal is owner, deployer, and operator. Machine-path least privilege is provable; human-path is not | Medium | Shahil |
| 5 | Default compute SA in `pashxd-e56c5` holds project-wide `roles/editor`. Relevant only if IDR-0001 Option B is chosen | Medium (High if Option B) | Shahil |
| 6 | No public hostname exists anywhere in the account. Fallback is a `nip.io` name derived from the static IP — acceptable for the pilot, not for MAB users | Low | Shahil |
| 7 | The "financial-command p95 > 1s excluding external providers" rollback trigger cannot be detected at the infrastructure layer. It needs an application-emitted metric that excludes external provider spans | Medium | **Codex** — infrastructure request |
| 14 | **`me-central2` is a restricted region and is denied to this account.** Read APIs (zones, machine types, SQL tiers) and `terraform plan` all report it as healthy, so the pre-flight checks passed and the apply still failed. A green plan is not proof a region is usable | **High**, open | Shahil — request region access from Google |
| 15 | **The `container_image` precondition would have blocked the CL0 apply.** It demanded a digest-pinned image whenever the gate was open, but the image is not built until CL3. CL0 provisions; CL3 deploys | **High**, fixed | converted to a `check` block: warns, does not fail |
| 16 | The auto-created `default` VPC carries `default-allow-ssh`, `-rdp`, `-icmp` from `0.0.0.0/0`. It does not expose the pilot — the VM lives in `pashx-mab-vpc` and firewall rules do not cross VPCs — but it contradicts "only HTTPS is public" | Low | Shahil — delete command in the blocker document |
| 12 | **Backups would have silently never run.** The Cloud SQL backup window was 01:00 UTC = 04:00 Asia/Riyadh, inside the scheduled shutdown. A stopped instance takes no automated backup and reports no error | **High**, fixed | fixed: window moved to 05:30 UTC and a `guards.tf` precondition now fails the plan if it leaves the running window |
| 13 | **PITR now has nightly and weekend gaps** — a stopped instance writes no transaction log, so the 5-minute RPO holds only during running hours | Medium, accepted for disposable data | enforced: `guards.tf` refuses `data_classification = real` while the schedule is on |
| 8 | `ENCRYPTION_KEY` loss makes encrypted field data permanently unreadable, and nothing currently exports it offline. Automating an export would create the exposure it protects against | Medium | Shahil, before real data |
| 9 | **The recorded ceiling is below the running cost.** ₹9,000 (~$100) versus ~$300/month (₹26,400) for the recommended tier **in `me-central2`** — about 2.9×, widened from 2.4× by the region choice. Chosen deliberately as a tripwire. Only the scheduled-shutdown option (~₹7,000) fits | Medium, accepted | Shahil — pick an option in `cost-estimate.md` § "Running inside ₹9,000" |
| 11 | **Choosing in-kingdom residency puts H0 input 5 in tension with the architecture overview.** Residency only matters if the data is or will be resident-restricted, but the overview says the pilot holds disposable data only until SG. Either the choice is forward-looking insurance, or real MAB data arrives sooner than the graph assumes — which changes the CL2 destructive-test rules | Medium | Shahil |
| 10 | **The billing account is denominated in INR while every published GCP price and every figure in `cost-estimate.md` is USD.** The first budget-create attempt failed with `INVALID_ARGUMENT` because of this | Low, fixed | fixed: `budget_currency_code` defaults to INR |
| 17 | **`cloudbuild.yaml` passed no `--target`, so the pilot ran the all-in-one DEVELOPMENT image.** `twenty-app-dev` is the last stage in the Dockerfile and Docker silently defaults to the last stage. The deployed container therefore booted its OWN bundled Postgres under s6, listened on 2020 instead of 3000, ran `NODE_ENV=development` with a hardcoded `APP_SECRET`, and omitted `pashx-mab-contract`. It surfaced as three unrelated-looking failures — `Cannot find module 'pashx-mab-contract'`, a Postgres `ClientAuthentication` error, and a healthcheck that could never pass — none of which named the cause. Docker does not warn about a defaulted target | **High**, fixed | fixed: `--target=twenty` pinned with a comment stating that dropping it is silent |
| 18 | **`APP_VERSION` was set to the build tag, which is not semver, and the server validates it at BOOT.** `IsTwentySemVer` runs `semver.parse`, so the container exited with `APP_VERSION must be a valid semantic version` after a green build and a successful push. Verified directly: `8cd5396c` → invalid, `0.2.1+5ffa121e59` → valid | **High**, fixed | fixed: `build-and-push.sh` derives `<workspace version>+<sha>` — valid semver build metadata that keeps the sha readable |
| 20 | **The Cloud Shell working copy was a stale snapshot, and applying it silently REVERTED three merged fixes.** `~/pashx-mab-cl0` predated the COS startup-script work, `terraform_data.startup_script_revision`, and the Cloud Build IAM. The apply reported `1 added, 2 changed, 6 destroyed`, rolled the startup script back to the `gcloud secrets` / `docker-credential-gcr` version that cannot run on COS, and removed `cloudbuild.googleapis.com` plus three deployer roles and the operator `actAs`. Because the VM was only *modified in place*, the reverted script sat in metadata until the next boot, where it failed at step one — leaving the previous containers auto-restarting on the OLD image and making the deploy look like it had simply not taken | **High**, fixed | fixed: working copy re-synced from GCS and re-applied with `-replace`. **Two Terraform copies of one environment is the root cause — consolidate to one.** Until then, diff before every apply |
| 21 | **Cloud SQL is `sslMode=ENCRYPTED_ONLY`, and Twenty connects in plaintext unless `PG_SSL_ALLOW_SELF_SIGNED=true`.** Postgres refuses with `pg_hba.conf rejects connection ... no encryption`, which reads as an authentication failure but is a transport failure — the credentials were always correct. Setting `sslmode` in the connection URL does NOT work: TypeORM parses the url into discrete fields and takes `ssl` from its own option (`core.datasource.ts:74`) | **High**, fixed | fixed: the startup script now writes `PG_SSL_ALLOW_SELF_SIGNED=true`. Certificate verification is off in that code path — accepted because the instance is private-IP-only over PSA inside our VPC |
| 22 | **`pashx-mab-contract` is ESM-only and `twenty-server` is CJS, so `require('pashx-mab-contract')` threw `ERR_PACKAGE_PATH_NOT_EXPORTED`.** `exports["."]` declared only `types` and `import`; once `exports` exists, `main` is ignored, so the CJS `require` condition resolved to nothing. Reproduced locally with a bare-specifier require, and the fix verified to resolve all 34 exports. Note a require by *directory path* succeeds and hides the bug — only the bare specifier reproduces it | **High**, fixed | **Codex-owned file changed with Shahil's explicit approval**: added `"require": "./dist/index.js"` to `packages/pashx-mab-contract/package.json`. Safe because the package has no top-level await and Node 24 supports `require()` of ESM. **Codex should adopt this**, or ship a real CJS build |
| 24 | **Nest reports only the FIRST unresolved constructor argument, which turned one defect into two deploy cycles.** After `TokenModule` was added, the very next boot failed on `WorkspaceCacheStorageService` at index [1] of the same guard. My first audit inferred that argument already resolved *because the error did not name it* — an invalid inference, and the direct cause of an extra ~20-minute cycle. `WorkspaceCacheStorageModule` is also easily confused with `WorkspaceCacheModule`, which was already imported but exports only `WorkspaceCacheService` | Medium, fixed | fixed with a full audit rather than another guess: every guard, interceptor and constructor dependency in the module was enumerated and mapped to an exporting module before rebuilding. **Never infer that a dependency resolves from its absence in a Nest error** |
| 23 | **P0 — `PashxMabModule` never imported `TokenModule`, so the server could not boot at all.** `PashxVendorPurchaseOrderController` is decorated `@UseGuards(JwtAuthGuard, ...)`, and a guard's dependencies resolve from the module declaring the CONTROLLER, not from where the guard class lives. `AccessTokenService` was therefore unresolvable and Nest aborted with `Nest can't resolve dependencies of the JwtAuthGuard (?, WorkspaceCacheStorageService)` — wording that names the engine's guard and hides the fact that the missing import is in the PashX module. The container crash-looped with exit code 0, so `docker ps` showed it repeatedly "Up" and starting rather than failed. **My CL1 review did not catch this**: it reviewed T3 logic, not module wiring, and no test in that suite boots the full Nest application, so the defect was only reachable at deploy time | **P0**, fixed | **Codex-owned file changed with Shahil's explicit approval**: added `TokenModule` to `imports` in `packages/twenty-server/src/modules/pashx-mab/pashx-mab.module.ts`, matching `webhook`, `field-metadata`, `object-metadata` and `ai-generate-text`. **Codex should adopt.** Worth a boot-time smoke test in CI — a DI break is invisible to unit tests |
| 27 | **The app manifest cannot install: three field definitions violate Twenty's metadata validator, and all three carry values that are the CONTRACT's canonical form.** `INVALID_FIELD_INPUT` on select option values `vendorPurchaseOrder` and `draft` ("must be in UPPER_CASE and follow snake_case"), and on field name `currency` ("This name is reserved"). Three further `INVALID_VIEW_DATA: Field metadata not found` errors are cascades from those fields, so there are 3 root causes, not 6. All three live in `packages/twenty-apps/pashx-mab/src/objects/commercial-document.object.ts`. **They are not typos**: `'vendorPurchaseOrder'` and `'draft'` are declared in `pashx-mab-contract/src/domain.ts` and used as literal types in `commands.ts` (`Extract<PashxCommercialDocumentType,'vendorPurchaseOrder'>`, `lifecycleStatus: 'draft'`), and `currency` is a contract field with ISO-4217 validation and a pinned universalIdentifier. Satisfying the validator therefore changes the shared contract, the command payloads, the front component and the tests together | **Was a CL3 blocker**, resolved | **Resolved with Shahil's explicit approval, by mapping at the manifest boundary** so the contract vocabulary is untouched. Manifest now uses `VENDOR_PURCHASE_ORDER` / `DRAFT` and the field `currencyCode`; `packages/twenty-server/src/modules/pashx-mab/utils/pashx-manifest-value.util.ts` translates contract values on write. **The mapping could NOT be manifest-only** — `persistWorkspaceRecords` writes contract values straight into these columns, so a manifest-only change would have installed cleanly and then failed every INSERT. The maps are exhaustive `Record<ContractType, string>` so a new contract value breaks the build instead of silently producing a rejected option value. App installed at 0.1.2 and verified. **Codex should review**: the mapping direction is a judgement call, and no reverse mapping exists because nothing currently reads these columns back into contract space — that assumption breaks the day a read path is added |
| 30 | **The pilot admin could not issue the command, and could not grant itself the capability either.** `POST /rest/pashx-mab/vendor-purchase-orders` returned `PASHX_FORBIDDEN_CAPABILITY` (403): the endpoint requires the `procurementIssue` permission flag, which the app's own roles carry (`PashX MAB Admin`, `PashX MAB Operator`) but Twenty's built-in `Admin` role does not. `updateWorkspaceMemberRole` then refused with `Cannot update self role` — a deliberate anti-lockout guard. `upsertPermissionFlags` on the built-in Admin role was rejected as a remedy after reading its implementation: `flatEntityToDelete = current.filter(pf => !inputSet.has(...))` means it REPLACES the flag set, so passing only `procurementIssue` would have stripped Admin's existing permissions on the live pilot | Medium, resolved | resolved additively instead: created a dedicated member `pashx-operator@pashx-mab.invalid` (password generated, stored in Secret Manager as `pashx-mab-pilot-operator-password`) via `signUpInWorkspace` with the workspace `inviteHash`, and assigned it `PashX MAB Operator`. CL2 wants a distinct operator identity anyway. **Note the operator role correctly DENIES `company` writes**, so test fixtures must be created as admin and only the command issued as operator |
| 29 | **The command's raw repository insert omits the standard ACTOR fields, whose `*Name` columns are NOT NULL with no default.** Postgres rejected the row with `null value in column "createdByName" of relation "_commercialDocument"`. The GraphQL/REST record pipeline populates `createdBy`/`updatedBy` from the auth context, but `persistWorkspaceRecords` writes through `repositories.commercialDocument.insert(...)` and bypasses it. **Postgres reports only the FIRST violation**: listing NOT NULL columns without defaults on `_commercialDocument` showed `createdByName` AND `updatedByName`, so fixing only the named one would have failed on the very next attempt — the same one-at-a-time trap as finding 24, caught pre-emptively this time by enumerating instead of iterating | **High**, fixed | **Codex-owned file changed** while completing the write path: both `createdBy` and `updatedBy` now set from the request-scoped auth context (`getWorkspaceAuthContext`, the same accessor the controller uses), `source: FieldActorSource.API` because this arrives through the REST command endpoint rather than a UI edit. The `procurementCase` UPDATE needs no equivalent — an UPDATE does not re-validate NOT NULL on untouched columns. **Codex should review the actor-provenance choice** |
| 31 | **My own actor fix threw a TypeError because I trusted a TypeScript type instead of guarding at runtime.** `UserWorkspaceAuthContext` declares `user` as `NonNullable`, so I wrote `authContext.user.email` as the fallback for the actor name. On the token-authenticated path `user` is NOT populated, and both workspace members here were created by a bare `signUpInWorkspace` and have EMPTY first and last names — so the fallback was the normal path, not an edge case, and it dereferenced undefined. It surfaced only as `PASHX_INTERNAL_ERROR` with `errorType=TypeError`: the controller logs the error type and no stack by design, so nothing in the logs pointed at this line. Confirmed by reading the member rows: `member:[] [] moideenshahil2@gmail.com` and `member:[] [] pashx-operator@...` | Medium, fixed | fixed by making the expression structurally unable to throw: every step optional-chained, terminating in a literal (`?.name?.firstName` → `user?.email` → `workspaceMember?.userEmail` → `'PashX MAB'`), and `workspaceMemberId ?? null` so an explicit null is written rather than an ambiguous undefined. **A NonNullable type is a compile-time claim, not a runtime guarantee** — especially across auth paths that populate the context differently |
| 32 | **THERE IS NO TYPE GATE ANYWHERE IN THIS PIPELINE. `twenty-server` is compiled by swc with `typeCheck: false`.** `packages/twenty-server/nest-cli.json` sets `"builder": "swc", "typeCheck": false`, so `nest build` transpiles without checking types. Combined with finding 28 (local `nx typecheck` broken), a wrong named import is not a build error anywhere — it compiles, pushes green, and fails at runtime. This invalidates a claim I made twice, that a successful Cloud Build "clears the type gate": it never did | **High**, open | **Do not treat a green build as type verification.** Verify every value import against the BUILT artifact — `node -e "console.log(typeof require('<pkg>').<name>)"` — not against the source barrel. Restoring a real typecheck (fix finding 28, or add `typeCheck: true`/a CI `tsc --noEmit`) is the highest-value follow-up; it would have caught findings 22, 23, 24 and 33 |
| 33 | **My actor fix imported `isNonEmptyString` from `twenty-shared/utils`, which does not export it — two wasted deploy cycles.** The module resolves, the named binding is `undefined`, and `.filter(undefined)` throws `TypeError: undefined is not a function` before any SQL runs. In `twenty-server` this helper comes from **`@sniptt/guards`**. Proven against runtime artifacts: `@sniptt/guards` → `function`, `twenty-shared/dist/utils.cjs` → `undefined`. It surfaced only as `PASHX_INTERNAL_ERROR`/`errorType=TypeError` with no stack, so two cycles were spent fixing the wrong thing (first `user.email`, correct in itself but not the cause) | **High**, fixed | fixed to `@sniptt/guards`. **The methodological failure matters more than the bug**: I "verified" the import path by grepping for how other files import that symbol AFTER writing my own line, and the match I read back was my own edit — I verified my mistake against itself. Verification must target something that existed before the change: the built dist, or a file I did not touch |
| 28 | ~~**the Cloud Build IS the type gate**~~ **SUPERSEDED BY FINDING 32 — it is not. `twenty-server` cannot be typechecked on this workstation, and the build does not typecheck either.** `npx nx typecheck twenty-server` fails in its prerequisites (`twenty-ui:build`, `twenty-emails:build` — `npx vite build` exits non-zero), and a bare `npx tsc -p tsconfig.json` cannot resolve `@nestjs/common` or any other dependency because the local install is incomplete. Both produce output that is easy to misread as success: the nx run was launched as `... | tail -25`, so the shell reported the exit status of `tail` (0) rather than nx's failure, and I briefly reported the typecheck as passing on that basis | Medium, open | **Do not treat a piped command's exit status as the command's own.** Until the local install is repaired, a server type error is only caught by the ~18-minute image build; budget for that rather than assuming local verification happened |
| 26 | **`otel-collector` is in a restart loop.** Server, worker and caddy are all up; only the collector fails. It is the ingestion path for the p95 rollback detector, so while it is down the CL0-M1 alert has no data and cannot fire | Medium, open | not yet diagnosed — deferred behind the app install, recorded so it is not lost |
| 25 | **A failed early boot left an empty `core` schema, and the entrypoint then skipped database initialisation on every subsequent boot — permanently.** `entrypoint.sh` gates `database:init:prod` on `SELECT EXISTS(... schema_name='core')`. It tests for the SCHEMA, not for its TABLES, so once an aborted run created an empty `core`, the probe returned true forever, init never ran, and `upgrade` was executed against a schema with zero tables. Every boot then logged the soft warning `Upgrade completed with errors. Some workspaces may not be fully migrated.` and continued, and `/healthz` returned 200 because it does not touch the database. Confirmed directly: schema `core` present, `core` table count **0** | **High**, worked around | unblocked by running `yarn database:init:prod` in the container (71 tables created). **Not fixed at source** — the entrypoint gate is Codex/upstream-owned and should test for a known table (e.g. `core.workspace`) rather than the schema, otherwise any interrupted first boot bricks initialisation silently |
| 35 | **The deploy mechanism destroyed the TLS certificate store on every deploy, and 12 deploys exhausted Let's Encrypt's rate limit — public HTTPS went down for a day.** `caddy-data` was a docker named volume, which lives on the boot disk; deploys here REPLACE the instance (`replace_triggered_by`), so every deploy destroyed the ACME account and certificate and forced a fresh issuance. Let's Encrypt permits 5 certificates per exact set of identifiers per 168h: `HTTP 429 urn:ietf:params:acme:error:rateLimited - too many certificates (5) already issued ... retry after 2026-08-12 15:41:36 UTC`. Caddy fell back to an untrusted staging certificate, so every client — including `curl -k` — failed the handshake with `SSL routines::tlsv1 alert internal error`. The application was unaffected throughout (`/healthz` 200 on localhost:3000); only the public TLS edge was down. **My own comment in the compose file asserted the false premise**: "Losing this volume costs one ACME re-issue, nothing else." It costs one re-issue against a hard external quota, on a path traversed by every deploy | **High**, fixed | fixed structurally: a separate 10 GB `pd-standard` disk (`google_compute_disk.caddy_certs`, `prevent_destroy`) attached as `device_name=caddy-certs`, mounted by the startup script at `/mnt/disks/caddy-certs`, bind-mounted to Caddy's `/data`; the named volume is gone. **The startup script formats only when `blkid` finds no filesystem** — reformatting would destroy the thing the disk exists to protect. Verified: ACME data now on `/dev/sda`, not the boot disk. Deploys no longer consume certificates, so deploy count is no longer bounded by an external quota. `prevent_destroy` makes `terraform destroy` refuse until deliberately removed — documented in `runbook-teardown.md`. **Immediate recovery without waiting for the reset:** the limit is per EXACT SET OF IDENTIFIERS, so a different hostname has its own budget. `34.18.165.1.nip.io`, `34-18-165-1.nip.io` and `ip-34-18-165-1.nip.io` all resolve to the same static IP but are distinct identifier sets. Switching to the dotted form via `-var server_hostname=34.18.165.1.nip.io` restores trusted HTTPS immediately with no code change, because `local.server_url`/`local.server_host` already prefer an explicit hostname over the derived fallback. It spends exactly ONE certificate from the new name's budget, and the persistent disk means subsequent deploys spend none. The dashed name's own budget resets 2026-08-12 15:41 UTC and remains available as a fallback. Tradeoff: an explicit hostname no longer tracks the IP automatically — harmless here because the IP is a reserved static address, but it must be revisited if the address ever changes |
| 34 | **The publish flow records the version before storing the tarball, producing a registration that can neither install nor be re-published.** The first `app:publish --private` failed post-upload (the workspace was still `PENDING_CREATION`) but had already set `latestAvailableVersion=0.1.0` with `tarballFileId=NULL`. Install then failed with `sourceType=tarball but no tarball file`, and re-publishing 0.1.0 was refused with `version must be higher than the currently deployed version`. A self-blocking state reachable from one interrupted publish. The `Upload failed` message is also misleading — the upload itself had succeeded | Medium, worked around | worked around by bumping the app to 0.1.1 and re-publishing, which is what the error text itself prescribes. A targeted SQL repair of the orphan row was attempted first and correctly blocked by the sandbox; the version bump is the better remedy anyway. **Codex/upstream: persist the tarball before recording the version, or roll the version back on failure** |
| 19 | **`terraform.tfvars` carries `h0_controls_recorded = false` and `container_image = ""` while the live environment has the gate OPEN.** The real values are passed as `-var` flags at apply time, so any apply that omits them plans a destroy of every billable resource — each one multiplies `count` by `local.gate` | **High**, open | Shahil — decide: record the live values in the Cloud Shell tfvars, or keep the gate closed-by-default and always pass both flags |

## Infrastructure request to Codex

Finding 7 above. The PashX command service should emit a timing metric for internal financial
command duration that excludes time spent in external providers (ZATCA, OCR). Without it, the
graph's p95 rollback trigger has no detector. CL0 provides
`log_min_duration_statement=1000` and Query Insights as partial coverage; neither can separate
internal from external time. This is Codex-owned application work and is not implemented from
the infrastructure lane.

## CL3 image build record

One block per image build. A build being green says nothing about the image being correct — see
findings 17 and 18, where two green builds produced an image that could not start. The verified
fields below are read out of the image config blob in Artifact Registry before any deploy, because
a wrong image costs a full ~15-minute rebuild to discover at runtime.

```
Build 1 — 2026-08-07  id 724ea128  FAILURE   (pashx-mab-contract workspace resolution)
Build 2 — 2026-08-08  id 8cd5396c  SUCCESS but UNDEPLOYABLE
  tag: cl3-5ffa121e59-dockerfix
  digest: sha256:9d30eb37c362f0fa20eea8dfd93f32cf5472a688b57b88d317da58cfaaac55c3
  defect: no --target, so this is the twenty-app-dev image (findings 17, 18). Do not deploy.

Build 3 — 2026-08-08  id 081bfa80  SUCCESS   duration 14m44s
  tag: 5ffa121e59
  digest: sha256:23cb9ff7621347667fbcc275c16a6406cb9547642f9c68065d070a36b06b22e0
  target: twenty (server + frontend)
  verified from the registry config blob, not assumed:
    Entrypoint   /app/entrypoint.sh      (twenty stage; the dev image uses s6 /init)
    Cmd          node dist/main
    WorkingDir   /app/packages/twenty-server
    User         1000
    APP_VERSION  0.2.1+5ffa121e59        (semver.parse accepts it)
    NODE_ENV     production              (the dev image sets development)
    no baked PG_DATABASE_URL and no hardcoded APP_SECRET — both present in the dev image

Build 4 — 2026-08-08  id 47ddb83e  SUCCESS   duration 14m11s
  tag: 5ffa121e59-exports
  digest: sha256:af7884330c366176405cd6aa3111042253ee6b8a8d12eedc722497bde8eeb97b
  carries: pashx-mab-contract "require" export condition (finding 22)
  result when deployed: got FURTHER — Cloud SQL connected, migrations ran, Nest modules loaded —
  then crash-looped on finding 23 (PashxMabModule missing TokenModule). Superseded by build 5.

Build 5 — 2026-08-09  id 9a16cee4  SUCCESS   duration 17m38s
  tag: 5ffa121e59-diwiring
  digest: sha256:c2a51e18b9ba968c818c589d6593c81b5b7223823ae56c0b82992ef4a01304d2
  carries: build 4 plus TokenModule in PashxMabModule imports (finding 23)

Build 6 — 2026-08-13  id ad430a62-e423-4487-9806-7c399d58894c  SUCCESS  duration 14m14s
  tag: 73b0add5e4
  digest: sha256:5ef6a309072fac37ed3a113180621e96b742c8879bcd919fb4e9eaccd77d8ad2
  target: twenty (server + frontend), APP_VERSION 0.2.1+73b0add5e4
  CL5 candidate — commits through 73b0add5e4 (CX3+CX4 complete, CX2 resilience, CX5-1 error
  translation). Digest confirmed independently via `gcloud artifacts docker images describe`,
  matches build-and-push.sh's own printed value. Deployed same day; see Deployment record.

Build 7 — 2026-08-13  id 616195ac-f4e7-4c6a-9d5a-9e9d5fe3e784  SUCCESS  duration ~17m
  tag: 73b0add5e4-renderer-fetch-timeout
  digest: sha256:d0e5f1fbd2ff01f5e90395530506f0a7f94a0036e51824261dfc3a31f7527d87
  target: twenty (server + frontend), APP_VERSION 0.2.1+73b0add5e4-renderer-fetch-timeout
  Same commit (73b0add5e4) as Build 6, but the working tree carries Codex's uncommitted fix to
  `packages/twenty-front-component-renderer/src/host/utils/createHostFetchEnforcingPolicy.ts`
  (adds an AbortController + timeoutMs, default 30s, around the host-fetch call — see the CX2-R
  diagnosis above for why this was needed: the previous PashX-level Promise.race alone couldn't
  time out a host-fetch that never settles). `pashx-mab` bumped to `0.1.5` in the same tree. Tag
  disambiguated from Build 6 since HEAD is unchanged and both would otherwise collide on the
  short-SHA tag. Digest confirmed via `gcloud artifacts docker images describe`. Not yet deployed
  — Terraform plan pending review.
```

### Why five builds

Each build removed exactly one blocker, and every one of them was invisible until the container
actually ran. That is the reusable lesson: a green Cloud Build and a successful push say nothing
about whether the image can start. The failure moved strictly deeper each time —
wrong image target → non-semver APP_VERSION → reverted COS startup script → ESM/CJS resolution →
TLS-refused database → Nest dependency injection. A boot-time smoke test that starts the server
against a throwaway database would have caught findings 17, 18, 22 and 23 in CI, in one pass,
instead of five deploy cycles of roughly twenty minutes each.

## Deployment record

To be appended by CL3, one block per deploy.

```
Date/time:              2026-08-13
Image digest:           sha256:5ef6a309072fac37ed3a113180621e96b742c8879bcd919fb4e9eaccd77d8ad2
                        (tag 73b0add5e4, build ad430a62, CL5 candidate)
Previous digest:        sha256:46f7359629973e4b080fff525a933d48a5cedd3c25158935e933a2b1b17883cc
                        (tag 5ffa121e59-guards — rollback target)
Terraform plan:         3 to add, 6 to change, 3 to destroy — reviewed in full before apply
                        (see CL5 session findings above). Replaced: VM (new image), uptime
                        check + alert policy (hostname correction, dotted->dashed). Updated
                        in-place: bucket CORS origin (same hostname fix — this also repairs a
                        latent bug where browser uploads via the documented dashed hostname
                        would have failed CORS preflight), both schedule workflows, two
                        logging metrics. Cloud SQL, VPC, secrets, IAM: not in the diff.
Apply result:           3 added, 6 changed, 3 destroyed — exactly as planned. VM recreate
                        took 24s destroy + 21s create. Caddy TLS certs on the separate
                        persistent disk survived (not re-issued).
/healthz external:      PASS — HTTP 200 {"status":"ok","info":{},"error":{},"details":{}}
                        over https://34-18-165-1.nip.io (now the CORRECT hostname — Caddy's
                        cert now matches the documented dashed form; see finding 35),
                        ssl_verify_result=0, 0.49s, healthy 20s after apply completed.
App published:          pashx-mab v0.1.3 -> pashx-mab-pilot server registry (--private),
                        via `twenty app:publish` run from this workstation against a scoped
                        local yarn install (twenty-sdk CLI is not shipped in the production
                        image — see CL5 findings). Auth: a proper API_KEY-type token
                        (~2yr expiry) generated by the user via the app UI, not the admin
                        password; a first token pasted turned out to be a 2h PLAYGROUND
                        token and was rejected before use.
App INSTALLED:          YES — universalIdentifier 058263f0-1cc0-42e7-94a1-b4beb688e771
                        @ 0.1.3 (same identifier as the 0.1.2 install — confirmed upgrade,
                        not a duplicate registration). Verified in core.application via
                        psql inside the server container, not from CLI output alone:
                        name "PashX MAB Procurement", sourceType tarball, workspaceId
                        160a3718-ce23-4150-9142-4e7ddd8b8850 (the pilot workspace, correct),
                        updatedAt 2026-08-13 00:15:08 UTC.
```

```
Date/time:              2026-08-13 (later same day)
Image digest:           sha256:d0e5f1fbd2ff01f5e90395530506f0a7f94a0036e51824261dfc3a31f7527d87
                        (tag 73b0add5e4-renderer-fetch-timeout, build 616195ac)
Previous digest:        sha256:5ef6a309072fac37ed3a113180621e96b742c8879bcd919fb4e9eaccd77d8ad2
                        (the CL5 deploy directly above — rollback target)
Reason:                 host-fetch timeout repair in the shared front-component renderer
                        (`packages/twenty-front-component-renderer`), root-caused from the
                        CX2-R diagnosis above. Same commit as CL5 (73b0add5e4); the fix is
                        uncommitted in the working tree, carried into the image by rebuilding
                        from the same tree Codex edited. See CX2-R diagnosis section for why
                        this needed a new image rather than just a republished app tarball.
Terraform plan:         2 to add, 3 to change, 1 to destroy — reviewed before apply. Replaced:
                        VM (new image), a pre-existing `deployer_instance` IAM binding
                        (compute.instanceAdmin.v1 on this one VM, granted since 2026-08-08 —
                        re-created because it's tied to the specific instance identity, not a
                        new grant; verified against `iam.tf`'s own dated comment and current
                        `terraform state list` before treating it as expected). Updated
                        in-place: two logging metrics, the startup-script-revision trigger.
                        Cloud SQL, VPC, secrets, uptime check, alert policy, bucket: not in the
                        diff this time — the CL5 hostname fix held, no repeat churn.
Apply result:           2 added, 3 changed, 1 destroyed — exactly as planned. VM recreate took
                        25s destroy + 32s create.
/healthz external:      PASS — HTTP 200, healthy 30s after apply completed.
App published:          pashx-mab v0.1.5 -> pashx-mab-pilot server registry (--private), same
                        remote/auth as the CL5 publish (API key still valid, no re-auth needed).
App INSTALLED:          YES — universalIdentifier 058263f0-1cc0-42e7-94a1-b4beb688e771 @ 0.1.5
                        (same identifier as 0.1.2/0.1.3 — confirmed upgrade). Verified in
                        core.application via psql, not CLI output alone: updatedAt
                        2026-08-13 19:11:45 UTC.
CX2-R:                  intentionally NOT retried by Claude after this deploy, per explicit
                        instruction. Next attempt belongs to Codex.
```

```
Date/time:              2026-08-09
Image digest:           sha256:8c74caf890c8aa34619cd80c126cbf71c00cadb6027f84164a71410e1e3fc1f7
                        (tag 5ffa121e59-di2, build cb071749)
Previous digest:        sha256:c2a51e18b9ba968c818c589d6593c81b5b7223823ae56c0b82992ef4a01304d2
                        (rollback target; NOTE it cannot boot — finding 24. The first
                         digest that boots is this one. There is no working earlier image.)
Terraform plan:         2 to add, 3 to change, 1 to destroy — VM replaced via replace_triggered_by
/healthz external:      PASS — HTTP 200 {"status":"ok"} over https://34-18-165-1.nip.io,
                        Let's Encrypt cert verified (curl ssl_verify_result 0), 1.01s
Server container:       Up (healthy)
Worker container:       Up — released once the server passed its healthcheck
Caddy container:        Up
otel-collector:         RESTARTING — NOT resolved, see finding 26
Migration result:       core schema initialised manually, 71 tables (finding 25).
                        Automatic init was skipped by the entrypoint; see that finding.
Workspace created:      160a3718-ce23-4150-9142-4e7ddd8b8850  "PashX MAB Pilot"
                        activationStatus ACTIVE, created via the app's own signup path
                        (NOT workspace:seed:dev — see the security note below)
App published:          pashx-mab v0.1.2 -> server registry, tarball stored
App INSTALLED:          YES — universalIdentifier 058263f0-1cc0-42e7-94a1-b4beb688e771 @ 0.1.2
                        verified in core.application, not from CLI output alone.
                        Objects created: commercialDocument, documentLine, expense,
                        procurementCase (20 fields on commercialDocument).
Reconciliation:         not run
Storage drill:          not run

WRITE PATH VERIFIED 2026-08-11 on image `sha256:46f7359629973e4b080fff525a933d48a5cedd3c25158935e933a2b1b17883cc`
(tag `5ffa121e59-guards`). First end-to-end success after nine images.

```
POST /rest/pashx-mab/vendor-purchase-orders  ->  HTTP 201
  response (contract space):  documentType "vendorPurchaseOrder", lifecycleStatus "draft"
  documentNumber:             MAB-VPO-2026-0001
  procurementCase version:    1 -> 2

stored row (manifest space), read back through /graphql:
  documentType     VENDOR_PURCHASE_ORDER     <- mapping verified
  lifecycleStatus  DRAFT                     <- mapping verified
  currencyCode     SAR                       <- renamed field verified
  createdBy        source=API  name=pashx-operator@pashx-mab.invalid
  updatedBy        source=API  name=pashx-operator@pashx-mab.invalid
```

Both mapping directions are proven in one exchange: the contract keeps camelCase, storage holds
UPPER_CASE, and the translation happens only at the write boundary. The actor name resolved through
the **email fallback**, which is the exact branch that previously threw the TypeError in finding 31
— so that fix is exercised, not merely bypassed.

Idempotency and numbering, same session:

```
1st call, key K   -> ok, replayed=false, MAB-VPO-2026-0002
2nd call, key K   -> ok, replayed=TRUE,  MAB-VPO-2026-0002   (no duplicate row)
total documents   -> 2  (MAB-VPO-2026-0001, MAB-VPO-2026-0002)
```

RECONCILIATION IDEMPOTENCY VERIFIED 2026-08-11. `reconcileSupportTables` runs inside every command
transaction, so it has now executed on every invocation. Measured across a further distinct command:

```
                 version   reconciled_at                      receipts  counter  audit  pashx_ tables
before               1     2026-08-10 10:08:27.102701+00         2        2       2        4
after                1     2026-08-10 10:08:27.102701+00         3        3       3        4
```

`reconciled_at` is byte-identical, which is stronger evidence than the version alone: the
`UPDATE ... SET version, reconciled_at = now()` is gated on `installedVersion < VERSION` and did not
fire. Schema state frozen while the business counters advanced, and no duplicate support table was
created. Second pass is a no-op.

STORAGE DRILL VERIFIED 2026-08-11.

Upload and download are proven by the application's OWN behaviour rather than a synthetic probe —
`app:publish` wrote the built front component, dependency manifest and generated SDK client into GCS,
namespaced by workspace and application id:

```
gs://pashx-mab-documents-pashx-mab-pilot/160a3718-…/058263f0-…/built-front-component/src/front-components/create-vendor-purchase-order.front-component.mjs
gs://…/058263f0-…/dependencies/package.json          <- read back, contains "version": "0.1.2"
gs://…/058263f0-…/generated-sdk-client/
```

Those objects survived roughly thirteen VM replacements, which is the actual proof of the
"no durable VM filesystem state" requirement: the compute is disposable and the data is not.

Delete and recovery, on a throwaway key so no application object was risked:

```
1. upload                      OK
2. download                    drill-content-v1
3. delete                      OK
4. live object                 gone
5. noncurrent version retained probe.txt#1786458127729875
6. restored from noncurrent    drill-content-v1
7. purged (all versions)       OK
```

Step 5–6 are the point: an accidental document deletion is recoverable, because versioning is on.

Bucket posture, read from the live bucket:

| Property | Value |
|---|---|
| `publicAccessPrevention` | `enforced` |
| `uniformBucketLevelAccess` | `true` |
| `versioning` | `Enabled` |
| location | `ME-CENTRAL1` |
| anonymous GET of a real object | **HTTP 403** |

Still outstanding: the remaining CL2 scenarios, and the p95 alert drill (collector is healthy now, so
it is unblocked).

TESTING NOTE: this was executed with `node` INSIDE the server container against
`http://localhost:3000`, bypassing Caddy, because public HTTPS was unusable at the time (finding 35).
Credentials were passed on stdin so they never appeared in `ps` on the host. The application path is
identical; only the TLS edge is skipped.
Elapsed:                six build/deploy cycles, ~20 min each
```

### Workspace admin credential

The pilot admin is `moideenshahil2@gmail.com`. Its password was generated with `openssl rand`
and stored in Secret Manager as **`pashx-mab-pilot-admin-password`**. It has never been printed
to a terminal, written to the repository, or passed as a command argument.

`workspace:seed:dev` was deliberately NOT used. It has no production guard and creates
`tim@apple.dev` with a bcrypt hash committed to the public upstream repository; this host is
internet-facing (`pashx-mab-allow-https` allows `0.0.0.0/0` on 80/443), so seeding it would have
placed admin accounts with publicly known credentials on the open internet.

**Terraform drift**: that secret was created with `gcloud`, not Terraform, so it is not in state.
Either import it or add it to `secrets.tf`.

**Open security item**: signup is open on a public host. Anyone who finds the URL can create a
workspace. Recommend `IS_SIGN_UP_DISABLED=true` now that the pilot workspace exists.

```
Date/time:              2026-08-20
Image digest:           sha256:b0eb0260d40fbf4cfccebe379c3372ae8813c3278f6d4ac17f7a8b6c4780341f
                        (tag ui5-validator-fix-20260820, build 2147ee18, CL-I1)
Previous digest:        sha256:fbe0ae9e5917ab1c89ce67a4773cfe8efa058f03e439f0b31facee0b618047e7
                        (the CX2-R host, digest recorded in SG-ship-decision.md — rollback target)
Reason:                 UI5-T7 blocker. `app:install` for pashx-mab 0.2.2 failed with
                        ROLE_NOT_EDITABLE on rolePermissionFlag delete — an overly strict host
                        validator (flat-role-permission-flag-validator.service.ts) blocked an app
                        from cleaning up its OWN prior permission relation on a non-editable role.
                        Reviewed Codex's diff directly before building: the fix adds a narrow
                        carve-out (system build OR relation belongs to the calling application) —
                        does not weaken cross-application protection or allow modifying roles the
                        app doesn't own. The companion navigationMenuItem STANDALONE_PAGE error was
                        an app-manifest fix only, no host change needed for it.
Terraform plan:         1 to add, 7 to change, 1 to destroy — reviewed in full before apply, both
                        `-var` overrides applied explicitly (h0_controls_recorded and
                        container_image; terraform.tfvars checks in the unsafe defaults). VM
                        replaced (new image in startup script). Updated in-place: two logging
                        metrics (instance_id changes), three alert policies (`healthz_down`,
                        `metric_pipeline_down`, `sql_connections`) flipped disabled->enabled —
                        these had been left disabled since the pilot's last successful shutdown
                        cycle before the billing outage, not something this session's changes
                        caused. Cloud SQL activation_policy NEVER->ALWAYS (see note below). Cloud
                        SQL, VPC, secrets, IAM: not in the diff.
Apply result:           1 added, 7 changed, 1 destroyed — exactly as planned. VM create took 32s.
                        New image needed a full pull (not cached like the prior VM), so first
                        healthy boot took ~2 minutes rather than the usual ~20s.
Pre-deploy note:        `terraform init` failed on the GCS state backend with a billing-delinquent
                        error attributed to project `lynex-ai` — a stale ADC `quota_project_id`
                        left over from an unrelated earlier setup, unrelated to the pashx-mab-pilot
                        billing fix earlier today. Fixed with
                        `gcloud auth application-default set-quota-project pashx-mab-pilot`.
Scheduler note:         The `pashx-mab-shutdown` Cloud Scheduler job — found PAUSED since
                        2026-08-06 and resumed earlier today — fired exactly on schedule at
                        18:00:00 Asia/Riyadh (15:00:00Z) and correctly stopped both the VM and
                        Cloud SQL before this deploy started. That's why Terraform's refresh showed
                        `NEVER`/`TERMINATED` as the starting point above: real infrastructure, not
                        stale state. First full real-world confirmation the cost-control schedule
                        works end to end since the billing incident.
/healthz external:      PASS — HTTP 200 {"status":"ok","info":{},"error":{},"details":{}} over
                        https://34-18-165-1.nip.io, healthy ~2 min after apply completed.
App published:          pashx-mab v0.2.3 -> pashx-pilot server registry (--private), via
                        `yarn workspace pashx-mab twenty app:publish`. Tarball shasum
                        `64effa2eabdc169e19d8397e81c9e320b7e03090`, includes the PxD logo/cover
                        assets and IBM Plex font files from UI5-T2.
App INSTALLED:          YES — `app:install` succeeded with zero sync errors (both the
                        navigationMenuItem STANDALONE_PAGE and rolePermissionFlag ROLE_NOT_EDITABLE
                        errors from the 0.2.2 attempt are gone). Verified in core.application via
                        psql inside the server container, not from CLI output alone:
                        universalIdentifier 058263f0-1cc0-42e7-94a1-b4beb688e771 @ 0.2.3 (same
                        identifier as every prior install — confirmed upgrade, not a duplicate),
                        workspaceId 160a3718-ce23-4150-9142-4e7ddd8b8850 (the pilot workspace,
                        correct), updatedAt 2026-08-20 15:51:48 UTC.
Post-deploy state:      Left running intentionally — Codex needs the live shell for UI5-T7's real
                        acceptance matrix next. Not paused yet; will pause once that's done or on
                        explicit request, per Shahil's standing instruction to pause when nobody's
                        actively using it.
```

```
Date/time:              2026-08-20 (same day, second deploy)
Image digest:           sha256:57f0f9b95e64c1f7d9d5465207a255cf04c6cc3ba2e78707f6dd423703f6bf73
                        (tag pxd-rebrand-20260820, build a2abb310, CL-I1 continuation)
Previous digest:        sha256:b0eb0260d40fbf4cfccebe379c3372ae8813c3278f6d4ac17f7a8b6c4780341f
                        (the validator-only deploy directly above — rollback target)
Reason:                 the first CL-I1 build started before Codex finished adding
                        `packages/twenty-front/public/branding/*` (host-level PxD rebrand: browser
                        title, favicon, PWA manifest, auth/onboarding screens) — confirmed by file
                        mtimes (17:24:50 CEST, ~4 min after the first build's source tarball was
                        already uploading). App-level files were unchanged since the 0.2.3 install,
                        so no republish was needed, only a host rebuild/redeploy.
Terraform plan:         2 to add, 3 to change, 1 to destroy — reviewed before apply. Replaced: VM
                        (new image). Added: the instance-scoped deployer IAM binding (recreated,
                        tied to the new instance identity — same pattern as CL5's second deploy, not
                        a new grant). Updated in-place: two logging metrics (new instance_id). Alert
                        policies and Cloud SQL activation_policy were NOT in this diff — already
                        converged from the prior apply, no further drift.
Apply result:           2 added, 3 changed, 1 destroyed — exactly as planned. VM create took 20s.
/healthz external:      PASS — HTTP 200 {"status":"ok","info":{},"error":{},"details":{}} over
                        https://34-18-165-1.nip.io. Took longer than the health check's own status
                        showed — the Nest server had already logged "successfully started" while
                        Docker's healthcheck was still catching up; verified against the app's own
                        log timestamp, not just container status.
App:                    unchanged at pashx-mab v0.2.3 (no app-level diff since the last install —
                        this deploy was host-only).
Branding verification:  page `<title>PxD</title>`; favicon `/branding/pxd-favicon-48.png` reachable
                        (HTTP 200, image/png, 2596 bytes); `manifest.json` short_name/name both
                        "PxD"/"PxD Procurement", icons point at the bundled branding assets.
Not done:               live workspace `displayName`/`logo` update via `updateWorkspace` — the
                        mutation requires `userWorkspaceId`, which the available API_KEY-type token
                        does not carry (same limitation documented earlier for the
                        `pashx.procurement.issue` capability grant during CX2-R). This needs a real
                        user session token or a manual Settings-UI update; flagged for Shahil rather
                        than forced.
Post-deploy state:      Left running intentionally for Codex's UI5-T7 real-shell matrix.
```

```
Date/time:              2026-08-20 (same day, CL-I1-R)
Image digest:           sha256:c48dd052dcf79ca6fa18cee90d47d66b10a16ab813688106650ee06b1e66156d
                        (tag rtl-fix-0.2.4-20260820, build 7b9ec849)
Previous digest:        sha256:57f0f9b95e64c1f7d9d5465207a255cf04c6cc3ba2e78707f6dd423703f6bf73
                        (the branding deploy directly above — rollback target)
Reason:                 Codex's UI5-T7 found live app 0.2.3 switched Arabic copy but never set
                        dir="rtl"/lang="ar" on the dashboard root — HTML_COMMON_PROPERTIES in the
                        front-component renderer didn't allowlist those two attributes, so the
                        generated remote-element schema silently dropped them before the host DOM.
                        Reviewed the diff before building: adds `dir`/`lang` as optional strings to
                        the allowlist, regenerates the host/remote registries from the canonical
                        generator (not hand-patched), adds one focused regression. Narrow and safe.
Terraform plan:         1 to add, 3 to change, 1 to destroy — reviewed before apply. VM replaced
                        (new image); two logging metrics updated (new instance_id). No IAM binding
                        recreate this time (instance-scoped binding didn't need it). Cloud SQL,
                        alert policies, VPC, secrets: not in the diff — already converged.
Apply result:           1 added, 3 changed, 1 destroyed — exactly as planned.
/healthz external:      PASS — HTTP 200 {"status":"ok","info":{},"error":{},"details":{}}.
App published/installed: pashx-mab v0.2.4, tarball shasum `6b13b45c2902657d748d23539d5758ecc3fe09ed`.
                        `app:install` clean, zero errors. Verified in core.application via psql:
                        universalIdentifier 058263f0-1cc0-42e7-94a1-b4beb688e771 (same as every
                        prior install), workspaceId 160a3718-ce23-4150-9142-4e7ddd8b8850, updatedAt
                        2026-08-20 17:27:14 UTC.
RTL verification:       NOT done by Claude. Codex's own handoff said "I resume RTL verification"
                        as its next step — that's UI5-T7 territory (real-shell acceptance), not
                        CL-I1-R (deploy + infra verification). Attempted a live DOM check anyway to
                        be thorough; stopped at the login screen — this pilot workspace was created
                        via real signup (not workspace:seed:dev), so there's no prefilled test
                        credential, and logging in with a password is outside what Claude does
                        regardless of authorization. Left this to Codex as originally scoped.
Post-deploy state:      Left running intentionally for Codex's resumed UI5-T7 checks (RTL, keyboard,
                        200% zoom, safe-state fixtures).
```

## CL5 session findings — 2026-08-13 — Claude Code

Diagnosis and workstation setup performed before starting the CL5 build/deploy. No cloud
resource was created, modified, or deleted in this pass; one Cloud Build was submitted
(image `73b0add5e4`, in progress — see the CL3/CL5 image build record once it completes).

**Finding 35, root cause found (was previously unexplained).** "Public HTTPS was unusable"
because Caddy's automatic-TLS site block is bound to `34.18.165.1.nip.io` (dots — the actual
SNI Caddy answers), while this doc, `runbook-deploy.md`, and the H0 record all use
`34-18-165-1.nip.io` (dashes — nip.io's usual dash convention). Requesting the dashed form
gets no matching TLS policy and Caddy aborts the handshake with a raw `internal_error` alert
before sending a certificate — confirmed with `openssl s_client`, so it is not a client
quirk. The **dotted** hostname returns `200 {"status":"ok"}` cleanly. The app was never down;
every doc referencing the dashed hostname is wrong and should be corrected to the dotted
form the next time anyone touches these files. Not fixed in this pass — flagging only, since
Caddy's `Caddyfile` is the source of truth and could instead be pointed at the dashed form if
that's preferred; either way the docs and the live config need to agree.

**Finding 36 — new. Uncommitted deletion of 78 tracked files under `packages/twenty-sdk` and
`packages/twenty-ui`.** Found before starting the build: `git status` showed 78 tracked files
(real source, not only tests/mocks — e.g. `build-application.ts`, `cleanup-removed-files.ts`)
missing from the working tree, uncommitted. The production Dockerfile `COPY`s both directories
in full (`packages/twenty-docker/twenty/Dockerfile:72,74`) as part of the `yarn workspaces
focus` set, so building with these files missing would have failed partway through the Cloud
Build — after the upload, mid-build. Restored with `git checkout -- <paths>` from `HEAD`
(committed state, unaffected). Origin of the deletion is undiagnosed; it predates this
session and predates the last commit (`73b0add5e4`, 2026-08-12T13:15+02:00) by working-tree
mtimes, so it is not something CL5 introduced. Worth a `git status` check at the start of any
future node before building.

**Finding 37 — new. This workstation had no cloud/build tooling installed at all**, unlike
prior CL0 sessions which found `gcloud`/`terraform` pre-installed on whatever machine ran
them. `gcloud`, `terraform`, `node`, and `npm` were all absent; the earlier local-disk-pressure
Cloud Build narrative and the `node_modules` reinstall context posted in chat both belong to a
**different machine's session** — this workstation independently measured 341 GB free, and
`gcloud`/`terraform`/`node` had never been touched here. Installed, all portable (no
`brew`/`sudo`, so `sudo`-requiring `.pkg` installers were avoided):

- Google Cloud SDK 580.0.0 → `~/google-cloud-sdk`, using a portable CPython 3.11.15 build
  (`~/.local/cpython311`) because the SDK's current release requires Python ≥3.10 and the
  system's `/usr/bin/python3` is 3.9 — `CLOUDSDK_PYTHON` points at the portable interpreter.
- Node.js v24.16.0 → `~/.local/node`, matching the repo's `.nvmrc`/`engines.node`. Needed only
  by `build-and-push.sh`'s one `node -p "require(...).version"` line, not for a local app run.
- Terraform v1.15.8 → `~/.local/bin-terraform`, matching the version this doc's earlier
  sessions verified against (google provider 6.50.0).

All three added to `~/.zshrc` `PATH`/`CLOUDSDK_PYTHON`. Authenticated `gcloud` as
`moideenshahil2@gmail.com` (the user's own account login, not a service-account key) —
confirmed `roles/owner` on `pashx-mab-pilot`, and confirmed the account holds five other
unrelated GCP projects, so every command in this and future sessions should keep passing
`--project` explicitly per this doc's own standing instruction.

**Finding 19 (tfvars gate footgun) reconfirmed live, not yet closed.** `terraform.tfvars` on
this workstation currently reads `h0_controls_recorded = false` and `container_image = ""`
— both the *committed default* per `.tfvars.example`'s intent, but also exactly the state that
turns any apply into a full-environment destroy plan. `deploy/pashx-mab/deploy.sh` passes only
`-var="container_image=..."` on `terraform plan`/`apply`; it does **not** override
`h0_controls_recorded`. Running `deploy.sh` unmodified against this tfvars file would plan
`0 to add, ~74 to destroy` (VM, Cloud SQL, bucket, everything), not the intended
image-swap-only diff. Not run — caught before any `terraform plan` was executed. CL5's
deploy step will pass both `-var` flags explicitly and the plan will be read for `0 to
destroy` before any apply, per this doc's own standing rule. `deploy.sh` itself is still
unpatched and will trip the same trap for the next person who runs it as documented; worth a
follow-up fix (`h0_controls_recorded=true` hardcoded into `deploy.sh`'s `terraform plan` call,
since deploy-only nodes should never be able to close the gate).

## CL2-R — Cloud SQL rerun, 69/69 — 2026-08-13 — Claude Code

CL5's final acceptance step. Rerun of the full CL2 suite (10 files, 69 assertions) against real
Cloud SQL `twenty_test`, targeting the pilot's existing disposable workspace
`20202020-1c25-4d02-bf25-6aeccf7ea419` with app `0.1.3` installed there (see the CL5 findings
above for the publish/install evidence). Connectivity per IDR-0002 — SSH/IAP local forward
through `pashx-mab-app` to its `socat` forwarder, no public Cloud SQL exposure, no firewall
change.

**Result: 10/10 suites, 69/69 assertions, PASS.**

```
Test Suites: 10 passed, 10 total
Tests:       69 passed, 69 total
```

Getting here took five runs and four infrastructure/data fixes plus two test-file fixes, all
with concrete evidence rather than guesses:

**Finding 38 — number-counter drift (data repair, not a code defect).** First run: 45/69 failed,
every one of the 10 suites, every failure cascading from the very first `POST` returning `409`
even with completely fresh `randomUUID()`-based fixtures. Manually reproduced with hand-seeded
data (bypassing the suite) and got the same `PASHX_NUMBER_CONFLICT` on a guaranteed-fresh
request — ruled out a fixture collision. Root cause: `pashx_number_counter` for
`vendorPurchaseOrder/2026` read `current_value = 61`, but a document already existed numbered
`MAB-VPO-2026-0062` — the counter was one behind the actual highest allocated number, so the
very next allocation (62) collided every time. This workspace has been reused across many
sessions over multiple days; the drift almost certainly accumulated from an interrupted run at
some point in that history, not from anything in this session. Repaired by advancing the counter
to `GREATEST(current_value, actual max existing document number)` per period — a pure data
correction on the disposable `twenty_test` workspace, not a code or schema change. Verified
`SELECT` before/after; only the 2026 row needed advancing (2025/2027 had no colliding documents).

**Finding 39 — SSH/IAP tunnel died mid-run under sustained load, twice.** The local port-forward
(`ssh -L 5433:localhost:5432`) exited partway through two separate full-suite runs, which
cascaded into every subsequent query failing with `AggregateError` for the rest of that run
(69/69 failed in one case). `ServerAliveInterval=30`/`ServerAliveCountMax=6` was not sufficient.
Fixed by wrapping the tunnel in a restart-on-exit loop
(`scratchpad/keep-tunnel-alive.sh` — `while true; do gcloud compute ssh ... -L 5433:localhost:5432
-N -o ServerAliveInterval=10 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes; sleep 2; done`),
so a drop only costs the one in-flight query rather than the rest of the run. The VM-side `socat`
forwarder itself never needed a restart — only the client-side leg died.

**Finding 40 — Jest's default 20s timeout was too tight for the tunnel's added latency.** After
fixing finding 38, a rerun still failed 38/69, now uniformly `Exceeded timeout of 20000 ms`
(zero `PASHX_*` errors) — concentrated in suites with multiple sequential or parallel round
trips (`06` with 8 concurrent commands, `10` with several sequential date-boundary cases). Every
query on this workstation crosses Mac → IAP → VM → `socat` → Cloud SQL, materially slower than
however the original 67/69 run was executed. Fixed with `--testTimeout=60000` on the CLI (no
file changes — this is a workstation/environment parameter, not a suite property worth pinning
in the committed config).

**Finding 41 — scenario 8's expected error code was wrong, and self-contradictory on inspection.**
`test/integration/pashx-mab/suites/08-injected-failure-rolls-back-every-write.integration-spec.ts`
expected `{ code: 'PASHX_NUMBER_CONFLICT', retryable: false }`, but the shared contract
(`packages/pashx-mab-contract/src/errors.ts`) defines `PASHX_NUMBER_CONFLICT.retryable === true`
— the test's own expected object could never be satisfied by a spec-compliant server. The
scenario reuses the same `commercialDocumentRecordId` (primary key `id`) across two requests,
but each request allocates its own fresh document number *before* the insert (per the file's own
documented production order), so the two requests' numbers never collide — only the `id` does.
The actual server response, `{ code: 'PASHX_RECORD_CONFLICT', retryable: false }`, is internally
consistent with the contract and matches this mechanism. A prior session's "CORRECTION" comment
in this file (claiming the violation lands on the `name` index, not `id`) was itself the error.
Reverted the docstring and the assertion to `PASHX_RECORD_CONFLICT`, with the reasoning recorded
inline so it isn't re-flipped without re-deriving why.

**Finding 42 — scenario 1's missing-token assertion was stale, not a new finding.** This is the
same "missing-token status" item the 2026-08-12 continuation graph already recorded as
adjudicated: Twenty's fail-closed guard answers a missing bearer with `403`, not `401` — proven
by CX4, and distinct from a structurally invalid or expired token (both still correctly `401`,
and both already passed before this fix). Updated `01-permission-layers-fail-closed
.integration-spec.ts`'s one assertion to `403`; `expectNothingWasWritten` still confirms no
write occurred, so there is no evidence of an authentication bypass.

Both test-file fixes are within `test/integration/pashx-mab/`, Claude's exclusive CL2 path per
this ledger's own ownership rule.

## Gate 0 storage suite — presign/CORS closure — 2026-08-14 — Claude Code

The 2026-08-11 storage drill (see "STORAGE DRILL VERIFIED" above) exercised the driver directly
from inside the server process — real upload/download/delete/version-recovery/permission-denial,
but not the three items that specifically require a *browser-facing* presigned flow: CORS
preflight, presigned direct PUT, presigned download/redirect. Those were still marked "not run"
until now.

**Root cause, found before testing anything:** `STORAGE_S3_PRESIGNED_URL_ENABLED` defaults to
`false` in `twenty-server`'s config (`config-variables.ts`), and nothing in this deployment ever
set it — not `env.template`, not the Terraform startup-script template. The HMAC access
key/secret were present and correctly wired (provisioned back at CL0), so
`createFileUpload`/`completeFileUpload` silently fell back to the server-mediated streaming path
(`PUT /file-upload/:id`) instead of ever returning a real `storage.googleapis.com` presigned URL.
`env.template`'s own comment claimed this section was "frozen by the Gate 0 compatibility suite"
— that was wrong; the suite that ran never touched this flag or this code path.

**A second, unrelated finding while investigating:** `docker exec pashx-mab-server-1 env | grep -i
storage` was run to confirm the driver's live config and printed `STORAGE_S3_SECRET_ACCESS_KEY`
in plaintext into this session's own transcript. Treated as compromised, same as the earlier
Postgres password leak. Rotated immediately: new HMAC key pair created for
`pashx-mab-runtime@`, both Secret Manager secrets (`pashx-mab-storage-hmac-access-key`,
`pashx-mab-storage-hmac-secret`) updated to new versions, old key deactivated then deleted from
GCS (`gcloud storage hmac delete`) after the new key was confirmed working end to end.

**Fix:** added `STORAGE_S3_PRESIGNED_URL_ENABLED=true` to
`infra/pashx-mab-gcp/terraform/templates/startup-script.sh.tftpl` (the actual source of truth —
`env.template` is documentation only; the runtime env file is built line-by-line in the startup
script, confirmed by testing that editing `env.template` alone produced `terraform plan: No
changes`). Bundled into the same deploy as the HMAC rotation to avoid two separate VM restarts.

```
Terraform plan:  1 to add, 3 to change, 1 to destroy — VM replace (new startup script content,
                 picks up the new HMAC secret versions and the presign flag) plus two logging
                 metric normalizations. Reviewed before apply; no Cloud SQL/VPC/other-secrets/
                 uptime-check/alert-policy/bucket changes.
Apply result:    1 added, 3 changed, 1 destroyed — exactly as planned. VM recreate: 19s create.
/healthz:        200, healthy 30s after apply.
Server logs:     clean boot, no storage-related errors.
```

**Presign/CORS verification, end to end, real GCS, throwaway object:**

```
1. createFileUpload (GraphQL, /metadata)     -> uploadUrl host = storage.googleapis.com
                                                 (previously: 34-18-165-1.nip.io, the fallback
                                                 stream endpoint — confirms the flag was the gap)
2. OPTIONS <uploadUrl>                        -> 200
                                                 access-control-allow-origin: <matches Origin sent>
                                                 access-control-allow-methods: includes PUT
                                                 access-control-allow-headers: content-type
3. PUT <uploadUrl>, 27-byte payload           -> 200, x-goog-stored-content-length: 27
4. completeFileUpload (GraphQL, /metadata)    -> id, path, size=27, url (app-hosted redirect
                                                 endpoint, not a raw GCS URL)
5. HEAD <completeFileUpload's url>            -> 302, Location: storage.googleapis.com/...
                                                 ?X-Amz-Credential=<NEW HMAC key>/... (confirms
                                                 the rotated key is live, not just present)
6. GET <redirect target>                      -> 200, body byte-identical to the uploaded payload
7. Cleanup                                    -> gcloud storage rm (object versioned, not fully
                                                 purged — expected, matches bucket's own
                                                 versioning policy from the 2026-08-11 drill)
```

All 9 items of the Gate 0 storage compatibility suite now have real evidence:

| # | Check | Evidence |
|---|---|---|
| 1 | Server-side upload | 2026-08-11 drill |
| 2 | Server-side download | 2026-08-11 drill |
| 3 | Browser CORS preflight | 2026-08-14, above — `200`, correct `access-control-*` headers |
| 4 | Presigned direct `PUT` | 2026-08-14, above — `200`, direct browser-to-GCS, no server in the data path |
| 5 | Presigned download/redirect | 2026-08-14, above — `302` to a correctly-signed GCS URL |
| 6 | Delete | 2026-08-11 drill |
| 7 | Restart persistence | 2026-08-11 drill (survived ~13 VM replacements) |
| 8 | Version recovery | 2026-08-11 drill |
| 9 | Permission denial | 2026-08-11 drill (anonymous GET → 403) |

## Reversal rehearsal record

To be appended once the environment exists. Required before CL0 moves to `complete`.

```
Backup/PITR drill:      date, restore point, RPO observed, RTO observed, result
Rollback drill:         date, from-digest, to-digest, elapsed, result
Alert drill:            uptime alert fired/received, secret-leak metric fired/received,
                        budget notification received
Teardown rehearsal:     date (end of pilot only), verification that nothing billable remains
```

## CX2-R diagnosis — case 673e42af stuck at Creating… — 2026-08-13 — Claude Code

Read-only diagnosis only, per Codex's explicit request. CX2-R attempted a fresh submission
against the pilot (not `twenty_test`); it stayed at "Creating…" past 40s, Cancel worked
client-side. Codex asked Claude to determine what state, if any, this left in the database and
where in the request lifecycle it stopped — not to retry, not to touch app code.

**Context found first, before diagnosing:** the working tree had uncommitted changes from
Codex — `pashx-mab` bumped `0.1.3` -> `0.1.4` and
`create-vendor-purchase-order.front-component.tsx` modified (matches "compiled 30-second
`Promise.race`"). Confirmed via `core.application` in the pilot workspace:
`058263f0-1cc0-42e7-94a1-b4beb688e771 @ 0.1.4`, installed `2026-08-13 12:21:13 UTC`. The
deployed **container image is still CL5's `73b0add5e4`** — publishing an app only uploads a
tarball to the running server's registry, it does not require a new image, so "0.1.3 vs 0.1.4"
is really "same backend, newer frontend bundle."

**Case state:** `_procurementCase` id `673e42af-b5d6-4d36-b222-38f70127b3b6`, name
`CX2-R 2026-08-13`, `aggregateVersion = 0`, `updatedAt = 2026-08-13 12:04:27 UTC` — created ~19
minutes before the reported 12:23–12:24 UTC incident window, never touched since. A successful
command always increments `aggregateVersion` to at least 1 (verified by CL2 scenario 2), so this
alone proves no command ever committed against this case.

**Support tables, pilot workspace `workspace_1az1h6f7fvug2nagkn96par0w`, queried for
`> 2026-08-13 11:50:00 UTC`:**

| Table | Rows found | 
|---|---|
| `_commercialDocument` | 0 |
| `pashx_command_receipt` | 0 |
| `pashx_audit_event` | 0 |
| `pashx_number_counter` (`vendorPurchaseOrder`/2026) | unchanged at `3`, no timestamp column to bound further but no document exists to justify an advance |

Zero writes on every table a successful — or even a rolled-back-after-allocating-a-number —
command would touch. This alone rules out "committed with a lost response": a real commit would
have left all four behind.

**Server logs, `pashx-mab-server-1`, `2026-08-13T12:13:00Z`–`12:40:00Z` (27 minutes, spans the
incident with wide margin):** 42 total lines, all timestamped `12:16:55` or `12:21:08`–`12:21:13`
— the app-install sequence itself (tarball upload, manifest migration, front-component update,
`Successfully installed app … v0.1.4`). **Zero lines between 12:21:13 and 12:40:00**, a
19-minute silence spanning the entire reported incident window. Container has been continuously
up since `11:48:30 UTC` (the VM restart for the CL5 password rotation) — no crash or restart
during the incident, so silence is not a log-loss artifact.

**Cloud SQL's own logs (`gcloud logging read`, `cloudsql_database` resource) for the same
window:** only routine `cloudsqladmin.public.heartbeat` autovacuum/autoanalyze and checkpoint
entries — Cloud SQL's own internal housekeeping, nothing from the application database or user.
No slow query, no lock wait, no deadlock, no new connection logged at the incident timestamps.

**Caddy logs, same window:** the only entries are unrelated `/metadata` requests (Twenty's own
background polling, `Accept: text/event-stream`, all aborted client-side in <0.1s — ordinary
navigation churn, not the vendor-PO submission). **Zero entries mentioning
`vendor-purchase-order` or `pashx-mab` anywhere in the window.** Caveat: Caddy here only logs
`warn`-level "aborting with incomplete response" events for streaming (SSE) requests: the
vendor-PO endpoint is a plain JSON POST, a different code path, so this absence is suggestive but
not on its own conclusive the way the other three are.

**`pg_stat_activity` right now:** no blocking or long-running sessions — expected and
uninformative, since ~5.5 hours have passed since the incident and any client-held connection
would have been cleaned up on disconnect regardless of what happened.

**Conclusion:** four independent signals (case version, all four support tables, Nest's own
application logs, Cloud SQL's own logs) show complete silence for the entire incident window,
with the sole partial exception being Caddy's proxy logs, which don't capture this request type
either way. This is not "server hung mid-transaction" — a hang inside the command handler would
still show a new Postgres connection/query in Cloud SQL's logs, and CX4's error-logging fix would
catch and log any thrown exception. The evidence points to **the request never reaching the Nest
PashX controller** — most likely a client-side failure to dispatch (or a `Promise.race` bug that
never resolves either branch), not a cloud, database, or CL2-harness defect. This is Codex's
repair to make (the frontend file it just modified), not Claude's.

**Not done, per explicit instruction:** did not retry the PO, did not create another case, did
not publish `0.1.5`, did not expose Cloud SQL publicly, did not touch any Codex-owned app file
beyond reading it for context. Used direct `docker exec … psql` on the VM for all queries — the
live pilot database is already reachable that way with no separate tunnel, so no IAP/SSH tunnel
was opened or needed to be torn down for this diagnosis.

**CX2-R status: failed, pending repair — not a completed node.** This corrects the earlier
2026-08-13 13:35 handoff, which reported CL5+CL2-R complete and CX2-R merely "ready"; it did not
yet know CX2-R had already been attempted and failed by the time it was written.

## Commands run in this node

All read-only. The full list is in [`inventory-2026-08-05.md`](inventory-2026-08-05.md#commands-run).

Only side effect on the workstation: `gcloud` auto-installed its local `beta` component while
attempting `gcloud beta billing projects describe`. That is a local tooling change, not a cloud
change, and is not billable.

## Startup-script hardening — 2026-08-23 — Claude Code

The Caddy/otel-collector tmpfs-mount race (both containers exiting 127 on some cold boots — first
seen 2026-08-20, recurred 2026-08-23) is fixed in `startup-script.sh.tftpl`: `compose up -d` now
retries up to 3 times, 5s apart, before treating a failure as fatal. `compose up -d` is idempotent,
so a retry only touches whatever failed on the prior attempt. Applied via Terraform
(`terraform_data.startup_script_revision` change only — host image digest unchanged,
`sha256:5c870c3751bf067fe3f2206a080bd58a48c00fcd29d87acb72216092c9e96546`). Verified live: next
cold boot completed with `server healthy` / `exit status 0` on the first attempt, no retry needed
that time, all 5 containers healthy, external `/healthz` 200. Full detail and the plan review are
in the shared ledger, 2026-08-23 19:59 CEST entry.

## OC6-A Command Centre loading-feedback host repair — 2026-08-24 — Codex

Shahil explicitly authorized the Command Centre loading-feedback repair. The root cause was the
native Twenty `PageLayoutRendererContent` returning `null` while page-layout metadata initialized,
not the PashX loader or front-component renderer. The repair uses the existing
`WidgetSkeletonLoader`; focused Jest coverage passes both states (2/2) and formatting is clean.

Cloud Build `929f6a51-0c90-4f0b-ade7-1a0e1bcb6399` completed successfully in 18m56s. Immutable
image: `sha256:9dba74f7425bcdc523132923824738df8b6e25749f1f3f32e34aca25e38fe3ec`.
Rollback: `sha256:a33a2ff46b2f78714f3f4c57d7058cc4a20288e33634ed380aaae5de7493452f`.

The guarded plan used both `h0_controls_recorded=true` and the digest-pinned image. Review showed
only the expected VM replacement, deployer instance-IAM reattachment, instance-ID-dependent log
metric updates, re-enabling three alerts disabled by scheduled shutdown, and startup-script hash
change: `2 add / 6 change / 1 destroy`. No SQL, network, bucket, secret or business-data resource
changed. Apply completed with that exact count.

Verification: startup service exited `0`; `/healthz` returned 200 after 140 seconds; all five
containers became healthy; the running server image reference exactly matches `9dba74f7…`; installed
PashX remained `0.2.10`; no real ERROR/FATAL/Unhandled/ECONN server line was found. A live hard
reload exposed skeleton placeholders at one and 3.5 seconds, then the complete Command Centre with
truthful post-fixture-cleanup data. Shutdown workflow execution
`f5dbd7ab-a48b-481a-8fd5-fa173d6c0be6` then succeeded in 87.25s. Final state: VM `TERMINATED`,
Cloud SQL `STOPPED / NEVER`, and the three schedule-sensitive availability policies disabled.
