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
