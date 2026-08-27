# Claude lane execution pack — CC 0.2.16 redeploy + §10 QA

- Date: 2026-08-25
- For: Claude lane (resume after the session limit resets)
- Coordinator: DeepSeek harness
- Live host: `https://34-18-165-1.nip.io` · installed app: **0.2.16** (rollback: 0.2.15)
- Everything below is deterministic; record results in a new
  `docs/execution/evidence/CC-QA-0-2-16.md` and commit.

## Thread 1 — host redeploy (adds the supplier-RFQ endpoint)

Current state (verified 2026-08-25): `POST /rest/pashx-mab/procurement-cases/:id/supplier-rfqs`
returns the REST-core `"Query path invalid"` — the host server predates
`pashx-supplier-rfq.controller.ts`.

1. Deploy a host image carrying the current `twenty-server` module (standard pilot release
   path; record the new immutable host digest and keep the previous host as rollback).
2. After deploy, every probe must flip to the typed envelope:

```bash
# must return {"ok":false,"code":"PASHX_INVALID_INPUT","fieldPaths":["contractVersion",
# "procurementCaseRecordId","idempotencyKey","expectedVersion","payload"]}
curl -X POST -H "Authorization: Bearer <key>" -H "Content-Type: application/json" -d '{}' \
  "https://34-18-165-1.nip.io/rest/pashx-mab/procurement-cases/<uuid>/supplier-rfqs"

# regressions — must keep answering as before:
# POST …/transitions, …/delivery, …/commercial-documents/:id/finalize  → same typed envelope
```

3. `/healthz` 200 after deploy.
4. Optional end-to-end (disposable, fixture authority already granted for QA): create a case
   with stage `INTAKE` + a client RFQ record, request RFQs for the 7 real suppliers, verify 7
   `MAB-SRFQ-<period>-<nnnn>` drafts, delete fixtures, verify 404.

## Thread 2 — §10 browser/operator QA of the evidence-led Command Centre (0.2.16)

Expected values (all pre-verified from stored records):

1. **Band:** Compliance 0 · Approvals 0 · Blocked **3** · Your actions 0; ledger = the three
   real cases (`3af759e7` CASE_CUSTOMER_MISSING; `780c98af` + `47e1d3ee` CASE_OWNER_MISSING)
   with native drill-through.
2. **Case workflow rails:** MAB-PO `vendor-order:current`; SEN-EPO `invoicing:current`;
   ASHM `invoicing:current` (its 2 finalized invoices with a DRAFT CPO → readiness "missing").
3. **Price comparison:** the single real quote SAR 127,544.20 DRAFT on MAB-PO; comparison page
   `no-finalized-quotes` everywhere.
4. **Profitability:** SAR revenue 153,651.50 / cost 127,544.20 / profit 26,107.30 / margin
   16.99%; 4 DRAFT exclusions visible; SAR only.
5. **Vendors:** exactly 7 role suppliers; DBMS Steel 1 open RFQ + 1 quote + active case;
   RFQ panel honest "no eligible case" (until Thread 1 lands, the request action shows its
   error state — record it as expected pre-redeploy).
6. **Insights/expenses:** honest empty states; OCR/email unavailable states.
7. **Cash band:** `UNAVAILABLE` (capability-gated) or `NOT_RECORDED` — never fabricated.
8. **Bilingual/RTL/a11y:** English/Arabic, `dir=rtl`, one H1, named regions, 44px targets,
   200%-equivalent reflow, console clean.

## Evidence template (commit as `docs/execution/evidence/CC-QA-0-2-16.md`)

For each check: expected value, observed value, pass/fail, and the exact probe/screenshot
reference. Any mismatch is a regression to report (source → Codex lane with evidence;
runtime → Claude lane) — never adjust the number.

## Files the lane needs

- Recipe source: `docs/execution/evidence/CC-release-gate-0-2-15.md`
- Frozen expectations + derivation: `docs/execution/evidence/CC-coordination-real-data-gap-matrix.md` (§10, §14–§17)
- Deterministic recompute tools (app package `scripts/`): `recompute-command-centre-from-live.ts`,
  `recompute-case-workflow-from-live.ts`, `recompute-vendor-directory-from-live.ts`,
  `recompute-profitability-from-live.ts`, `recompute-vendor-comparison-from-live.ts`
