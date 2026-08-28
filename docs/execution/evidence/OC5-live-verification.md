# OC5 — live email-intake verification (app 0.2.18)

- Date: 2026-08-28
- Live execution owner: Claude lane
- Host: `https://mab.pashx.com` · app **0.2.18** · mailbox `info@mabindus.com` (IMAP, read-only)
- Source owner: Codex/DeepSeek (`load-email-intake.ts`, `email-intake.ts` classifier)
- Gate: ledger "live OC5 verification (Claude)" — **PASS**

## What was published

`codex/pashx-pilot-cx3-cx4` (OC5 classifier + loader, OC6-B Command Centre email panel) merged
into `deepseek/vpo6-p1-fix` and released as **0.2.18** (merge `8889e86e21`).

The two branches had diverged 37/34 commits, and the codex side sat at **0.2.16 — older than the
live 0.2.17** — so publishing either branch alone would have regressed the pilot. Two conflicts
resolved: `package.json` version → 0.2.18, and `workflow-pipeline.model.ts` (kept Codex's array
return, re-applied this lane's `customerId` mapping, which the merged type requires).

App typecheck clean; **180/180** app tests; contract suite 100% coverage.

### Publish note worth keeping

`twenty app:publish` defaults to the **public npm registry**. The first attempt therefore tried to
push this private app to `registry.npmjs.org` and failed on `ENEEDAUTH` — a fortunate failure.
`--private --remote pashx-pilot` is required to target the pilot.

The correct invocation then reported
`Upload failed: ... version must be higher than the currently deployed version 0.2.18`, which reads
like a failure but is a post-deploy re-check firing against the version it had *just* deployed.
`findManyApplications` confirms `PxD → 0.2.18` live. Verify before re-bumping.

## Method

The loader runs client-side, so its exact pipeline was replicated against live data: the same
GraphQL selection it issues, then the **real** `classifyEmailIntakeCandidate` from the contract
package (not a reimplementation) and the loader's own draft/type filters.

## Result — PASS

| Property | Expected (OC5 spec) | Observed live |
|---|---|---|
| Bounded read | 1–500, flag partial | 200 fetched, `hasNextPage: true` → `isPartial: true` ✓ |
| Drafts excluded | never surfaced | 200 → 199 (exactly 1 draft, matching the sync log's `1 draft`) ✓ |
| Unclassifiable dropped | only supported types surface | 71 `null`-type filtered out ✓ |
| Candidates | review-only | **129** surfaced ✓ |
| Review status | *always* `PENDING_REVIEW` | distinct set = `["PENDING_REVIEW"]` ✓ |
| Body never persisted | absent from candidate | keys are `messageId, sender, subject, proposedTaskType, sourceRecordIds, reviewStatus, receivedAt` — **no `body`** ✓ |
| No mutation | read-only | nothing created/sent/deleted/accepted ✓ |

Distribution across the four supported types:

```
PREPARE_QUOTATION       47
CAPTURE_PURCHASE_ORDER  45
CAPTURE_INVOICE         36
CAPTURE_DELIVERY_NOTE    1
```

Classification is correct on genuine business mail, e.g.
`"Marafiq RFQ No 6000571995, Ref No MSK-25-260."` → `PREPARE_QUOTATION`;
`"Invoice - MAB-0523- Welding QC - CSWIP"` → `CAPTURE_INVOICE`.

## Near-miss during verification (recorded, not a defect)

Calling `classifyEmailIntakeCandidate` **directly** returns a candidate for *every* message,
including 71 with `proposedTaskType: null` — which looks like a spec violation ("only supported
types are surfaced"). It is not: the null-type filter lives in the **loader**
(`load-email-intake.ts`), not the classifier. Checked before reporting; no defect.

## Real fragility worth flagging to Codex

The draft filter is:

```ts
.filter((node) => node.isDraft !== true && node.isDraft !== undefined)
```

`isDraft !== undefined` means that if the field is ever absent from the response, **every message
is dropped and the panel silently shows empty** rather than erroring. Today that is safe —
`isDraft` is populated on all 200 live messages (199 `false`, 1 `true`) — and it is defensible
fail-closed behaviour, but the failure mode is indistinguishable from "no candidates". Worth an
explicit honest state if the field ever stops being selected.

## Security properties confirmed

The classifier matches literal keywords only; it never executes, summarizes, or follows
instructions found in message bodies (contract `email-intake.ts:59-62`). Bodies are read for
matching and then discarded — never written onto a candidate. Email is treated as untrusted input
throughout.

## Not covered here

The **OC6-B Command Centre email panel** (UI rendering of these candidates) was published in
0.2.18 but not yet visually verified in-browser; that needs an operator session. The read model
underneath it is verified above.

---

## OC6-B panel — live render check (2026-08-28, app 0.2.18)

Verified in-browser on the Command Centre. The panel **ships, renders, and fails closed
correctly**.

Rendered under an authenticated session for workspace member `eae3016c-…` (Shahil, standard
**Admin** role):

```
Synchronized email
Review-only candidates from synchronized email. Nothing is created, sent,
or deleted; a human reviews before any record is created.

Your role does not have permission to review synchronized email candidates.
```

This is **correct behaviour, not a defect.** The panel is gated on the
`pashx.email.intake.review` permission flag. Standard `Admin` carries `permissionFlags: []` — the
pashx capability flags live only on the PashX roles (`PashX MAB Super Admin` holds all 12,
including this one). The panel refuses rather than leaking candidates, and says so honestly
instead of showing a misleading empty state.

This is the **same root cause pattern** as the WF4 approval 403: broad admin booleans
(`canAccessAllTools` etc.) do **not** imply app-specific permission flags. Worth remembering
before diagnosing any future "permission" symptom on this pilot.

Also confirmed on the same render:

- **Capability status → Document OCR: `Unavailable`** — "OCR extraction is unavailable until a
  provider passes the frozen benchmark and is accepted (OC5-OCR)." The OCR gate reports honestly
  and is not simulated.
- **Blocked data = 5**, itemised as the 3 real MAB cases plus
  `vpo-qa-20260826-mta7ubbz` and `vpo-qa-20260826-mta9m5kk` — direct on-screen confirmation of the
  fixture-pollution finding in `CC-QA-0-2-17.md`.
- Evidence insights renders its honest empty state ("No active insights").

### Still outstanding

Rendering of the **129 candidates themselves** needs a session for a member holding
`pashx.email.intake.review` (e.g. Mansoor on `PashX MAB Super Admin`). The read model producing
them is verified above; what is unverified is only the candidate-list presentation.

### Candidate list render — verified on a `pashx.email.intake.review` session

Re-checked under Mansoor (`ffac33c1-…`, `PashX MAB Super Admin`). The permission gate **opens**
and the candidate list renders. Confirmed on screen:

- **Partial notice renders honestly**: *"The bounded email read reached its limit. Visible
  candidates are valid, but the list is partial."* — this is the `isPartial` flag verified in the
  read model above, correctly surfaced in the UI rather than silently truncating.
- **Candidate cards** carry subject, `Proposed task`, `Sender`, `Received`, `Review status`, and an
  `Open message record` drill-through (10 cards, 10 links — every card has evidence linkage).
- **Review status is `Pending review` on every card** — nothing auto-accepted.
- **No body leakage in the rendered DOM.** Card text carries subject/sender/date only; no message
  body prose is present.
- Real business mail classified sensibly, e.g. *"RE: PO-009414-1 Supply of Busbar Plates …"* →
  `Capture purchase order`.

### Open question: 10 rendered vs 129 from the workspace-wide read

The render loop applies **no display cap** — it maps `emailResult.candidates` in full, and
`loadEmailIntake({})` uses the 200-message default. Yet Mansoor's session rendered **10**
candidates (5 `Capture purchase order`, 5 `Capture delivery note`) where the workspace-scoped read
model yields **129** across all four types.

So the difference is upstream of the panel, in **which `message` rows the viewing session can
read** — not a rendering defect. The likely mechanism is per-workspace-member message visibility
(the mailbox is a connected account owned by another member, so Mansoor sees only the subset
associated with him), but that was **not confirmed**: the comparison query failed because the
token expired mid-check, and `connectedAccounts` is not exposed on either the REST or GraphQL
surface under that name.

**Practical consequence, and the reason this matters:** the OC5 panel is **viewer-dependent**.
The member who owns the mailbox may lack `pashx.email.intake.review` (standard `Admin` does), while
a member who holds the flag may see only a fraction of the mail. Neither viewer necessarily sees
the true 129. This should be pinned down before OC5 is treated as operationally complete.

Reproduce with: a fresh token for a member holding the flag, then compare
`messages(first: 200)` counts for that session against the workspace API key (which sees 200/200).

---

## Viewer scoping — SETTLED (mechanism from source + live observation)

### The rule

Message reads on a **user session** pass through
`ApplyMessagesVisibilityRestrictionsService`
(`packages/twenty-server/src/modules/messaging/common/query-hooks/message/apply-messages-visibility-restrictions.service.ts`).
Per message, in order:

1. channel `visibility === SHARE_EVERYTHING` → **visible in full**;
2. else if the viewer **owns a connected account on that channel** → **visible in full**;
3. else `SUBJECT` → `text` replaced with `FIELD_RESTRICTED_ADDITIONAL_PERMISSIONS_REQUIRED`;
4. else `METADATA` → `subject` **and** `text` both replaced with that sentinel;
5. else → **the message is removed from the result entirely**.

**API keys bypass this**: they carry no user context, so the workspace API key sees all 200
messages unredacted (verified: 0 of 200 carry the sentinel). That is why the read-model
verification above legitimately yields 129 — it measures the workspace truth, not any one
viewer's truth.

### Why Mansoor saw 10, not 129

Mansoor holds `pashx.email.intake.review` but does **not** own the `info@mabindus.com` connected
account, so rules 1–2 do not apply to him for that channel.

He saw **10 messages with real, unredacted subjects** — not 200 redacted ones. That rules out
branches 3 and 4 (which would have returned all 200 with sentinel text). The observed behaviour
therefore matches **branch 5: full removal** — the messages he lost were dropped outright, and the
10 he kept are ones on channels he does own.

Branch 5 is only reachable when `visibility` matches none of the three enum values — i.e. when the
channel's **`visibility` is null/unset**, so `groupBy` produces no matching bucket. The
`MessageChannelVisibility` enum has exactly three members (`METADATA`, `SUBJECT`,
`SHARE_EVERYTHING`), so an unset value falls through every branch to the `splice`.

**Not directly read:** the channel's current `visibility` value. `myMessageChannels` is the only
surface exposing it and it rejects API keys ("This endpoint requires a user context"), and the
Mansoor token expired before it could be queried. The conclusion above is inferred from the
branch behaviour, which is unambiguous, but the literal value is worth confirming on the next
user session.

### Safety check — redaction cannot manufacture false candidates

Tested the real classifier against the sentinel directly:

| Input | `proposedTaskType` |
|---|---|
| `METADATA` redaction (subject **and** body = sentinel) | `null` → filtered out ✓ |
| `SUBJECT` redaction (real subject, body = sentinel) | correct type from the real subject ✓ |
| both empty | `null` → filtered out ✓ |

The sentinel contains none of the task keywords, so redacted mail can never produce a spurious
candidate. Redaction degrades **recall**, never **precision**.

### Operational consequence and the fix

OC5's list is **per-viewer**, and today the two roles are split the wrong way:

- **Shahil** owns the mailbox (would see all 129) but is on standard `Admin`, whose
  `permissionFlags` are `[]` — so the panel refuses him.
- **Mansoor** holds the review flag but owns nothing on that channel — so he sees a fraction.

Neither sees the real 129. Two ways to close it, both Shahil's call:

- **(a)** set the `info@mabindus.com` message channel `visibility` to `SHARE_EVERYTHING` — any
  flag-holder then sees the full set. Widens who can read the mailbox's contents.
- **(b)** grant `pashx.email.intake.review` to the mailbox owner (Shahil). Keeps mail visibility
  as-is; the reviewer is the owner. **Recommended** — narrower blast radius.

Until one is done, OC5 should not be treated as operationally complete: the panel is correct and
safe, but no single human can see the whole queue.
