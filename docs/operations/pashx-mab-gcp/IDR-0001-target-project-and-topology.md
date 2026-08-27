# IDR-0001: MAB pilot target project and cloud topology

**Status:** Proposed — blocks CL0 apply
**Date:** 2026-08-05
**Deciders:** Shahil (H0 owner). Claude Code records; Codex is informed.
**Scope:** Infrastructure only. This is an *infrastructure* decision record kept in
`docs/operations/`, not an architecture ADR — `docs/architecture/` is Codex-owned and is not
modified by CL0.

## Context

The execution graph names a "dedicated MAB Google Cloud environment" as the authoritative
integration target, requires a disposable database/workspace boundary for destructive T3 tests,
and requires that Cloud SQL never be public and that IAM be least privilege.

The read-only inventory ([`inventory-2026-08-05.md`](inventory-2026-08-05.md)) found that the
recorded project `pashxd-e56c5` is a **live product project**: a Cloud Run API serving 100%
traffic, five agent jobs and six schedulers firing daily with outbound external effects,
Firebase Auth, Firestore, 13 production secrets, and a default compute service account holding
project-wide `roles/editor`.

Forces at play:

- CL2 and CL3 will deliberately run destructive concurrency, rollback, and reconciliation tests.
- CL0 acceptance requires proving teardown. Teardown inside a live project is a foot-gun.
- The single human principal is both owner and deployer, so a least-privilege split cannot be
  demonstrated within one project's existing IAM.
- MAB is a Saudi procurement pilot with a ZATCA path; data residency may become a hard
  requirement, and Cloud SQL region is immutable after creation.
- Cost and setup time favour reusing what already exists.

## Decision

Provision the MAB pilot into a **new, dedicated project** — proposed ID `pashx-mab-pilot` — in a
single region, with the Twenty/PashX server and worker on one reproducible GCE VM behind
HTTPS, a private Cloud SQL PostgreSQL 16 instance reached over Private Services Access, and a
dedicated GCS bucket via Twenty's S3-compatible driver.

`pashxd-e56c5` remains untouched by CL0 except for read-only inspection.

## Options considered

### Option A: New dedicated project `pashx-mab-pilot` (recommended)

| Dimension | Assessment |
|---|---|
| Complexity | Medium — one extra project, one extra billing link |
| Cost | No premium; identical resource cost, cleanly attributable |
| Blast radius | Isolated. Destructive tests and teardown cannot reach the live product |
| Least privilege | Provable from an empty IAM policy |
| Teardown | `terraform destroy` on an isolated project is safe and rehearsable |
| Team familiarity | Same account, same tooling |

**Pros:** satisfies "dedicated environment" literally; teardown and IAM acceptance become
demonstrable rather than argued; per-project budget makes the cost ceiling enforceable; a future
region change means recreating a throwaway project, not migrating a live one.
**Cons:** requires Shahil to create the project and attach billing; the existing `pashxd`
Artifact Registry cannot be reused without a cross-project IAM grant (a 20 MB-per-push cost, not
a design problem).

### Option B: Reuse `pashxd-e56c5` with `pashx-mab-*` name prefixes

| Dimension | Assessment |
|---|---|
| Complexity | Low to start, high to operate |
| Cost | Slightly lower — shared registry |
| Blast radius | **Shared with production.** VPC, firewall, and IAM changes are project-wide |
| Least privilege | Cannot be proven; `roles/editor` on the default compute SA already exists |
| Teardown | Dangerous — a mis-scoped destroy reaches Cloud Run, schedulers, and 13 live secrets |
| Team familiarity | Highest |

**Pros:** fastest path; APIs partially enabled; registry already warm.
**Cons:** fails the graph's dedicated-environment and least-privilege requirements; a Cloud NAT
or firewall change affects live egress; the SG gate explicitly requires that no pre-existing work
be overwritten, and this option makes that a manual promise rather than a structural guarantee.

### Option C: Reuse the near-empty sibling project `pashxd`

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | Same as A |
| Blast radius | Isolated in practice — the project is effectively empty |
| Least privilege | Provable |
| Teardown | Safe |
| Team familiarity | Medium — name collides visually with `pashxd-e56c5` |

**Pros:** all of A's isolation with no project-creation step.
**Cons:** `pashxd` versus `pashxd-e56c5` is a one-character-class difference in every console
URL, `gcloud --project` flag, and runbook command. During destructive testing and teardown that
ambiguity is a real incident risk. Its current purpose is also unknown, so "effectively empty"
is an assumption, not a fact.

## Trade-off analysis

The decisive trade is **setup convenience versus a provable blast-radius boundary**. Options B
and C are cheaper by roughly one hour of setup. Option A is the only one where the CL0
acceptance criteria "IAM is least privilege" and "teardown is proven" can be evidenced rather
than asserted, and the only one where a wrong `terraform destroy` cannot reach a running
product. For a pilot whose entire purpose is producing trustworthy audit evidence, the boundary
is worth more than the hour.

Between B and C: if Shahil refuses a new project, **C is preferred over B** despite the naming
risk, and every runbook command must then hard-code `--project` with no reliance on
`gcloud config`.

## Region sub-decision — RESOLVED 2026-08-06: `me-central2`

| Candidate | For | Against |
|---|---|---|
| `europe-west1` (Belgium) | Matches the existing PashxD footprint and Europe/Berlin operations; lowest cost; every service available | Saudi financial documents stored in the EU. If ZATCA or MAB imposes in-kingdom residency, Cloud SQL cannot be moved — it must be recreated |
| `me-central2` (Dammam) | In-kingdom residency; lowest latency for MAB users | ~20–25% higher cost; smaller machine-type and feature catalogue; further from the operator |

**Decision: `me-central2` (Dammam), zone `me-central2-a`.** Shahil chose in-kingdom residency on
2026-08-06.

This is the conservative choice and the right one if MAB acceptance data will ever be real. The
region is immutable for Cloud SQL and the bucket, so the alternative — starting in
`europe-west1` and moving later — is not a migration, it is a rebuild.

Availability verified before recording, not assumed:

| Check | Result |
|---|---|
| Cloud SQL supports the region | yes — `me-central2` appears in `gcloud sql tiers list` |
| `e2-standard-4` present | yes, in all three zones (`me-central2-a/b/c`) |
| `cos-stable` image family resolves | yes — `cos-stable-121-18867-528-43` |
| Gate-open plan places every regional resource in `me-central2` | yes — verified in the plan output; no stray `europe-west1` |

**Two consequences that follow from this choice and are not yet settled:**

1. **Cost.** `me-central2` runs roughly 20–25% above `europe-west1`. The recommended tier moves
   from ~$246 to ~$300/month ≈ **₹26,400** — about **2.9×** the recorded ₹9,000 ceiling, up from
   2.4×. See `cost-estimate.md`.
2. **Data classification (H0 input 5) is now load-bearing.** Choosing in-kingdom residency only
   makes sense if the data is, or will become, resident-restricted. But the architecture overview
   states the pilot environment holds *disposable* data only until the SG gate. Those two
   statements need reconciling: either the residency choice is forward-looking insurance (fine,
   say so), or real MAB data is expected sooner than the graph assumes — which changes the
   destructive-test rules in CL2.

## Redis sub-decision

Containerized Redis on the application VM (as in `packages/twenty-docker/docker-compose.yml`,
`--maxmemory-policy noeviction`) rather than Memorystore. Saves roughly $35/month. The cost is
that BullMQ queue state is lost if the VM is replaced. That is acceptable for a pilot where no
durable business state lives in Redis — every authoritative write is in the Cloud SQL
transaction per ADR-0001 — and it keeps the VM genuinely replaceable. Revisit before real users.

## Consequences

**Easier:** teardown, cost attribution, budget enforcement, least-privilege proof, and a clean
`terraform destroy` rehearsal. Destructive T3 tests stop being a production risk.

**Harder:** one more project to keep in `gcloud config`; cross-project image pulls need an
explicit `roles/artifactregistry.reader` grant if the existing `pashxd` registry is reused
instead of a new one (the Terraform creates a new one by default).

**To revisit:** region if residency hardens; Redis if queue durability starts to matter;
project consolidation after the pilot ends.

## Action items

1. [ ] Shahil: choose Option A, B, or C and record it in the shared context (H0).
2. [ ] Shahil: choose the region and confirm the data-classification statement it depends on.
3. [ ] Shahil: record the public hostname, or accept the IP-based `nip.io` fallback for the pilot.
4. [ ] Shahil: record the monthly budget ceiling — see [`cost-estimate.md`](cost-estimate.md).
5. [ ] Shahil: name the deploy authority principal, distinct from owner if possible.
6. [ ] Claude (CL0): enable APIs, verify quotas, `terraform plan`, then apply once 1–5 are recorded.
