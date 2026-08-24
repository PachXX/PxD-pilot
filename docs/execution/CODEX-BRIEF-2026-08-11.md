# Codex brief — CX3 and CX4, ready now

- From: Claude Code (cloud architecture owner)
- Date: 2026-08-11
- Demo: **2026-08-19 — 8 days**
- Self-contained: everything needed to start is in this file. Cross-references are for depth only.

---

## Read this first: what NOT to do

**Two nodes are open for you and both are ready now.** You are no longer blocked behind CX2.

**The 2026-08-07 handoff in the shared context tells you to apply a four-point Dockerfile patch.
That instruction is VOID.** It is already applied, and it was five points, not four. Re-applying it
duplicates work and will conflict.

More generally: **items marked `ADOPT` below are already implemented and working in the live
environment.** Claude Code made those changes in Codex-owned files with Shahil's explicit
per-change approval, because each one blocked the deploy. Your job on those is to **review, then
accept or reject with evidence** — not to rebuild them. Items marked `BUILD` are not started.

Do not modify Claude-owned infrastructure: `infra/pashx-mab-gcp/**`, `deploy/pashx-mab/**`,
`docs/operations/pashx-mab-gcp/**`.

---

## Context: what the cloud environment actually is now

Live: project `pashx-mab-pilot`, region `me-central1`, `https://34-18-165-1.nip.io`, Cloud SQL
private-IP-only, VM on Container-Optimized OS running the stack under docker compose.

Verified working (measured, not assumed):

- `/healthz` returns `HTTP 200 {"status":"ok"}` over public HTTPS with a valid Let's Encrypt cert
- Cloud SQL connected; `core` schema initialised with 71 tables
- Workspace `160a3718-ce23-4150-9142-4e7ddd8b8850` — **ACTIVE**
- PashX app **installed**: `058263f0-1cc0-42e7-94a1-b4beb688e771` @ `0.1.2`, objects
  `commercialDocument`, `documentLine`, `expense`, `procurementCase`; 20 fields on
  `commercialDocument`
- The vendor-PO command reaches Postgres and the `procurementIssue` capability check passes

**Not yet verified:** the write path has never completed end to end. No `commercialDocument` row
exists. Claude Code is finishing that now — it is not your task.

Getting here took **nine image builds**: six pre-existing defects and three Claude mistakes. The
defects are why CX3 and CX4 exist.

---

# Node CX3 — adopt the six boundary crossings

State: **ready**. Depends on nothing. Estimated small — this is review, not implementation.

## CX3-1 — ADOPT — `packages/twenty-docker/twenty/Dockerfile`

Five edits wire `pashx-mab-contract` into the server workspace path:

1. `server-deps`: `COPY ./packages/pashx-mab-contract/package.json /app/packages/pashx-mab-contract/`
2. `server-deps`: added `pashx-mab-contract` to the `yarn workspaces focus` list
3. `twenty-server-build`: `COPY ./packages/pashx-mab-contract /app/packages/pashx-mab-contract`
   (source, because nx `dependsOn: ["^build"]` builds it)
4. the `--production` focus list: added `pashx-mab-contract`
5. runtime stage: copy `package.json` and `dist` for the contract

Also in `deploy/pashx-mab/cloudbuild.yaml` (Claude-owned, listed for your awareness only):
`--target=twenty` is now **mandatory**. Without it Docker defaults to the last stage in the
Dockerfile, `twenty-app-dev` — the all-in-one development image with a bundled Postgres, port 2020,
`NODE_ENV=development` and a hardcoded `APP_SECRET`. That shipped to the pilot once and produced
three unrelated-looking failures. If you ever restructure the Dockerfile, **do not make
`twenty-app-dev` the last stage**, or add an explicit final target.

## CX3-2 — ADOPT — `packages/pashx-mab-contract/package.json`

```json
"exports": { ".": { "types": "...", "import": "./dist/index.js", "require": "./dist/index.js" } }
```

The package is ESM-only (`"type": "module"`) and `twenty-server` compiles to **CJS**. Once `exports`
exists, `main` is ignored, so `require('pashx-mab-contract')` resolved no condition and threw
`ERR_PACKAGE_PATH_NOT_EXPORTED`. Safe because the package has no top-level await and Node 24
supports `require()` of ESM.

**Trap worth knowing:** `require()` by *directory path* succeeds and hides this entirely. Only the
bare specifier reproduces it. If you prefer a real CJS build instead, that is a legitimate
alternative — say so and own the change.

## CX3-3 — ADOPT — `packages/twenty-server/src/modules/pashx-mab/pashx-mab.module.ts`

Added **both** `TokenModule` and `WorkspaceCacheStorageModule` to `imports`.

`PashxVendorPurchaseOrderController` is decorated `@UseGuards(JwtAuthGuard, ...)`, and a guard's
dependencies resolve from the module declaring the **controller** — not from where the guard class
lives. `JwtAuthGuard` injects `AccessTokenService` (TokenModule) and `WorkspaceCacheStorageService`
(WorkspaceCacheStorageModule). Missing either one prevents the **entire server** from booting.

Two things that cost real time here, worth internalising:

- Nest reports only the **first** unresolved argument, so fixing one surfaces the next on the
  following boot. Cost one full deploy cycle.
- `WorkspaceCacheStorageModule` ≠ `WorkspaceCacheModule`. The latter was already imported and
  exports only `WorkspaceCacheService`.

`webhook.module.ts` imports exactly this pair for the same guard — that is the reference pattern.

## CX3-4 — ADOPT, and this one is a judgement call: please confirm or reject

Files: `packages/twenty-apps/pashx-mab/src/objects/commercial-document.object.ts`,
new `packages/twenty-server/src/modules/pashx-mab/utils/pashx-manifest-value.util.ts`,
and `…/services/pashx-vendor-purchase-order-persistence.service.ts`.

Twenty's metadata validator rejected three field definitions:

```
INVALID_FIELD_INPUT: Value must be in UPPER_CASE and follow snake_case  "vendorPurchaseOrder"
INVALID_FIELD_INPUT: Value must be in UPPER_CASE and follow snake_case  "draft"
INVALID_FIELD_INPUT: This name is reserved                              "currency"
```

Those are **the contract's canonical values** — declared in `pashx-mab-contract/src/domain.ts` and
used as literal types in `commands.ts`. So this was a design decision, not a typo fix. Shahil chose:
**map at the manifest boundary, leave the contract vocabulary untouched.**

- Manifest now uses `VENDOR_PURCHASE_ORDER`, `DRAFT`, and field name `currencyCode`
- The contract still uses `vendorPurchaseOrder`, `draft`, `currency`
- `pashx-manifest-value.util.ts` translates on write, with exhaustive
  `Record<ContractType, string>` maps so a **new contract value breaks the build** rather than
  silently producing an option value the column rejects

**The mapping could not be manifest-only.** `persistWorkspaceRecords` writes contract values
straight into those columns, so a manifest-only change would have installed cleanly and then failed
every INSERT.

**Known limitation, your call:** there is **no reverse mapping**, because nothing currently reads
those columns back into contract space. The day a read path is added, that assumption breaks. If you
want the inverse maps added defensively now, that is reasonable — you own the call.

## CX3-5 — ADOPT — actor fields in the persistence service

`createdBy` and `updatedBy` ACTOR composites are now set on insert, from
`getWorkspaceAuthContext()` (the same request-scoped accessor the controller uses), with
`source: FieldActorSource.API` — API rather than MANUAL because the command arrives through the REST
endpoint, not a UI edit.

Required because both `createdByName` and `updatedByName` are **NOT NULL with no database default**,
and the raw `repositories.commercialDocument.insert(...)` bypasses the pipeline that normally fills
them. Postgres reported only `createdByName`; `updatedByName` was found by listing NOT NULL columns
without defaults rather than waiting for the next failure.

The `procurementCase` UPDATE needs no equivalent — an UPDATE does not re-validate NOT NULL on
untouched columns.

## CX3-6 — ADOPT — the `isNonEmptyString` import

```ts
import { isNonEmptyString } from '@sniptt/guards';   // correct in twenty-server
```

An earlier revision imported it from `twenty-shared/utils`, **which does not export it**. The module
resolves, the binding is `undefined`, and `.filter(undefined)` throws
`TypeError: undefined is not a function`. Verified against built artifacts:

| Source | `typeof isNonEmptyString` |
|---|---|
| `@sniptt/guards` | `function` |
| `twenty-shared/dist/utils.cjs` | `undefined` |

Nothing caught it at build time — see CX4-a.

## CX3 acceptance

For each of the six: **accepted**, **rejected with evidence**, or **replaced with a better
implementation**. Record the disposition in `docs/execution/evidence/CX3-adoption.md` and append a
handoff to the shared context. Do not silently rewrite without recording why.

---

# Node CX4 — restore the type gate and error diagnosability

State: **ready**. Depends on nothing. **This is the highest-leverage node in the graph.**

## CX4-a — There is no type gate anywhere. Fix this first.

`packages/twenty-server/nest-cli.json`:

```json
"compilerOptions": { "builder": "swc", "typeCheck": false }
```

`nest build` transpiles without checking types. And `npx nx typecheck twenty-server` fails in its
prerequisites (`twenty-ui:build`, `twenty-emails:build` — `npx vite build` exits non-zero), while a
bare `npx tsc -p tsconfig.json` cannot resolve `@nestjs/common` at all because the local install is
incomplete.

**Consequence:** a wrong named import compiles, pushes green, and fails only at runtime. Four of the
findings above — CX3-2, CX3-3, CX3-4, CX3-6 — were type errors that **nothing checked**. Each cost
roughly twenty minutes of build-and-deploy to discover.

Asked: make `tsc --noEmit` pass for `twenty-server` and run it in CI. Either fix the broken
`nx typecheck` prerequisite chain or add a standalone typecheck job. If `typeCheck: true` on swc is
too slow for local dev, CI alone is acceptable.

Until this lands, the working rule for both agents is: **verify value imports against the built
artifact, not the source barrel** —
`node -e "console.log(typeof require('<pkg>').<name>)"`.

## CX4-b — Unexpected errors are undiagnosable

`packages/twenty-server/src/modules/pashx-mab/controllers/pashx-vendor-purchase-order.controller.ts`
logs only:

```
PashX Vendor PO command failed; correlationId=…; errorType=TypeError
```

No message, no stack. Sanitising the **payload** is correct and should stay. Sanitising away the
**diagnosis** meant two deploy cycles were spent guessing at a one-line import bug that a logged
stack would have identified in one log read.

Asked: for unexpected errors (not `PashxMabException`), log `error.message` and `error.stack`.
Keep `PashxMabException` output byte-identical — its shape is part of the contract.

## CX4-c — A boot smoke test

No test in the suite starts the Nest application, so the first execution of any wiring change is in
production. A test that boots the app against a throwaway database would have caught CX3-2, CX3-3,
CX3-4, CX3-6 and the wrong-image-target defect **in one pass**.

The pilot has a disposable database for exactly this: `twenty_test` on the Cloud SQL instance
(Cloud SQL is private-IP-only — reaching it from outside needs the IAP tunnel described in
`docs/operations/pashx-mab-gcp/IDR-0002-cl2-cloud-sql-test-connectivity.md`). A local Postgres is
equally fine for this test and simpler.

## CX4-d — Upstream robustness, lower priority. Cut this first if time runs short.

**`packages/twenty-docker/twenty/entrypoint.sh`** gates `database:init:prod` on the `core`
**schema** existing, not on its **tables**:

```sh
has_schema=$(psql -tAc "SELECT EXISTS (... schema_name = 'core')" ${PG_DATABASE_URL})
if [ "$has_schema" = "f" ]; then yarn database:init:prod; fi
```

One interrupted first boot created an empty `core` schema, and every boot after that skipped
initialisation **permanently** while `upgrade` ran against zero tables and `/healthz` still returned
200. Claude ran `database:init:prod` by hand to unblock. Suggested: test for a known table such as
`core.workspace`.

**`twenty-sdk` publish flow:** `app:publish --private` records `latestAvailableVersion` **before**
storing the tarball. An interrupted publish leaves a registration that can neither install
(`sourceType=tarball but no tarball file`) nor be re-published (`version must be higher than the
currently deployed version`). Worked around by bumping the app version — it is now `0.1.2`. The
`Upload failed` message is also misleading: the upload had succeeded.

## CX4 acceptance

`tsc --noEmit` green for `twenty-server` and wired into CI; the controller logs message and stack for
unexpected errors with no payload leakage; a boot smoke test exists and fails if a module's
dependencies cannot resolve. Evidence in `docs/execution/evidence/CX4-type-gate.md`.

---

## Coordination

Protocol is unchanged: re-read the graph, shared context, and artifact index before claiming; claim
one ready node; edit only owned paths; append a handoff with evidence when a node changes state.

- Graph revision and 8-day plan: `docs/execution/2026-08-11 - graph revision - parallel tracks to demo.md`
- Full findings 17–34: `docs/operations/pashx-mab-gcp/CL0-provisioning-evidence.md`
- Shared ledger: Obsidian `work/active/Pashx - MAB Agent Shared Context.md`

**Claude is doing in parallel, do not duplicate:** CL3 write-path verification, CL2's nine scenarios,
CL4 (`otel-collector` restart loop), the p95 alert drill, and the rollback/backup drills.

**If you find an infrastructure defect,** record it in the infrastructure request queue rather than
editing Claude-owned files — and vice versa. That boundary held all week; the six crossings above
were each explicitly authorised by Shahil because they blocked a deploy.

## Suggested order, given 8 days

1. **CX4-a** — the type gate. It shortens every subsequent cycle for both agents.
2. **CX3** — adopt the six, so ownership is unambiguous before CX2.
3. **CX4-b** — logging. Cheap, and it pays for itself the first time CX2 hits an unexpected error.
4. **CX4-c** — boot smoke test.
5. **CX4-d** — only if time remains.
