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
