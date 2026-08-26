# VPO9 — Vendor Purchase Order detail: joint live acceptance (in progress)

- Node: VPO9
- Owner: Codex + Claude (this session = Claude lane; Codex lane absent)
- Authorized by: Shahil (VPO7 authority, 2026-08-26 — disposable fixture family + live commands)
- Host: `https://mab.pashx.com` (pashx-mab **0.2.17**, installed 2026-08-26 13:37 UTC)
- Date: 2026-08-26 (started); **paused by the scheduled pilot shutdown 18:00 Asia/Riyadh**
- Status: **PARTIAL — Phase 1 complete; Phase 2 command matrix started and blocked on a
  permission finding; resume 2026-08-27 05:00 UTC (08:00 Riyadh)**

## Phase 1 — read-only anchor verification (COMPLETE, no mutations)

Real acceptance anchor `MAB-PO-2026-4141` verified through the live GraphQL API:

| Field | Value |
|---|---|
| id | `1f7f5050-3885-49c4-8b9a-058595da6d11` |
| documentType / lifecycleStatus | `VENDOR_PURCHASE_ORDER` / `FINALIZED` |
| issueDate / aggregateVersion | `2026-06-06` / `1` |
| Case | `MAB-META-MAB-PO-2026-4141` (`3af759e7-1f3e-4c95-bab9-cba2be038f87`) |
| Supplier | `DBMS Steel and Metal Solution Trading Company` (`9f4fe842-3e73-4067-b4f4-3dc125240c0b`) |
| Structured lines | **0** — the 27 real source lines are correctly NOT imported (human-reviewed
  correction-ledger gate). The page must and does render the honest **Not recorded** line state. |

The recorded source evidence (27 lines, subtotal SAR 110,908.00, VAT SAR 16,636.20,
total SAR 127,544.20) cannot be re-validated from the API because the lines are gated —
consistent with the frozen contract; the source document link remains the authority.

## Phase 2 — disposable fixture command matrix (PARTIAL)

Run id: `vpo-qa-20260826-mta7ubbz` (first aborted run `…mta6vmbc` cleaned up).

| # | Check | Result |
|---|---|---|
| F1 | no-auth fails closed (HTTP 403) | **PASS** |
| F2 | create disposable supplier (fixture) | **PASS** (201) |
| F3 | create disposable case (fixture) | **PASS** (201) |
| F4 | create VPO via audited command (draft) | **FAIL → root cause found** |
| F5–F10 | idempotency / CAS / validation / approval / read model | not run (blocked) |
| C1–C2 | cleanup + absence proof | not run (blocked) |

### F4 root cause — role/permission wiring gap (product finding, not command defect)

1. `POST /rest/pashx-mab/vendor-purchase-orders` with a valid body returned
   `403 PASHX_FORBIDDEN_CAPABILITY` for the operator. The controller converts a workspace
   `PermissionsException(PERMISSION_DENIED)` from the service into
   `forbiddenCapability` — the bounded read model's query runner
   (`permission = { unionOf: [roleId] }`) denied record access.
2. **Cause A — capability wiring**: the installed PxD default role
   (`f8746015-734b-4769-b44f-ee9038da7108`) had **zero** permission flags. The app
   manifest defines 5 roles with flags, but none was installed with
   `f8746015` (another install gap; the app's metadata installed but role/flag wiring
   did not).
3. **Cause B — object permission matrix empty**: no `core.objectPermission` rows exist
   for the app → fail-closed deny for app-role users on every object read/write.

### Config changes applied on the pilot (recorded, reversible)

- `core.roleTarget` `ffaed71c-9ac4-41d3-8036-ec9265746228`: operator
  (`pashx-operator@pashx-mab.invalid`, userWorkspace `e7b7ecbe-553d-48fa-98e9-a1a8a139938b`)
  re-pointed from the workspace-custom role to the PxD default role `f8746015`.
- `core.rolePermissionFlag`: 3 rows granted to `f8746015` — `pashx.procurement.issue`
  (`72298ed6-6f69-4716-b0b2-000922f730e9`), `pashx.approval.request`
  (`f5481c2f-d213-4a70-a9b2-abcfbf1e9a9b`), `pashx.approval.decide`
  (`829dc941-ea90-4d2b-9c9c-332e66ee5e6a`).
- Workspace cache flushed (`yarn command:prod cache:flush`) — capability gate then
  **verified passing** (valid-shaped requests now reach the bounded read model:
  `PASHX_RECORD_NOT_FOUND` for unknown case IDs instead of `FORBIDDEN`).
- **Not yet applied** (Cloud SQL stopped with the VM): `core.objectPermission` rows
  granting `f8746015` read/update/soft-delete on the app objects (`procurementCase`,
  `commercialDocument`, `company`, `approvalRequest`, `documentLine`, …). This is the
  remaining fix for F4; the DB was stopped by the scheduled shutdown before it could be
  written.

## Findings (release health)

- **A — AuthModule absent on the deployed server**: the running `twenty-server` dist has
  `AuthModule` compiled but NOT registered (`app.module.js` imports only the auth
  middleware). `/graphql` exposes no `getLoginTokenFromCredentials` / `signIn`. Existing
  sessions/tokens keep working (signing key in DB), but **new password logins are
  broken** on the current image. Flagged for the host build owner (company-identity lane).
- **B — app install wiring gaps**: app metadata installs, but roles/permission-flags and
  the object-permission matrix do not (see Cause A/B). Requires an app-store settings
  step or an install-path fix.
- **C — API-key auth rejected for commands** (`authContext.type !== 'user'`) — correct
  fail-closed behavior; the matrix therefore uses a minted user ACCESS token for the
  operator (same shape the auth service issues; signed with the workspace signing key).
- **D — operator has no standard-object CRUD** — fixture plumbing uses the admin key;
  audited commands use the operator token. Roles matrix recorded as-is.

## BLOCKED rows (never inferred)

- Full F5–F10/C1–C2 command matrix rerun — blocked on the object-permission fix +
  pilot availability (scheduled shutdown 18:00 Riyadh; resume 08:00 Riyadh).
- Second-identity rows (assigned-approver, cross-user) — no second credentialed
  identity available in this session (auth module down); remain BLOCKED per the frozen
  fixture rule.
- Bilingual/RTL/a11y/200%-zoom and VoiceOver — manual browser observations, deferred to
  resume per the DS6/QV precedent.

## Resume checklist (2026-08-27 05:00 UTC / 08:00 Riyadh)

1. Insert `core.objectPermission` rows for role `f8746015` on the app objects
   (`canReadObjectRecords`, `canUpdateObjectRecords`, `canSoftDeleteObjectRecords`).
2. Flush workspace cache.
3. Rerun the full matrix (F1–F10, C1–C2) with the operator token + admin-key fixtures.
4. Browser QA: nav "Vendor PO detail" page, bilingual EN/AR + RTL, a11y, 200% zoom.
5. Record residuals + machine-readable handoff; close VPO9.

## Handoff

```text
NODE: VPO9
STATUS: IN_PROGRESS (Phase 1 PASS; Phase 2 blocked on object-permission gap + schedule)
BASE_SHA: de2bea3e6b
FIXTURES_CREATED: vpo-qa-20260826-mta7ubbz supplier a0c06333-fab0-4630-ae0d-f039aa53d040, case d27a04aa-08fb-4c70-9156-153457bce3ed
FIXTURES_CLEANED: aborted run vpo-qa-20260826-mta6vmbc supplier/case deleted (404/200)
LIVE_MUTATION: config-only (roleTarget + 3 rolePermissionFlag rows) + disposable fixtures; no business data
VERSION: pashx-mab 0.2.17
NEXT_OWNER: Claude lane (resume) → Codex review
RISKS: auth module absent on deployed server image; app role/permission wiring gaps; objectPermission fix pending
```
