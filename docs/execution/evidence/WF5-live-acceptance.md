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
