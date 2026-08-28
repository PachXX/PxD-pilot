# OC7 operator live-UI acceptance — OC6-B slice

- Date: 2026-08-29
- Live host: `https://mab.pashx.com`
- Application: `pashx-mab` `0.2.18`
- Identity: dedicated `PashX Operator` user on the `PashX MAB Operator` role
- Decision: **operator UI slice pass; full OC7 remains open**

## Scope

This run verifies the authenticated operator-facing Command Centre after OC6-B shipped. It is
read-only: no approval, email, financial, compliance, OCR, or pilot-record mutation was performed.
It does not accept the still-gated OCR/model-behaviour work, cross-user approval enforcement,
physical VoiceOver speech, or exact native browser zoom.

## Live auth repair

The first operator login reached the workspace, but Core API reads failed with
`INVALID_AUTH_CONTEXT`. The failure was not in the Command Centre loader:

1. `/metadata` resolved the authenticated user, workspace member, `PashX MAB Operator` role, and
   all seven expected PxD capability flags.
2. The same fresh access token failed a one-record `/graphql` procurement-case query with
   `Invalid auth context`.
3. The authoritative `core.roleTarget` relation existed, but it had been restored directly in SQL,
   bypassing Twenty's role-target service and therefore its user-to-role cache invalidation.
4. Only the two derived Redis entries for
   `metadata:permissions:user-workspace-role-map:160a3718-ce23-4150-9142-4e7ddd8b8850`
   (`data` and `hash`) were deleted. Twenty recomputed them from Cloud SQL on the next request.
5. A fresh operator token then read a real procurement case successfully. The browser reload
   rendered the complete Command Centre.

No application source, pilot business record, infrastructure resource, or credential was changed.
The two removed cache entries were derived and automatically rebuilt.

## Live matrix

| Check | Evidence | Result |
|---|---|---|
| Authenticated role | `/metadata` returned the operator member with `PashX MAB Operator` and the seven expected PxD flags; `/graphql` returned a real procurement case after cache recomputation. | pass |
| English Command Centre | Heading, four-signal summary, five deterministic blocked-data rows, evidence panel, synchronized-email panel, and capability status rendered. | pass |
| Arabic / RTL content | Language switch translated the page heading, signal descriptions, table headings, evidence links, email labels, dates/numerals, and OCR state. | pass for translated/RTL component state |
| Refresh | The observed timestamp advanced from 00:54 to 00:56 while the truthful five-record count remained stable. | pass |
| Evidence traceability | `Open evidence record` opened native procurement case `47e1d3ee-9d71-4a59-8919-d7addb116d8e` with its stored stage and audit timeline. | pass |
| Email candidate presentation | Ten operator-visible candidates rendered, all `Pending review`, with proposed task, sender, received time, status, and native message links. The partial-read notice remained visible. | pass for this identity's allowed view |
| Email privacy boundary | No message-body prose appeared in the Command Centre. The opened native message record exposed its body field only as `FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED`. No create/send/delete control was present. | pass |
| OCR fail-closed state | `Document OCR` remained `Unavailable` with the frozen OC5-OCR provider-gate explanation. | pass |
| Runtime health | External `/healthz` returned 200. Server logs after the repair contained zero `Invalid auth context` events and zero server error lines. | pass |

## Honest residuals

- The user-session message view remains viewer-scoped. This operator sees ten candidates, while the
  workspace-key read model previously proved 129. OC5 is not operationally complete until the
  mailbox visibility/role split recorded in `OC5-live-verification.md` is resolved by Shahil.
- Exact native 200% browser zoom and physical Tab/VoiceOver speech still require a human at the
  Mac. Earlier half-width reflow, semantic-order, and 44px-target evidence remains valid but is not
  relabelled as native zoom or spoken-output evidence.
- OC7's agent/model fixed-fixture evaluation, prompt-injection refusal, bilingual agent behaviour,
  outage handling, `REJECT`, and assigned-approver/cross-user enforcement remain open. OCR remains
  disabled until OC5-OCR-B2-D accepts a provider.

## Decision

The Codex-owned OC7 operator live-UI slice is accepted. OC6-B is shipped and its operator-facing
presentation is live. Full OC7 and OC6-C are not closed by this bounded run.
