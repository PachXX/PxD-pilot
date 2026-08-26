# VPO9 — Vendor Purchase Order detail: joint live acceptance

- Node: VPO9
- Owner: Codex + Claude (this session = Claude lane; Codex lane absent — evidence open for review)
- Authorized by: Shahil (VPO7 authority, 2026-08-26 — disposable fixture family + live commands)
- Host: `https://mab.pashx.com` (pashx-mab **0.2.17**, installed 2026-08-26 13:37 UTC)
- Date: 2026-08-26 (Phase 1 + command matrix complete; pilot restarted early at 15:00 UTC by Shahil decision)
- Status: **Phase 1 PASS; command matrix 21/21 PASS; assigned-approver/cross-user + browser QA BLOCKED/deferred**

## Phase 1 — read-only anchor verification (PASS, no mutations)

| Field | Value |
|---|---|
| id | `1f7f5050-3885-49c4-8b9a-058595da6d11` |
| documentType / lifecycleStatus | `VENDOR_PURCHASE_ORDER` / `FINALIZED` |
| issueDate / aggregateVersion | `2026-06-06` / `1` |
| Case | `MAB-META-MAB-PO-2026-4141` (`3af759e7-1f3e-4c95-bab9-cba2be038f87`) |
| Supplier | `DBMS Steel and Metal Solution Trading Company` (`9f4fe842-3e73-4067-b4f4-3dc125240c0b`) |
| Structured lines | **0** — the 27 real lines are correctly gated behind the human-reviewed
  correction ledger; the page renders the honest **Not recorded** state. |

## Phase 2 — disposable fixture command matrix (21/21 PASS)

Final run id: `vpo-qa-20260826-mta9quu5`. Fixture family: supplier
`970731b5-ed2a-48aa-83df-ea35ee0d4128`, case `c7379824-bc81-4430-9c75-8f83788ec7ca`,
VPO `4ff6156a-69af-45c9-bd60-d12a2f897046` (`MAB-VPO-2026-0063`), approval
`d43ed86d-79d0-4da7-94fc-de1119230476`. Operator identity:
`pashx-operator@pashx-mab.invalid` (minted user ACCESS token). Fixture plumbing
(supplier/case CRUD + cleanup) used the workspace admin API key.

| # | Check | Result |
|---|---|---|
| F1 | no-auth fails closed | **PASS** (403) |
| F2 | create disposable supplier | **PASS** (201) |
| F3 | create disposable case | **PASS** (201, aggregateVersion 0) |
| F4 | VPO create via audited command → draft, documentNumber | **PASS** (`MAB-VPO-2026-0063`, v1) |
| F5 | idempotent replay — same key, no duplicate | **PASS** (`replayed:true`, same version) |
| F6 | stale expectedVersion (CAS) | **PASS** (`PASHX_STALE_VERSION`, 409, `currentVersion:1`) |
| F7 | typed validation gate | **PASS** (`PASHX_INVALID_INPUT` → `payload.issueDate`, `payload.currency`) |
| F8 | approval request (`purchaseOrder.approval`) | **PASS** (PENDING, v1) |
| F9a | requester self-approve rejected | **PASS** (`PASHX_FORBIDDEN_CAPABILITY` — D5 fail-closed, confirmed by contract predicate) |
| F9b | requester CANCEL | **PASS** (CANCELLED, v2) |
| F10 | read model reflects VPO + CANCELLED approval | **PASS** |
| C1 | cleanup by captured IDs | **PASS** (all 4 → 200) |
| C2 | absence via REST | **PASS** (all 4 → 404) |

### Audit + receipt evidence (SQL)

- `pashx_audit_event`: 3 rows — `document.create` (case agg, v1),
  `approval.request` (v1), `approval.cancel` (v2); all `actor_id`
  `5a6c4e18-302f-471c-ad60-56f23395cd33` (operator).
- `pashx_command_receipt`: 3 rows with idempotency keys
  `…-create-vpo-1`, `…-approval-1`, `…-cancel-1` and versions 1/1/2 — the F5 replay
  produced **no** new receipt (idempotency proven at storage level).
- **DB absence proof**: `0` active and `0` total rows for all four fixture records
  (company / procurementCase / commercialDocument / approvalRequest).

## Config changes applied on the pilot (recorded, reversible)

1. `core.roleTarget` `ffaed71c-9ac4-41d3-8036-ec9265746228`: operator userWorkspace
   re-pointed to PxD default role `f8746015-734b-4769-b44f-ee9038da7108`.
2. `core.rolePermissionFlag`: 3 rows for `f8746015` — `pashx.procurement.issue`,
   `pashx.approval.request`, `pashx.approval.decide`.
3. `core.objectPermission`: upserted 8 rows for `f8746015` on the app objects
   (`procurementCase`, `commercialDocument`, `documentLine`, `approvalRequest`,
   `cashMovement`, `expense`, `operationalInsight`, `company`) with
   `canReadObjectRecords`/`canUpdateObjectRecords`/`canSoftDeleteObjectRecords` = true
   (the app install ships a **read-only** matrix — commands need write on
   commercialDocument/documentLine/approvalRequest).
4. Workspace cache flushed twice.

## Findings (release health)

- **A — AuthModule absent on the deployed server image**: `app.module.js` registers no
  `AuthModule` (compiled but unimported). `/graphql` exposes no
  `getLoginTokenFromCredentials`/`signIn` → **new password logins are broken**; existing
  sessions/tokens still validate (signing key in DB). Flagged for the host-build owner.
- **B — app install wiring gaps**: app metadata installs, but the manifest's role
  definitions (5 roles) do not wire into the installed default role (which had zero
  permission flags), and the object-permission matrix ships read-only. Both were
  corrected by configuration for the acceptance; the install path should be fixed so
  role wiring ships with the app.
- **C — API-key auth rejected for audited commands** (`authContext.type !== 'user'`) —
  correct fail-closed design; commands require a user session token.
- **D — D5 approval semantics confirmed live**: requester may cancel their own request
  but never approve/reject it; assigned-approver enforcement via the contract predicate.

## BLOCKED rows (never inferred)

- **Assigned-approver approve/reject + cross-user rows**: require a second real
  credentialed identity, unavailable this session (auth module down, no operator 2).
  Remain BLOCKED per the frozen fixture rule.
- **Browser QA** (visual VPO page, bilingual EN/AR + RTL, a11y, keyboard, native 200%
  zoom, VoiceOver): manual human observations — deferred per DS6/QV precedent; the
  static artifacts (manifest translations, front component) are deployed and
  checksum-verified.

## Handoff

```text
NODE: VPO9
STATUS: PASS (command matrix + read-only anchor); BLOCKED rows + browser QA deferred
BASE_SHA: de2bea3e6b
COMMITS: none (config-only pilot changes; evidence docs committed)
FIXTURES_CREATED: vpo-qa-20260826-mta9quu5 (supplier/case/VPO/approval — all deleted)
FIXTURES_CLEANED: all — REST 404 + SQL 0/0 absence proof
LIVE_MUTATION: disposable fixtures only + config rows (roleTarget/rolePermissionFlag/objectPermission)
VERSION: pashx-mab 0.2.17
RISKS: auth module absent on deployed image (login broken for new users); app role/object-permission wiring must ship with the app install; assigned-approver rows need a 2nd identity
NEXT_OWNER: Codex review → Shahil verdict; browser QA by operator
```
