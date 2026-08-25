# Command Centre coordination — real-data gap matrix

- Date: 2026-08-25
- Coordinator: DeepSeek harness (read-only probes against the live pilot)
- Live host: `https://34-18-165-1.nip.io`
- Command Centre page: `/page/cfb3c81e-3acd-47a3-83e9-6f35b358c386` (STANDALONE_PAGE instance of
  the `Command centre` layout, universal `52f71f82-28a2-4ecf-b444-74685868684b`)
- Source of truth for data: live imported records + MI3–MI5 evidence. **Nothing in this matrix is
  invented; every count is from read-only REST probes or committed evidence.**

## 1. Live verified inventory (2026-08-25, read-only)

| Object | Count | Detail |
|---|---|---|
| Procurement cases | 3 | `3af759e7` MAB-META-MAB-PO-2026-4141 (no customer link), `47e1d3ee` MAB-META-SEN-EPO-2026-1102 (customer Seyana `10f54605`), `780c98af` MAB-META-ASHM-004151-1 (customer Al Shuwayer `cb08c7c5`). All `aggregateVersion 1`, `deliveryStatus NOT_STARTED`, **stage null** (MI rule: never inferred from filenames). |
| Commercial documents | 8 | `1f7f5050` MAB-PO-2026-4141 VENDOR_PURCHASE_ORDER FINALIZED (case `3af759e7`, supplier `9f4fe842`, SAR 127,544.20); `339f18d7` MAB-QT-2026-1006-JBL CUSTOMER_QUOTE DRAFT (case `780c98af`, SAR 178,154.01); `3a7c0336` MAB-PO-2026-4141-RFQ SUPPLIER_RFQ DRAFT (case `3af759e7`, supplier `9f4fe842`); `418a4417` ASHM-004151-1 CUSTOMER_PURCHASE_ORDER DRAFT (case `780c98af`, SAR 178,270.64); `466a5c05` MAB-0560 CUSTOMER_INVOICE FINALIZED CLEARED (case `780c98af`, SAR 47,537.10); `49c279b5` MAB-INV-254 CUSTOMER_INVOICE FINALIZED CLEARED (case `47e1d3ee`, SAR 3,310.16); `cd4e4a56` DBMS-QUOTE-STRUCTURAL-MATERIALS VENDOR_QUOTE DRAFT (case `3af759e7`, supplier `9f4fe842`, SAR 127,544.20); `ef650e93` MAB-0521 CUSTOMER_INVOICE FINALIZED CLEARED (case `780c98af`, SAR 102,804.24). |
| Companies | 25 | 7 suppliers with role: Smart Decision (`0020a28c`), PowerTech (`6a489d4c`), DBMS Steel (`9f4fe842`), Attieh (`ad60f4a3`), Asia Oruba (`ed14fe8e`), Excellence & Success (`f3d9018c`), Sana (`fff44135`). 3 customers: Seyana (`10f54605`), M.S Al-Suwaidi (`c7e57c65`), Al Shuwayer (`cb08c7c5`). 15 roleless companies (Notion, Stripe, Figma, Airbnb, Anthropic, PashX test suppliers, CL0-M1 drill supplier, PXD-DEMO-20260820-SUPPLIER, Steel and Metal Solution) — **not suppliers; must never appear in the Vendors page**. |
| Approval requests | 2 | `e0e316e2` OC3 full live QA APPROVED (TEST_ACTION, source `787c8781…`), `e498a900` OC3 cancel test CANCELLED. **0 pending** → Command Centre must show Approvals 0 with no fabricated requests. The source case `787c8781-018f-4cec-b0f9-3f2dd0b5fa3a` is a deleted OC3 fixture — do not reintroduce it. |
| Operational insights | 0 | Empty — insight panel renders the honest empty state only. |
| Expenses | 0 | Empty — expense coverage shows the honest empty state. |
| Compliance | — | 3 invoices FINALIZED + CLEARED; others NOT_REQUIRED. No compliance exceptions exist in stored data. |
| OCR / email intake | — | Remains gated (OC5/OC5-OCR); unavailable states only. |

## 2. Google Sheet source

`1MpVpiBdkYO9u7uMMjfjubNGycLJivHCIEGMlnuxdOAk` — the Clients tab (gid 0) is publicly
exportable (headers: No of Clients, Name of the company, email address, address, contact name,
VAT id, CR). Suppliers/Users/Documents tabs are **not** publicly exportable (HTTP 400/redirect to
auth); their dispositions are already captured in the MI3–MI5 evidence, which the matrix relies
on. No new sheet read is required for the UI; the live imported records are authoritative.

## 3. UI surface → real-data coverage

| Surface | Real data available | Missing / must render honestly | Action owner |
|---|---|---|---|
| Command Centre signals (compliance / approvals / blocked / actions) | Real counts derivable from the bounded read model: 0 pending approvals, 0 insights, 0 compliance exceptions | "Blocked data" count must be recomputed from the current read model (DS6's `10` was against the 0.2.10 data state and is **not** a current number); case-stage-null cases produce data-completeness signals | Codex (source), Claude (live QA) |
| Command Centre ledger + drill-through | 3 cases, 8 documents, 25 companies as native links | Decided approvals excluded; deleted OC3 fixture `787c8781…` never surfaced | Codex |
| Case workflow page | Real cases/documents (rail shows **no current stage** while stage is null — honest upcoming-only rail) | `stage` null on all imported cases: either a human assigns stages (data decision) or the rail keeps the honest no-current state | Shahil (data), Codex (render) |
| Vendor comparison / MAB pipeline (parallel lane) | Real quotes: DBMS vendor quote (SAR 127,544.20) vs supplier RFQ evidence | Only one vendor quote exists — comparison renders single-row honestly, no fabricated competitors | Codex |
| Vendors page + supplier RFQ | Verified in source + local sync only | **Not installed live yet** (live install predates it) — release-gated | Claude (release gate) |
| Insights panel | 0 stored insights | Empty state only | Codex (already), Claude (QA) |
| Expenses | 0 | Empty state only | Codex |
| Bilingual / RTL / a11y / 200% | All source-verified | Live re-verification after next install | Claude |

## 4. Rules the coordinator enforces

- Every number the UI shows must trace to the bounded read model over the tables above; a number
  that cannot be reproduced from stored rows is a fabrication.
- Deleted demo fixtures (OC3/DS6 UUIDs) are never re-created or displayed as current data.
- Case stage, due dates, compliance and approval states are never inferred from filenames.
- OCR, email, insights and expenses stay unavailable until their gates pass; the UI says so.
- Publish/install and any live mutation require the separate approval gate.

## 5. Evidence

Probes: `GET /healthz` 200; `GET /rest/{procurementCases,commercialDocuments,companies,approvalRequests,operationalInsights,expenses}?limit=500` with the pilot API key (read-only), 2026-08-25. Raw dumps retained at `/tmp/live-inventory/` for this node's audit.

## 6. Honest Command Centre recompute (2026-08-25) — stale DS6 count corrected

The Command Centre's bounded classifier + work-queue builder
(`classifyCommandCentre` + `buildOperationalWorkQueue`, the same pure functions the UI uses)
were executed against the live dump via
`packages/twenty-apps/pashx-mab/scripts/recompute-command-centre-from-live.ts`.

**Predicted four-signal band from stored records:**

| Signal | Count | Source rows |
|---|---|---|
| Compliance exceptions | 0 | No REJECTED/RETRYABLE compliance states (3 invoices CLEARED, rest NOT_REQUIRED) |
| Pending approvals | 0 | 2 approvals both decided (APPROVED / CANCELLED) |
| Blocked data | **3** | `3af759e7` CASE_CUSTOMER_MISSING; `780c98af` + `47e1d3ee` CASE_OWNER_MISSING |
| Your actions | 0 | No expenses; imported cases have no owner so draft-document review items do not fire |

Ledger rows (deterministic order): exactly the three blocked-data rows above, drill-through to
the real case records. **The DS6-era "Blocked data 10" was measured against the old 0.2.10 data
state and must not be quoted as a current number.**

Observed nuance: four DRAFT documents exist (customer quote, customer PO, supplier RFQ, vendor
quote); none produces an action item because the imported cases carry no owner — the honest band
shows the underlying `CASE_OWNER_MISSING` blockers instead of inventing per-document tasks.

Tool usage: `node --import tsx scripts/recompute-command-centre-from-live.ts <dumpDir> [currentUserRecordId]`.

## 7. Case workflow page recompute (2026-08-25)

Same protocol for the Case workflow surfaces, via
`packages/twenty-apps/pashx-mab/scripts/recompute-case-workflow-from-live.ts` (the UI's own
`buildCaseStageRail` / `buildPriceComparisonRows` / `buildDeliveryState` /
`buildInvoiceReadiness` against the live dump):

| Case | Rail | Price comparison | Delivery | Invoice readiness |
|---|---|---|---|---|
| MAB-META-MAB-PO-2026-4141 (`3af759e7`) | all upcoming (stage null — honest, no current marker) | 1 real row: DBMS-QUOTE-STRUCTURAL-MATERIALS **SAR 127,544.20 DRAFT** | notStarted, no due, 0 notes | 3 gates missing (no finalized CPO/DN/invoice) |
| MAB-META-SEN-EPO-2026-1102 (`47e1d3ee`) | all upcoming (stage null) | none | notStarted | invoice 1/1 finalized (MAB-INV-254); CPO + DN missing |
| MAB-META-ASHM-004151-1 (`780c98af`) | all upcoming (stage null) | none | notStarted | cpo 0/1 (ASHM-004151-1 is DRAFT), invoice 2/2 finalized (MAB-0560 + MAB-0521); DN missing |

Observations: the ASHM case correctly shows finalized invoices **without** claiming readiness
(the customer PO is still DRAFT) — readiness derives from finalized evidence only, so imported
historical invoices do not fabricate an eligible chain. Stage-null remains an open data
decision for Shahil; the rail renders the honest no-current state until then. Recommended
option if stages are ever assigned: derive candidate stages from finalized document evidence
per case and confirm with Shahil before any write.

## 8. Vendors page recompute (2026-08-25)

Via `packages/twenty-apps/pashx-mab/scripts/recompute-vendor-directory-from-live.ts` (the UI's
own `buildVendorDirectoryRows` + `buildRfqEligibleCases` against the live dump):

- **Exactly 7 suppliers with role** render: Smart Decision, PowerTech, DBMS Steel, Attieh,
  Asia Oruba, Excellence & Success, Sana. The 15 roleless companies (Notion, Stripe, Figma,
  PashX test suppliers, …) are excluded.
- DBMS Steel shows honest activity: **1 open RFQ + 1 quote + active case
  MAB-META-MAB-PO-2026-4141** (its supplier RFQ `3a7c0336` + vendor quote `cd4e4a56`).
- **RFQ-eligible cases: 0.** No live case is in Intake/Sourcing with a client RFQ (all imported
  cases have stage null; none carries a `customerRfq`). The Vendors page will render the honest
  "no eligible case" state. The supplier-RFQ flow becomes exercisable with real data only after
  either (a) stages are assigned to the imported cases (Shahil decision), or (b) a new case is
  created through the proper intake flow with an explicit stage and a client RFQ record.

## 9. Operational profitability recompute — live cash evidence (2026-08-25)

Via `packages/twenty-apps/pashx-mab/scripts/recompute-profitability-from-live.ts` (the frozen
`aggregateOperationalProfitability` + inclusion rules over the live dump):

| Metric | SAR | Source rows |
|---|---|---|
| Finalized revenue | **153,651.50** | MAB-0560 47,537.10 + MAB-0521 102,804.24 + MAB-INV-254 3,310.16 (all CUSTOMER_INVOICE FINALIZED + CLEARED) |
| Direct cost | **127,544.20** | MAB-PO-2026-4141 VENDOR_PURCHASE_ORDER FINALIZED |
| Gross profit | **26,107.30** | revenue − cost |
| Gross margin | **16.99%** (1699 bps, frozen rounding) | deterministic |
| Excluded | 4 DRAFT documents | customer quote, customer PO, supplier RFQ, vendor quote — counted, not hidden |

No other currency appears; currencies remain separated. These are the exact totals the
Operational profitability dashboard derives from stored records.

## 10. Release-gate QA expectations (Claude lane, after next approved install)

Deterministic checks derived from the verified inventory — the live page must match every row
or the mismatch is a regression to fix, never a number to adjust:

1. Command Centre band: Compliance 0 · Approvals 0 · Blocked **3** · Your actions 0; ledger =
   exactly the three real cases (`3af759e7` customer missing; `780c98af` + `47e1d3ee` owner
   missing) with native drill-through.
2. Case workflow page per case: stage-null rail (all upcoming, no current marker); price
   comparison shows the single real quote SAR 127,544.20 DRAFT on `3af759e7`; delivery
   NOT_STARTED everywhere; ASHM (`780c98af`) shows 2/2 finalized invoices but readiness "missing"
   (CPO still DRAFT).
3. Operational profitability: SAR revenue 153,651.50 / cost 127,544.20 / profit 26,107.30 /
   margin 16.99%; 4 DRAFT exclusions visible; no other currency.
4. Vendors page (after the new app version installs): exactly the 7 role suppliers; DBMS Steel
   1 open RFQ + 1 quote + active case MAB-META-MAB-PO-2026-4141; RFQ request panel shows the
   honest "no eligible case" state; the 15 roleless companies never appear.
5. Insights and expenses panels: honest empty states; OCR/email unavailable states.
6. Bilingual English/Arabic, RTL, a11y, 44px, 200%-equivalent reflow, console clean.

## 11. Cross-boundary verification + stage-candidate proposal (2026-08-25)

**GraphQL read-model cross-check:** the exact command-centre loader query (procurementCases,
commercialDocuments, expenses, PENDING approvalRequests, ACTIVE insights) was run against the
live `/graphql` endpoint and fed to the same classifier. Prediction **identical** to the REST
path: Compliance 0 · Approvals 0 · Blocked 3 · Actions 0 (only the observed timestamp differs).
The UI's own data path produces the same honest band.

**Stage candidates** via `packages/twenty-apps/pashx-mab/scripts/propose-case-stages-from-live.ts`
(decision-support only; nothing written; closed/cancelled never proposed):

| Case | Candidate stage | Driving finalized evidence | Flag |
|---|---|---|---|
| MAB-META-MAB-PO-2026-4141 | vendor-order | MAB-PO-2026-4141 (VPO) | none |
| MAB-META-SEN-EPO-2026-1102 | invoicing | MAB-INV-254 (customer invoice) | none |
| MAB-META-ASHM-004151-1 | invoicing | MAB-0560 + MAB-0521 (invoices) | **contradiction**: invoices finalized while the customer PO is not — chain is not clean |

Applying any candidate requires Shahil's explicit confirmation; until then the UI keeps the
honest stage-null rendering.

## 12. Vendor comparison page recompute + live page wiring (2026-08-25)

**Live wiring:** the referenced page `/page/cfb3c81e-3acd-47a3-83e9-6f35b358c386` resolves to
page layout universal `52f71f82-…` (Command centre) under the pashx application
(`058263f0-…`) with the `commandCentreQueueTab` (`e2bc827a-…`) attached — the URL the
coordinator mandate names is wired to the Command Centre front component.

**Vendor comparison** via
`packages/twenty-apps/pashx-mab/scripts/recompute-vendor-comparison-from-live.ts` (the parallel
lane's own model functions over the live dump):

| Case | Finalized quotes | Recommendation | Evidence completeness |
|---|---|---|---|
| MAB-META-MAB-PO-2026-4141 | 0 (1 quote exists, **DRAFT**) | `no-finalized-quotes` | 3 docs, 1 finalized, 0 finalized quotes |
| MAB-META-SEN-EPO-2026-1102 | 0 | `no-finalized-quotes` | 1 doc, 1 finalized (invoice) |
| MAB-META-ASHM-004151-1 | 0 | `no-finalized-quotes` | 4 docs, 2 finalized (invoices) |

The page renders the honest no-recommendation state: the only real vendor quote is DRAFT, so no
comparison or recommendation is fabricated. Every live surface is now verified against stored
records (Command Centre band, Case workflow, Vendors, Vendor comparison, Operational
profitability).

## 13. In-flight overview builder verified against live data (2026-08-25)

The Codex lane's `buildCommandCentreOverview` (uncommitted, `twenty-cc-live-codex` worktree)
was executed with the live dump (temp runner, removed afterwards). Result — all numbers derived
from stored records, all honest states:

| Case | Docs (total/finalized) | Quotation state | Delivery | Invoices | Cash | nextWork |
|---|---|---|---|---|---|---|
| MAB-PO-2026-4141 | 3/1 | 1 draft invitation + 1 draft response, `AWAITING_FINALIZED_RESPONSES` | notStarted | — | UNAVAILABLE | CASE_CUSTOMER_MISSING |
| ASHM-004151-1 | 4/2 | `AWAITING_FINALIZED_RESPONSES` | notStarted | MAB-0560, MAB-0521 FINALIZED/CLEARED | UNAVAILABLE | CASE_OWNER_MISSING |
| SEN-EPO-2026-1102 | 1/1 | `AWAITING_FINALIZED_RESPONSES` | notStarted | MAB-INV-254 FINALIZED/CLEARED | UNAVAILABLE | CASE_OWNER_MISSING |

Consistent with the independent predictions: stage summary `unrecordedCount: 3`, work queue
3× BLOCKED_DATA, cash capability-gated `UNAVAILABLE` (live pilot has no cash capability), and
38 native links (3 cases + 8 documents + 25 companies + 2 approvals — exact). The lane's
in-flight builder complies with every real-data rule; no fabrication path observed.

## 14. Round-9 lane delta review (2026-08-25)

Logic deltas in `twenty-cc-live-codex` reviewed (classifier/model/loader/pipeline):

- `isAcceptedComplianceException` (new shared helper) == REJECTED || RETRYABLE_FAILURE —
  semantics identical to the previous inline checks; reason codes preserved.
- `resolveOverviewInsightSourceLinks` — unresolvable source ids stay honest plain ids.
- Old `load-command-centre` gains placeholder defaults (`normalizedDocumentType: null`, etc.);
  **the new UI uses `loadCommandCentreOverview`, so the placeholders are inert** — no
  honesty risk, but the old loader must not be used by the new overview path.
- Lane app suite: **125 pass / 4 fail** — the 4 failures are stale assertions in the old
  command-centre UI tests (copy/states/styles/source) that predate the UI rework; expected
  mid-flight. Lane should update those tests before landing.
- Live state unchanged (3 cases, stages still null) — no stage decision applied yet.

## 15. Round-10 release-readiness: overview loader vs live schema (2026-08-25)

The lane's `loadCommandCentreOverview` field selection was run against the live `/graphql`
schema (installed app): **all fields resolve** — `deliveryStatus`, `deliveryDueAt`,
`supplierResponseDeadlineAt`, `totalAmount { amountMicros currencyCode }`, `leadTimeDays`,
`paymentTerms`, `validUntil`. Real values through the UI's data path: case deliveryStatus
`NOT_STARTED`; doc totals/terms/validity columns present. When the overview UI lands and is
released, its data query will succeed against the current live schema — no schema-side unknown
at the release gate. (Note: `paymentTerms` returns `""` on live rows; the lane's `toNullable`
normalizes empty strings to null — no mismatch.)

## 16. Stage decision applied (2026-08-25, Shahil-approved)

The §11 candidates were applied to the three real cases via the standard record API (explicit
approval; documented as a data repair, not a workflow command — the transition graph has no
null→X edge):

| Case | Stage applied | Verified |
|---|---|---|
| MAB-META-MAB-PO-2026-4141 (`3af759e7`) | vendor-order | rail `vendor-order:current` |
| MAB-META-SEN-EPO-2026-1102 (`47e1d3ee`) | invoicing | rail `invoicing:current` |
| MAB-META-ASHM-004151-1 (`780c98af`) | invoicing | rail `invoicing:current` (contradiction remains documented: customer PO still DRAFT) |

Post-apply battery: Command Centre band unchanged **0/0/3/0** (blocked-data signals are
customer/owner-missing data fields, not stage-dependent); case-workflow rails now show real
current markers. RFQ eligibility stays **0** (vendor-order/invoicing are not intake/sourcing) —
the RFQ flow becomes exercisable with a properly-staged new case.
