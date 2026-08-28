# WF5 — live bilingual acceptance evidence

- Date: 2026-08-25
- Live execution owner: Claude Code
- Authorization: Shahil specified the fixture-authority mechanism (`WF5_EXECUTE=1` +
  `WF5_APPROVER_MEMBER_ID`/operator token) then said "start wf5" — recorded authorization,
  mirroring the DS6/CC5 gate convention.
- Full detail: `Pashx - MAB Agent Shared Context.md`, entry "WF5 live acceptance: chain walk
  PASS, cleanup verified, partial browser matrix".

## Result summary

- **Row 1 (chain walk): PASS.** One disposable procurement case (`WF5-QA-8d9ab472`) walked
  through the full MAB operating chain via the live REST boundary of app `0.2.13`: 8 documents
  finalized, 3 human approval gates requested and approved, delivery recorded, case reached
  `CLOSED` at `aggregateVersion 8`.
- **Cleanup: verified.** All 8 documents, the case, the disposable supplier, and 3 approval
  requests deleted and independently confirmed absent via direct REST queries (zero results for
  the `WF5-QA-8d9ab472` prefix across all four object types).
- **Browser matrix: partially covered** (rows 3–9, 11), verified against the real evidence case
  `MAB-META-MAB-PO-2026-4141` rather than the disposable case (already cleaned up by the time
  browser checks began): header/branding, case picker, nine-stage rail, documents ledger, price
  comparison (honest single-quote display, no fabricated ranking), delivery and invoice-readiness
  (honest empty/missing states), Arabic/RTL (meaningful translation, full layout mirror),
  accessibility semantics (native landmarks/heading/labelled buttons), zero console errors.
- **Not covered this pass**: row 2 (mid-walk Command Centre signals), row 10 (refresh/error
  states), row 12 (200% reflow), the 10-row visual-parity-vs-mockup checklist, and row 14
  (native VoiceOver/physical Tab — standing manual residual, not Claude's to perform).

## Bugs found and fixed in the harness

All three were pre-existing in the committed source, not introduced by this run.

1. **Response envelope not unwrapped** — `createRecord()` read `.id` off the raw REST response
   instead of `response.body.data.<create...>`. Caused the first EXECUTE attempt to create two
   real disposable records (a company and a procurement case) then die before capturing their
   ids for cleanup. Found and manually deleted the orphans (confirmed 404 after).
2. **Missing `stage: 'INTAKE'`** on procurement-case creation — the field has no schema default,
   so the case would persist `stage: null` and break the first transition.
3. **Cleanup-verification loop destructuring bug** — `for (const [objectPlural, id] of
   ['x', ...spread]])` only captures the first spread element, then iterates a UUID string
   character-by-character. The actual delete loop above it is unaffected; only its own
   self-verification was broken. Fixed for future runs; not re-exercised this pass since direct
   REST queries already proved cleanup was complete.

Fix location: `packages/twenty-server/test/integration/pashx-mab/wf5/wf5-live-acceptance.mjs`.

## Next step

Shahil to decide: close WF5 on this evidence, or request a follow-up pass with a fresh operator
token to cover the remaining matrix rows and the visual-parity checklist.

---

# WF5 — re-verification against 0.2.17 (2026-08-28)

- Executed by: Claude lane, after WF4 closed
- Live host: `https://mab.pashx.com` · app `0.2.17` · host digest `sha256:4b249692…`
- Companion evidence: `docs/execution/evidence/CC-QA-0-2-17.md` (Claude lane execution pack run)

## Why re-run

The 2026-08-25 pass above ran against app `0.2.13` on the now-dead `nip.io` host. WF4 closed on
2026-08-28 after a fundamental harness bug was found and fixed (see below), so rows 1 and 13 were
re-established against the current build.

## Row 1 — chain walk: **PASS** (re-verified on 0.2.17)

Fixture prefix `WF4-QA-1787828327`. Full chain: intake → sourcing → quoted → customer-order →
vendor-order → delivery → invoicing → **closed at `aggregateVersion 8`**; 8 documents finalized;
all 3 approval gates requested *and decided*; delivery recorded.

**Harness defect found and fixed to get here.** The harness drove every call — including the
approval decision — from a single `WF5_BEARER`. The frozen contract predicate
`isPurchaseOrderApprovalDecisionAuthorized`
(`packages/pashx-mab-contract/src/approval-commands.ts:127`) enforces separation of duties:

```ts
if (requesterRecordId === actorRecordId) return false;
```

so a requester can never decide their own request. The approval step was therefore
**structurally unpassable for any account or role** — it had been misdiagnosed twice as a
role/capability gap. Fixed by adding `WF5_DECIDER_BEARER`, a second bearer from a different
workspace member used only for the decision call, defaulting to `WF5_BEARER` so existing
invocations are unchanged. Commit `5b12b6d610`.

## Row 13 — cleanup verification: **PASS**

Harness self-cleanup ran and reported 404 on every disposable id. Independently confirmed on the
Command Centre: zero occurrences of `WF4-QA` / `WF5-QA` / `disposable` in the rendered page.

Two `vpo-qa-20260826-*` fixtures **from another lane** remain live and inflate the blocked-data
signal from 3 to 5 — detailed in `CC-QA-0-2-17.md` finding 1. Not this lane's fixtures; not
deleted.

## Rows 3–9, 12 — re-verified on 0.2.17

Rail (`delivery` current, `aria-current="step"`), documents ledger, price comparison
(SAR 127,544.20 DRAFT, deterministic-ranking note), delivery + readiness honest "Missing" states,
Arabic/RTL (`<div lang="ar" dir="rtl">`, computed RTL, meaning-matched translation, shell stays
English/LTR), one `<h1>`, 2 native `<table>` elements, and no horizontal overflow at 720px.
Full table in `CC-QA-0-2-17.md`.

## Rows that did NOT pass or could not be verified

| Row | Status | Detail |
|---|---|---|
| 9 (partial) | **FAIL** | 9 of 14 in-content interactive targets are 21–24px, below the 44px criterion — source-side, Codex lane. `CC-QA-0-2-17.md` finding 4 |
| 10 | **PARTIAL** | Refresh advances observed time (`00:10` → `00:17`); transient disabled state not observable at 150ms sampling. Empty/loading/partial/error states not exercised |
| 11 | **UNVERIFIED** | Browser console tool returned byte-identical output across a forced reload, including stale entries from earlier expired-token navigations — not trustworthy as evidence. Not claimed as pass |
| 14 | **MANUAL RESIDUAL** | Physical-Mac VoiceOver / native Tab order — per the harness spec's own precedent, needs a human |

## Exit status

Rows 1, 3–8, 12, 13 pass. Row 9 carries one real source defect (touch-target size). Rows 10, 11
are partially/not verified and are explicitly **not** claimed as passes. Row 14 remains the
declared manual residual. WF5 is therefore **not fully closed** — it needs the 44px fix, a
trustworthy console-health check, and the human residual.
