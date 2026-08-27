# OC3 workspace-admin capability repair

- Date: 2026-08-22
- Scope: diagnose and repair `PASHX_FORBIDDEN_CAPABILITY` for the pilot workspace owner
- Live mutation boundary: app `0.2.8` publish/automatic install only; no role, role-target,
  permission-relation, approval, receipt, audit, or financial record was written manually

## Reproduction

Claude's live 0.2.7 request from Shahil's authenticated workspace-owner account returned HTTP 403
`PASHX_FORBIDDEN_CAPABILITY` before any approval record was created.

Read-only checks established that the app manifest was not missing the new permission bindings:

- generated 0.2.7 manifest contained `pashx.approval.request` and `pashx.approval.decide`;
- PashX MAB Admin had both; Finance had both; Operator had request only; Viewer had neither;
- the live database contained the same application-owned role-permission relations;
- Shahil's `userWorkspace` target was Twenty's standard, non-editable `Admin` role
  (`20202020-02c2-43f2-b94d-cab1f2b532eb`), not a PashX application role; and
- the pilot operator remained correctly assigned to PashX MAB Operator.

The application cannot and should not create a role-permission relation targeting Twenty's system
Admin role: ownership and editability validators intentionally reject that cross-application
mutation. Repeating the earlier manual relation workaround would recreate the install/cleanup
failure that CL-I1-R repaired.

## Root cause

`PashxCapabilityService` resolved the authenticated user's real workspace role but authorized only
explicit `rolePermissionFlag` relations. It did not honor the canonical Twenty standard Admin role,
so the workspace owner was less privileged than application roles even though Twenty treats that
role as the workspace administrator elsewhere.

## Fix

`PashxCapabilityService` now returns the resolved role ID when the role universal identifier is the
canonical `STANDARD_ROLE.admin.universalIdentifier`. All non-admin roles still require the exact
application-owned capability relation. No label comparison, email allowlist, user-specific grant,
or database mutation was added.

Regression coverage proves:

1. standard workspace Admin receives the PashX capability;
2. an application role with the exact relation still receives it; and
3. a non-admin role without the relation remains denied.

## Verification

- PashX server unit/module suite: **13/13 pass**.
- Contract suite: **15/15 pass**, 100% measured line/branch/function coverage.
- App suite: **38/38 pass**.
- `oxfmt`: clean for the two changed server files.
- Base `oxlint`: zero warnings/errors for the changed server files.
- Official `pashx-mab twenty dev:build .`: pass, 17 files, manifest version `0.2.8`.
- Full server `tsc` still reports only the recorded pre-existing missing
  `twenty-sdk/front-component-renderer/build` declaration and legacy integration-test library
  target errors; neither changed file appears in the diagnostics.
- Type-aware lint remains unavailable because the existing workspace dependency
  `@oxlint/plugins` is absent, so the local Twenty lint plugin cannot build.

## Publish and deployment state

- Published `pashx-mab` **0.2.8** to `pashx-pilot`.
- Tarball SHA-1: `9fb01bde52ec76cfcee8f1de9c9bd005736a63c0`.
- Pilot automatic install verified read-only from `core.application`: same universal identifier
  `058263f0-1cc0-42e7-94a1-b4beb688e771`, version `0.2.8`, updated
  `2026-08-22 14:45:11.258695 UTC`.
- External `/healthz`: HTTP 200 after install.
- The capability repair was deployed in host image
  `sha256:5c870c3751bf067fe3f2206a080bd58a48c00fcd29d87acb72216092c9e96546`.
  The subsequent live request exposed the separate generic repository-permission defect documented
  below.

## Live-QA handoff

After the repository-permission repair is rebuilt into a host image, Claude should obtain a fresh
user access token and run the pending OC3 matrix: workspace Admin request success, identical
replay, changed-payload idempotency conflict, approve/reject/cancel permissions,
assigned-approver enforcement, one-winner CAS, rollback/no partial write, and receipt plus
immutable audit evidence. App `0.2.8` remains installed; the immediate host rollback target is
recorded below.

## Generic object-permission repair after host deployment — 2026-08-23

Claude deployed the capability repair in host image
`sha256:5c870c3751bf067fe3f2206a080bd58a48c00fcd29d87acb72216092c9e96546`.
The next live workspace-Admin request passed the PashX capability gate but failed with HTTP 500 at
the first `approvalRepository.findOne`: Twenty's generic repository layer rejected the read because
the standard Admin role has no application-owned `approvalRequest` object-permission relation.
Nothing was written.

The command service already documented that approval transitions use an internal unscoped
repository after the controller's explicit capability check, but both `getRepository` calls omitted
the required `{ shouldBypassPermissionChecks: true }` option. The implementation therefore did not
match its security design. The repair adds that option only to the internal `approvalRequest` and
`workspaceMember` repositories used by this capability-gated transaction. It does not grant a
system role, change the manifest, bypass the controller capability check, or expose an unrestricted
repository to the client. The `workspaceMember` lookup needs the same option so an authorized
requester can validate a specifically assigned approver without depending on unrelated generic
object-read rights.

`operationalInsight` is not read or written by the OC3 command path, so it was deliberately not
included in this repair. Its UI/read-path permissions remain a separate acceptance concern rather
than justification for widening this command fix.

Verification after the repair:

- PashX server unit/module suite: **13/13 pass**;
- the command-service regression asserts both repositories are constructed with the explicit
  bypass option;
- `oxfmt`: clean for both changed files;
- base `oxlint` with nested project configuration disabled: zero warnings/errors;
- full server `tsgo` reports only the already-recorded missing SDK declaration and legacy
  integration-test library-target errors; neither changed file appears; and
- type-aware lint remains blocked by the pre-existing missing built
  `twenty-oxlint-rules/dist/oxlint-plugin.mjs`.

This is host/server source. App `0.2.8` does not need republishing. Claude must build and deploy a
new immutable host image containing this repair, verify `/healthz`, obtain a fresh user ACCESS
token, and resume the unchanged OC3 live-QA matrix. The currently healthy host digest
`sha256:5c870c3751bf067fe3f2206a080bd58a48c00fcd29d87acb72216092c9e96546` is the immediate
rollback target for this second repair.

## Live acceptance — 2026-08-23

Claude deployed the repository-permission repair in immutable host image
`sha256:a33a2ff46b2f78714f3f4c57d7058cc4a20288e33634ed380aaae5de7493452f`.
The previous healthy digest
`sha256:5c870c3751bf067fe3f2206a080bd58a48c00fcd29d87acb72216092c9e96546`
remains the rollback target. Startup completed cleanly on the first attempt, all five containers
were healthy, external `/healthz` returned HTTP 200, and app `0.2.8` remained installed.

The real authenticated REST/Cloud SQL acceptance results were:

| Property | Evidence | Result |
|---|---|---|
| Workspace Admin request | HTTP 201, `PENDING`, aggregate version 1 | pass |
| Identical request replay | `replayed: true`; exactly one approval row | pass |
| Same key with changed payload | HTTP 409 `PASHX_IDEMPOTENCY_KEY_REUSED` | pass |
| Approve | HTTP 201, `APPROVED`, aggregate version 2; identical decision replayed | pass |
| Stale compare-and-swap | HTTP 409 `PASHX_RECORD_CONFLICT`, current version 2 | pass |
| Rollback/no partial write | Unknown approval returned HTTP 404; no audit row written | pass |
| Requester cancellation | HTTP 201, `CANCELLED` | pass |
| Audit and receipts | Exactly one event and receipt per successful command; no extras from replay or failures | pass |

Two live branches remain explicitly unexercised: REJECT, which shares the APPROVE transition path,
and assigned-approver/cross-user cancellation enforcement, which requires a second real user
identity. They are deferred to the OC7 permission matrix and are not represented as live-tested.
This does not block acceptance of OC3 for the current single-user pilot.

Two clearly QA-marked disposable approval records remain in the pilot workspace: one APPROVED and
one CANCELLED. They are retained as acceptance evidence. Cleanup requires a separate explicit
decision and was not performed as part of acceptance.

**Decision: OC3 accepted for the current single-user pilot.** Next ready development node: OC4,
the read-only evidence analyst and specialist task-agent boundary. OC7 must close the two deferred
multi-user permission cases before broader operational acceptance.
