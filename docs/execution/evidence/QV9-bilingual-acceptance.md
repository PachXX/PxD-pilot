# QV9 — QV bilingual end-to-end acceptance (verified real evidence)

- Date: 2026-08-25
- Owner: Codex + Claude lanes (executed by the DeepSeek harness as coordinator; QV7 authorized
  publish/install/live QA; QV9 evidence decision by Shahil: use verified MI5/MAB real evidence,
  no disposable fixtures)
- BASE_SHA: `26d55fde1a85a4a24f35898bc751a62832c04fcc`
- App version: pashx-mab **0.2.13** installed on the pilot
- Host: `https://34-18-165-1.nip.io`
- Harness: `packages/twenty-server/test/integration/pashx-mab/qv9/qv9-live-acceptance.mjs`

## Evidence used (verified real, not disposable)

- Supplier: **DBMS Steel and Metal Solution Trading Company** (`9f4fe842-3e73-4067-b4f4-3dc125240c0b`,
  `mab-meta:suppliers:2`, CR `2050187041`, imported in MI4).
- Case: **MAB-META-MAB-PO-2026-4141** (`3af759e7-1f3e-4c95-bab9-cba2be038f87`).
- Source documents: `QUOTE DBMSC TO MAB.pdf` (SHA-256 `da0ea6c8…`) — scanned structural-materials
  quote from DBMS, terms DDP / validity 2 days / payment "as usual"; and `MAB-PO-2026-4141`
  (`1f7f5050…`, FINALIZED VENDOR_PURCHASE_ORDER, GRAND TOTAL SAR 127,544.20 — the verified,
  already-imported amount for the same transaction/line items).

## Flow created (QV7-authorized live records, accepted evidence)

Using the verified real evidence, the harness created on the real case:

- `MAB-PO-2026-4141-RFQ` — SUPPLIER_RFQ, DRAFT, supplier `9f4fe842`.
- `DBMS-QUOTE-STRUCTURAL-MATERIALS` — VENDOR_QUOTE, DRAFT, supplier `9f4fe842`,
  totalAmount SAR **127,544.20** (`127544200000` micros), currency SAR.

Amount source: the scanned quote's own total is not machine-readable (OCR limitation — the same
reason MI5 held quotations out). Per Shahil's QV9 evidence decision, the quote was populated with
the verified FINALIZED grand total of `MAB-PO-2026-4141` (same transaction, matching line items),
not a guessed figure.

## Verification

- QV page data contract (case-scoped read): case resolves; documents scoped by
  `procurementCaseRecordId eq` return **3** records, `hasNextPage: false`.
- Signals present: `supplierRfq` (invited=1), `vendorQuote` (response=1); deterministic
  comparison honest — a single DRAFT quote yields an honest **no-recommendation /
  insufficient-comparable** state, never a fabricated ranking.
- Bilingual copy contract: all QV signal keys (invited/responses/responseDeadline/supplier/
  comparison/deterministic) have EN/AR parity; Arabic renders (`مقارنة الموردين` = "Vendor
  comparison"); RTL switch, aria, 44px, contrast, reduced-motion asserted in the app suite
  (98/98).
- No disposable fixture created; no accepted pilot evidence rewritten; the pre-existing FINALIZED
  `MAB-PO-2026-4141` is untouched.

## Acceptance verdict

**PASS (with honest-state behavior confirmed).** The Quotation & Vendor Comparison page accepts a
verified bilingual MAB quotation flow: supplier RFQ invitation, vendor quote with the verified
transaction amount, honest deterministic comparison, and native drill-through. A ranked
recommendation would require a second comparable finalized quote (the page correctly does not
fabricate one from a single candidate).

## Manual-only residuals (WF5/QV9 human checks, DS6 precedent)

- Visual parity vs approved mockups; VoiceOver spoken output; exact native 200% zoom;
  physical Tab order.
- Ranked comparison with 2+ finalized quotes on a real case (requires a second verified
  supplier quote with a machine-readable amount).

## Next owner

DeepSeek (coordinator) — record the QV9 verdict in the shared ledger; then all QV0–QV9 gates are
closed, leaving only QV7-pending-anything-live beyond the already-authorized publish, and WF5's
manual residuals with Shahil.
