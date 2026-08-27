# IDR-0002: How CL2 reaches Cloud SQL without making it public

**Status:** Proposed — blocks CL2 execution
**Date:** 2026-08-07
**Deciders:** Shahil. Claude Code records; Codex is informed (affects CX2's environment too).
**Scope:** Infrastructure and test execution. No production source changes.

## Context

Two acceptance criteria that were each correct in isolation collide in practice.

**CL0 requires** — *"Database is not publicly exposed and only HTTPS is public."* Enforced, and
verified: `settings.ipConfiguration.ipv4Enabled = false`, a single `PRIVATE` address `10.30.0.3`,
no authorized networks, plus an explicit firewall deny on 5432/6379 from `0.0.0.0/0`.

**CL2 requires** — *"tests use real Cloud SQL transactions through the actual service boundary,
not mocks."*

There is no network path from where the tests currently run to where the database lives:

| Runner | Inside the VPC? | Can reach `10.30.0.3`? |
|---|---|---|
| This workstation | no | **no** |
| Cloud Build default pool | no | **no** |
| Cloud Shell | no | **no** |
| `pashx-mab-app` VM | yes | yes |

The Cloud SQL Auth Proxy does not close this gap. With `--private-ip` it still requires the client
to have a route into the VPC; it authenticates the connection, it does not create connectivity.

This was not caught when CL2's scenarios were designed because the tests were authored before the
environment existed. It is a sequencing gap, not a defect in either acceptance criterion.

## Decision

**Run the CL2 suite from inside the VPC, tunnelled through the application VM over IAP, with a
TCP forwarder on the VM.** Do not give Cloud SQL a public IP.

```
workstation ──IAP TCP tunnel (authenticated, no public SSH)──► pashx-mab-app VM
                                                                     │
                                                     socat 127.0.0.1:5432 ──► 10.30.0.3:5432
```

The database keeps `ipv4Enabled = false` throughout. Access is authenticated by IAP and authorised
by `roles/iap.tunnelResourceAccessor`, which the operator and deployer already hold from CL0.

## Options considered

### Option A — IAP tunnel through the VM (recommended)

| Dimension | Assessment |
|---|---|
| Security property | **preserved** — no public IP, no firewall change, no authorized network |
| New infrastructure | none; uses the VM and IAP grants CL0 already created |
| Setup cost | one `socat` container on the VM, started for the run and stopped after |
| Fidelity | real Cloud SQL, real transactions, real advisory locks |
| Weakness | the forwarder is a manual step, and forgetting to stop it leaves a listener on the VM |

### Option B — Cloud Build private pool with VPC egress

Correct long-term answer for CI. Rejected for now: it is new billable infrastructure and a new
Terraform surface, for a node that needs to run once. Revisit when CL2 becomes a recurring gate
rather than a one-off.

### Option C — Run the suite on the VM directly

Rejected. The VM runs Container-Optimized OS: read-only rootfs, no package manager, no yarn. The
suite needs a full dev install (`node_modules` is ~988 MB). Getting it there means building and
pushing a second, test-only image — a large build to avoid a small tunnel.

### Option D — Temporarily enable a public IP plus an authorized network

**Rejected on principle.** It directly contradicts a CL0 acceptance criterion and an SG ready
condition ("Cloud SQL is not public"). A temporary exception taken for convenience is exactly the
kind of thing that is still in place at the ship gate, and the evidence would then be produced
against a configuration that is not the one being shipped.

## Consequences

**Easier:** CL2 can run against the real database today, with no new infrastructure and no
weakening of the security posture that CL0 spent effort establishing.

**Harder:** the run is operator-driven rather than automated. That is acceptable for a node that
executes once before a ship gate; it is not acceptable as a permanent CI story, which is why
Option B is recorded rather than discarded.

**To revisit:** if CL2 is ever wired into continuous integration, replace this with Option B.

## A second gap this surfaced

The CL2 harness originally hardcoded `SEED_APPLE_WORKSPACE_ID` as its target workspace. That
workspace only exists in a dev-seeded database; the real pilot database has whatever disposable
workspace CL3 creates. The suite could therefore never have run against real Cloud SQL as written,
independently of the connectivity problem.

Fixed: `PASHX_TEST_WORKSPACE_ID` now reads from the environment and falls back to the seed id, so
the same suite serves both a local `with-db-reset` run and a real Cloud SQL run.

## Procedure

Prerequisites: CL3 has deployed the image and installed the PashX app into the disposable
workspace, and `pashx-mab-shutdown` is paused.

**1. Start the forwarder on the VM** (foreground in its own terminal; Ctrl-C stops it):

```bash
gcloud compute ssh pashx-mab-app --zone=me-central1-a --project=pashx-mab-pilot --tunnel-through-iap --command="docker run --rm --network host alpine/socat TCP-LISTEN:5432,fork,reuseaddr TCP:10.30.0.3:5432"
```

**2. Open the IAP tunnel** (separate terminal):

```bash
gcloud compute start-iap-tunnel pashx-mab-app 5432 --local-host-port=localhost:5433 --zone=me-central1-a --project=pashx-mab-pilot
```

**3. Point the suite at the tunnel and the real workspace.** Read the password from Secret
Manager rather than pasting it — it must not enter shell history or a file:

```bash
export PG_DATABASE_URL="$(gcloud secrets versions access latest --secret=pashx-mab-pg-database-url --project=pashx-mab-pilot | sed 's|@10\.30\.0\.3:5432|@localhost:5433|')"
```

```bash
export PASHX_TEST_WORKSPACE_ID='<disposable workspace id recorded by CL3>'
```

**4. Run:**

```bash
cd packages/twenty-server && npx jest --config jest-integration.config.ts test/integration/pashx-mab
```

**5. Stop the forwarder and the tunnel.** Confirm nothing is left listening:

```bash
gcloud compute ssh pashx-mab-app --zone=me-central1-a --project=pashx-mab-pilot --tunnel-through-iap --command="docker ps --filter ancestor=alpine/socat"
```

That last command must return no rows. A forwarder left running is a standing path to the database
for anyone who can reach the VM, which is precisely the property this decision exists to protect.
