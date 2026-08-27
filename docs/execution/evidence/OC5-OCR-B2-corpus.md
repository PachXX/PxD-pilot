# OC5-OCR-B2 labeled-corpus gate

- Date: 2026-08-24
- State: B2-B scorecard approved; B2-A assigned to Shahil in a native Google Sheet, with human labels still pending
- Source boundary: local staged MAB documents only; no upload, pilot mutation, or provider invocation
- Privacy: repository evidence uses aliases and SHA-256 hashes, not source filenames

## Selection method

The 65-page staged PDF set was inventoried with `pdfinfo` and `pdfplumber`, then rendered locally at
thumbnail resolution for visual classification. The selected 40 pages cover all 14 PDF source
hashes while sampling the 26-page packet rather than allowing it to dominate the evaluation.
Structured XLSX files are excluded because they must use the structured-data path, not OCR.

| Alias | SHA-256 | Selected pages | Route coverage | Visual coverage |
|---|---|---|---|---|
| D01 | `492d48c18f53e611d50f394a13d8c297ec19f99ab6fee615c4a7851f5d93d1d3` | 1-2 | OCR only | bilingual invoice, dense table, stamp |
| D02 | `e13e3122a072fbf0f81f4b9574a367c39d22cf7cf04ebe62afb7a1719909cb7c` | 1-2 | OCR only | tax invoice, totals, QR, Arabic/English |
| D03 | `92d6ab340132c3eddf11a6274c1eb072f638af425a885756823109ec6c91996e` | 1, 3, 5 | text layer | multi-page PO, line items, approval blocks, terms |
| D04 | `64b7ccfa9b56e40b52bee0def5dc87b12aa57229c7406eefda7edd9d5c5dfc36` | 1, 5, 9, 13, 17, 21, 26 | OCR only | long packet, delivery notes, rotated mill certificates |
| D05 | `97c4878c9cfdb0a7984faca0d701e34ef3c636e51139ad451059a144335bc325` | 1-4 | OCR only | four-page delivery-note sequence, handwriting/stamps |
| D06 | `e516c6c7caa63ae1c308c98315919fe530928e4d34cb5ca79f2b49ee7f829f20` | 1-2 | text layer | bilingual delivery note and acknowledgement |
| D07 | `50d703c6ced5c1db36c77a2841a4429dfea155ed9f452af64453a92a6ec2447f` | 1 | text layer | sparse delivery note, ruled table |
| D08 | `b838206d2c3ef1742a7d8eb2f19845e4fd61fbb8b105e9446eaae2e3b0d62b1a` | 1 | text layer | delivery note, wrapped descriptions |
| D09 | `9742a0683e28c0e9f06798d216afe55c308725faa28b1e73467cf5fd39136faf` | 1, 3, 5 | OCR only | multi-page bilingual invoice, dense line items |
| D10 | `b3650563ac24896d9de02bf9223b72a3fcab92cf1cf2b2dc5cc4a4247fc01260` | 1-4 | hybrid OCR | invoice, QR, PO attachment, mixed native/scanned pages |
| D11 | `921746d7a365f853098ad4e7227696a3cc78ae5d5cd94b1c40083180a9ee85bf` | 1-2 | text layer | purchase order, dense table, signatures |
| D12 | `2a2623f084b93e4ca8f0524bd988c45ffe3e0148c193593d802d59850870fc9f` | 1-3 | text layer | long purchase-order table and terms |
| D13 | `da0ea6c881c35532afc345681cb3a0fffdf1ddceb19bcf450ffc94c611575f1f` | 1-2 | OCR only | quotation table and sparse terms page |
| D14 | `c62f3667ebebd016792a6aae4b8049cf5842c2df22bef9dd0549fc8081ffebec` | 1, 2, 4, 6 | OCR only | heterogeneous vendor invoices, Arabic/English, QR |

This produces 40 pages: 13 text-layer pages, four hybrid-document pages, and 23 additional
image-only pages. Page-level scoring must still follow the frozen router, so only insufficient
pages in D10 are sent to OCR.

## Ground-truth schema

Each selected page must be labeled by a human reviewer with:

- document type and page role;
- document number, date, currency, supplier/customer name, CR and VAT identifiers when present;
- subtotal, VAT and total when present;
- purchase-order, contract, quotation, invoice and delivery-note references when present;
- every line item's description, quantity, unit, unit price, VAT and line total when present;
- language/script classification; and
- normalized page bounding box for every labeled value.

Absent fields are labeled explicitly as absent. Illegible values are labeled illegible rather than
inferred. Ground truth never uses an OCR proposal as its source.

The review instrument is
`/Users/pxd/Documents/Codex/2026-08-12/m/outputs/oc5-ocr-b2/OC5-OCR-B2-human-labeling-workbook.xlsx`.
To remove the Microsoft subscription/save blocker, Codex converted the instrument to the native,
browser-editable Google Sheet
[`OC5-OCR-B2 Human Ground-Truth Workbook`](https://docs.google.com/spreadsheets/d/1d8k0uztyN8ihYSeogb0bXXwSRYIxgJs6Mf8DcyAtpko/edit)
on 2026-08-24. All six sheets, formulas, controlled dropdowns, native tables, conditional formatting,
frozen thresholds and `Provider = DISABLED` survived conversion. The 40 page rows are assigned to
Shahil with status `IN_REVIEW`; this assignment is not evidence that the pages or labels were reviewed.
It contains controlled sheets for the 40 selected pages, critical fields, line items, provider
results and the frozen scorecard. Formula-generated label IDs provide deterministic join keys for
Claude's later B2-C results. The workbook intentionally contains no prefilled OCR-derived truth.
Shahil approved the workbook and review procedure on 2026-08-24. This approval authorizes human
labeling to start; it does not approve any blank or future label value.

## Approved B2-B acceptance scorecard

Shahil approved these thresholds and the confusable-character policy on 2026-08-24. They are now
frozen for the B2-C provider benchmark and may not be relaxed after results are observed:

| Measure | Proposed threshold |
|---|---:|
| Document number and cross-document reference exactness | 100%; no silent O/0, I/1, B/8 correction |
| CR/VAT identifier exactness | 100% |
| Date, currency, subtotal, VAT and total precision/recall | >= 98% each |
| Supplier/customer identity precision/recall | >= 98% |
| Arabic critical-field precision/recall | >= 95% |
| Line-item row alignment | >= 95% |
| Line-item numeric-field precision/recall | >= 98% |
| Page/region provenance | 100% page attribution; >= 95% regions overlap the labeled value |
| Silent page loss or invented critical value | 0 |
| Controlled page failure/timeout | <= 2%, always escalated to human review |
| Warm p95 OCR latency on isolated `e2-standard-2` equivalent | <= 120 seconds/page |
| Cold start | <= 180 seconds |
| Peak resident memory | <= 5 GiB, leaving at least 2 GiB instance headroom |
| Model/cache disk | <= 2 GiB |

Confusable characters may be normalized only for search candidates. They may never change a stored
identifier automatically; any non-exact critical identifier remains `PENDING_REVIEW` with the
original OCR text and confidence preserved.

## Target benchmark isolation

B2-C must not run on `pashx-mab-app`. Claude will provision an isolated, disposable instance that
matches `e2-standard-2` (2 vCPU, 8 GiB), with no route or credentials to pilot Cloud SQL and no
shared application containers. The benchmark records cold/warm latency, peak memory and disk,
timeout, cancellation, retry, corrupt-page behavior and exit status. The instance and downloaded
models are destroyed after evidence collection.

## Remaining gate

1. Complete independent field, line-item and region labels for the 40 pages using the generated
   human-review workbook.
2. ~~Review and approve or revise the proposed thresholds.~~ **Complete 2026-08-24.**
3. Run the frozen corpus on isolated target-class compute.
4. Record the B2-D accept/reject decision.

Until all four steps are complete, no OCR provider is accepted or enabled.

## 2026-08-24 completeness validation

Codex imported and validated the saved workbook rather than relying on its displayed summary. The
result is **not freezeable**:

- page manifest: 40/40 rows present, 40 unique page keys, no duplicate keys;
- page review: 0/40 `APPROVED`, 0/40 named reviewers, 0/40 review timestamps;
- critical field labels: 0 active rows, 0 represented pages;
- line-item labels: 0 active rows, 0 represented pages; and
- provider results: 0 rows, so no provider output contaminated the truth workbook.

The workbook remains a valid empty review instrument, not a labeled corpus. Codex did not freeze it
and did not issue the B2-C start signal.

## 2026-08-24 browser-editing recovery

The local Excel workbook could not be saved because the operator did not have an active Microsoft
subscription. Codex imported the exact XLSX into a native Google Sheet, verified the manifest,
formulas, data validation, scorecard and isolation flag after conversion, and assigned all 40 page
rows to Shahil as `IN_REVIEW`. Summary formulas still correctly report 0 approved pages, 0 approved
field labels and 0 approved line items. No OCR output or invented ground truth was added. B2-A is
operationally unblocked for browser editing, but B2-C remains blocked until real human labels pass
the completeness validator and the corpus is frozen.
