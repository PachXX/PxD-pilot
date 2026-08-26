# VPO9 — second-identity approval plan

- Execute only after password auth is verified on its supported `/metadata`
  endpoint; no `/graphql` auth exposure is required.
- Requires an authorized pilot operator. This document does not authorize live
  access, user creation, role changes, or fixture mutation.
- Use a new `vpo-qa-<timestamp>` fixture family and capture every created ID.

## 1. Create and authenticate identity 2

Use the normal invitation flow in Settings → Members so the workspace creates a
credentialed `user`, `userWorkspace`, and workspace-member record. Do not insert
identity rows with SQL. Accept the invite and set a unique password, then obtain
a login token:

```http
POST /metadata
Content-Type: application/json

{"query":"mutation Login($email:String!,$password:String!,$origin:String!){getLoginTokenFromCredentials(email:$email,password:$password,origin:$origin){loginToken{token expiresAt}}}","variables":{"email":"pashx-approver-<run>@pashx-mab.invalid","password":"<operator supplied>","origin":"https://mab.pashx.com"}}
```

Exchange the returned login token on `/metadata` with
`getAuthTokensFromLoginToken(loginToken:$loginToken,origin:$origin)` and retain
`tokens.accessOrWorkspaceAgnosticToken.token` as `TOKEN_B`.
Introspect `currentWorkspaceMember { id userEmail }` with `TOKEN_B`; capture its
record id as `ACTOR_B`. Repeat with operator 1 as `TOKEN_A`/`ACTOR_A`. Expected:
the emails and IDs differ and both tokens are user tokens, never API keys.

## 2. Assign the PxD operator role

As a workspace administrator, resolve the installed PxD operator role through
`getRoles { id universalIdentifier label }`, then call the exact supported
metadata mutation:

```http
POST /metadata
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{"query":"mutation Assign($member:UUID!,$role:UUID!){updateWorkspaceMemberRole(workspaceMemberId:$member,roleId:$role){id userWorkspaceId roles{id universalIdentifier label}}}","variables":{"member":"<ACTOR_B>","role":"<INSTALLED_OPERATOR_ROLE_ID>"}}
```

Select the role whose manifest universal identifier is
`7f8eadb1-18bc-438f-b0cf-e9f1793286c5`. Verify through `/metadata` that the
member's role target resolves to that role and that it includes
`pashx.approval.decide`. Do not edit `core.roleTarget` or permission tables with
SQL; the UI/metadata mutation is the supported call and produces the same role
assignment used by VPO9. Record the returned role-target ID and restore/remove
the assignment during cleanup if the identity is removed.

## 3. Assigned-approver matrix

Create a disposable supplier, case, and VPO using the already accepted VPO9
fixture commands. Request approval as A:

```http
POST /rest/pashx-mab/approval-requests
Authorization: Bearer <TOKEN_A>
Content-Type: application/json

{"contractVersion":1,"approvalRequestRecordId":"<UUID>","idempotencyKey":"<run>-assigned-approve","name":"<run> assigned approval","requestedActionCode":"purchaseOrder.approval","payloadDigest":"<SHA-256>","sourceRecordIds":["<VPO_ID>"],"approverRecordId":"<ACTOR_B>"}
```

Then decide as B:

```http
POST /rest/pashx-mab/approval-requests/<APPROVAL_ID>/decisions
Authorization: Bearer <TOKEN_B>
Content-Type: application/json

{"contractVersion":1,"idempotencyKey":"<run>-approve","expectedStatus":"PENDING","decision":"APPROVE","decisionNote":"VPO9 assigned approver acceptance"}
```

Expected: HTTP 200, `status: "APPROVED"`, non-null `decidedAt`. Repeat on a new
approval record with `decision: "REJECT"`; expect HTTP 200,
`status: "REJECTED"`, non-null `decidedAt`.

## 4. Cross-user fail-closed rows

For separate PENDING approvals (never reuse a terminal record), assert:

- A approving or rejecting A's own request → 403
  `PASHX_FORBIDDEN_CAPABILITY`.
- An assigned approval for B decided by a credentialed identity C, if available
  and role-authorized → 403 `PASHX_FORBIDDEN_CAPABILITY`.
- B cancelling A's request → 403 `PASHX_FORBIDDEN_CAPABILITY`.
- A cancelling A's request → 200 `CANCELLED`.
- Stale `expectedStatus` or a second decision against a terminal record fails
  and does not create a new audit transition.

These expectations follow
`isPurchaseOrderApprovalDecisionAuthorized`: only the requester may `CANCEL`;
the requester may never `APPROVE`/`REJECT`; when `approverRecordId` is set, only
that other actor may approve or reject. None of these rows may be inferred from
the requester self-approval result.

## 5. Evidence and cleanup

Capture status/body, actor ID, request ID, idempotency key, audit event, and
command receipt for every row. Delete only captured disposable approval, VPO,
case, and supplier IDs; prove REST 404 and SQL active/total zero. Remove identity
2 (or document an explicit owner decision to retain it), prove its temporary
role assignment is gone, and record all configuration changes and reversions in
the VPO9 evidence.
