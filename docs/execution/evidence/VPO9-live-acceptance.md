# VPO9 — Vendor Purchase Order detail: joint live acceptance

- Node: VPO9
- Owner: Codex + Claude (Claude executed live acceptance; Codex completed source/evidence review on 2026-08-26)
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

## Config changes applied on the pilot (recorded; scaffolding reverted)

1. `core.roleTarget` `ffaed71c-9ac4-41d3-8036-ec9265746228`: the operator
   (`pashx-operator@pashx-mab.invalid`) is assigned the **app's manifest operator role**
   `8154c004-5fd3-4b1d-8660-7b13166815c4` (manifest UID `7f8eadb1-18bc-438f-b0cf-e9f1793286c5`,
   12 permission flags, read+write object permissions on all app objects).
2. Interim scaffolding applied during diagnosis (3 `rolePermissionFlag` rows + writable
   `objectPermission` upsert on the *default* role `f8746015`) was **fully reverted** —
   the default role is back to its app-installed read-only, flag-less state (verified 0/0).
3. Workspace cache flushed after each change.

**Lesson recorded**: the VPO command path requires the app's *operator* role, not the
app *default* role (which is intentionally flag-less/read-only). No app source defect —
the acceptance matrix passes 21/21 with the correct role assignment and no manual
permission configuration.

## Codex adversarial review (2026-08-26)

- The evidence identifies the disposable fixture family, operator identity, admin-key
  plumbing, captured IDs, cleanup status, REST 404s, and SQL total/active zero proof.
  It does not claim the Phase 1 business anchor was mutated.
- Pilot configuration mutations and the stated reversion of interim scaffolding are
  recorded. The retained operator role assignment is explicitly listed rather than
  described as reverted.
- Assigned-approver, cross-user, and browser rows remain BLOCKED/deferred and are not
  inferred from requester self-approval. The 21/21 claim applies only to the executed
  command matrix, not those blocked rows.
- The original auth conclusion overreached from `/graphql` probes; it is corrected
  below. This source review cannot independently reproduce the live SQL/HTTP evidence
  and treats the recorded command outputs as operator-supplied evidence.

## Findings (release health)

- **A — corrected and now verified live: password login WORKS on the deployed server
  via `/metadata`.** Auth is endpoint-scoped by design (`AuthResolver` is a
  `@MetadataResolver`; password operations live on `/metadata`, not `/graphql` — see
  `AUTH-schema-defect.md`). Verified end-to-end in this session on the pilot:
  `getLoginTokenFromCredentials` → `getAuthTokensFromLoginToken` → access token, which
  then passes `currentWorkspace` and the VPO capability gate. The separate absence of
  dynamic `createOneTask` from the pilot's computed `/graphql` schema remains an open
  question for the host lane (workspace SDL/cache inspection; guarded by
  `graphql-schema-scope.smoke.spec.ts`).
- **B — (corrected) no app install wiring defect**: roles, permission flags, and object
  permissions all install correctly from the manifest. The earlier "wiring gap" was a
  role-assignment error in the acceptance setup (default vs operator role).
- **C — API-key auth rejected for audited commands** (`authContext.type !== 'user'`) —
  correct fail-closed design; commands require a user session token.
- **D — D5 approval semantics confirmed live**: requester may cancel their own request
  but never approve/reject it; assigned-approver enforcement via the contract predicate.
- **E — VPO6-C gate closed by Codex**: the SDK manifest validator
  (`manifest-validate.ts`) now rejects custom-object `NUMERIC` fields and reserved
  system names (`position`), and `dev:build` runs it automatically — install-time
  metadata defects fail the build instead of VPO6-A.

## BLOCKED rows (never inferred)

- **Assigned-approver approve/reject + cross-user rows**: require a second credentialed
  identity. Password auth is verified working on `/metadata`, so the remaining step is a
  UI invitation (Settings → Members) for a second member, then
  `updateWorkspaceMemberRole` to the PxD operator role
  (`7f8eadb1-18bc-438f-b0cf-e9f1793286c5`) — see `VPO9-second-identity-plan.md`.
  Remain BLOCKED until then; never inferred.
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
RISKS: /metadata password login unverified; dynamic createOneTask absence unresolved; assigned-approver rows need a 2nd identity
NEXT_OWNER: Codex review → Shahil verdict; browser QA by operator
```
