# OC5-OCR readiness evidence

- Date: 2026-08-21
- Scope: read-only inventory, source contract, and local provider benchmark; no live writes
- Corpus: `/Users/pxd/Desktop/mab`

## Text-layer inventory

The staged folder contains 14 PDFs (65 pages) and four XLSX sources. A `pdfplumber` read-only pass
found 48 PDF pages with no extractable text, so native text extraction alone cannot cover the MAB
document set. `QUOTE DBMSC TO MAB.pdf` also has only 23 extracted characters across two pages and
must be treated as OCR-only by the frozen routing threshold.

| PDF | Pages | Text characters | Empty pages | Route |
|---|---:|---:|---:|---|
| `0560(641) #35.pdf` | 2 | 0 | 2 | OCR only |
| `350173745 MAB INVOICE.pdf` | 2 | 0 | 2 | OCR only |
| `ASHM-004151-1 Mohammed Ali Al Barqi.pdf` | 5 | 19,233 | 0 | Text layer |
| `DBMS To MAB-DN01.pdf` | 26 | 0 | 26 | OCR only |
| `DBMSC to MAB Delivery Note.pdf` | 4 | 0 | 4 | OCR only |
| `Delivery note - DN164 - Al Shuweir - Copy.pdf` | 2 | 2,271 | 0 | Text layer |
| `Delivery note - DN165-A - Al Shuweir.pdf` | 1 | 1,010 | 0 | Text layer |
| `Delivery note - DN171 - Al Shuweir.pdf` | 1 | 1,184 | 0 | Text layer |
| `Invoice to Al shuwayer.pdf` | 5 | 0 | 5 | OCR only |
| `MAB-INV-254 - Seyana.pdf` | 4 | 3,505 | 2 | Hybrid OCR |
| `MAB-PO-2026-4141- DBMSC..pdf` | 2 | 3,824 | 0 | Text layer |
| `PO_SIS-PO-26-01027_0.pdf` | 3 | 7,713 | 0 | Text layer |
| `QUOTE DBMSC TO MAB.pdf` | 2 | 23 | 1 | OCR only |
| `vendor invoices Al-sawaidi.pdf` | 6 | 0 | 6 | OCR only |

The XLSX files remain structured-source inputs and must not be rasterized through OCR.

## Frozen source contract

- `routeDocumentExtraction` routes each file to `TEXT_LAYER`, `HYBRID_OCR`, or `OCR_ONLY` using a
  conservative 40-character-per-page sufficiency check.
- Extraction proposals retain source file UUID and SHA-256, engine name/version, page and normalized
  bounding-box provenance, source text, per-region and per-field confidence, and review state.
- Accepted engine candidates remain `NATIVE_TEXT_LAYER` and benchmark-gated
  `PADDLEOCR_PP_STRUCTURE_V3`; naming a candidate does not approve it for pilot use.
- Every proposal begins `PENDING_REVIEW`. OCR cannot create an approval/task/financial record,
  finalize a document, or change compliance state.

## Provider benchmark gate

Before provider implementation, use a sanitized representative set covering English, Arabic,
mixed-language, tables, multi-page packets and scans. Record field-level precision/recall for
document number, date, supplier/customer identifiers, currency, subtotal, VAT, total and line
items. Also record page latency, memory, failure/timeout behavior and page-region fidelity. The
provider remains disabled until thresholds and an explicit acceptance decision are recorded.

## 2026-08-21 local provider benchmark

### Method and isolation

- Shahil approved the benchmark. It ran locally against three representative first pages from the
  staged MAB folder and made no request to the pilot, Cloud SQL, or any external OCR API.
- Corpus pages: scanned customer invoice, scanned vendor invoice, and bilingual delivery note.
  Together they exercise English/Arabic text, VAT/CR identifiers, dates, monetary totals, tables,
  QR/stamp noise, handwriting/signatures, and a purchase-order reference.
- Runtime: isolated Python 3.12 virtual environment with PaddlePaddle `3.3.0` and PaddleOCR `3.7.0`
  on Apple CPU. The source PDFs and extracted text remained local.
- Two independent recognition proposals were produced per page: PP-OCRv5 English and PP-OCRv5
  Arabic, using the same server detector. No proposal was accepted into a business record.
- Critical-field scoring used case/punctuation/whitespace-normalized exact presence across the two
  proposals. It did **not** repair OCR-confusable characters such as `O` and `0`.

### Results

| Page | English seconds | Arabic seconds | English mean confidence | Arabic mean confidence | Critical fields |
|---|---:|---:|---:|---:|---:|
| Customer invoice | 81.308 | 92.823 | 0.8791 | 0.9472 | 11/11 |
| Vendor invoice | 70.259 | 73.492 | 0.6949 | 0.9163 | 7/7 |
| DBMSC delivery note | 70.226 | 85.047 | 0.9342 | 0.9472 | 6/7 |
| **Total / mean** | **73.931 mean** | **83.787 mean** | — | — | **24/25 (96%)** |

The missed field was purchase-order reference `MAB-PO-2026-4141-R0`; recognition confused letters
and zeroes (`P0`/`PO`, `R0`/`RO`). The two invoice pages retained their sampled document numbers,
dates, VAT/CR identifiers, subtotal/VAT/total values, and the customer contract reference. The
Arabic recognizer returned useful labels and narrative, but visible character/word errors remain,
especially in dense descriptions. Its high mean confidence therefore cannot be treated as
calibrated field correctness.

The lean bilingual models occupy approximately 100 MB (84 MB detector plus 7.7 MB English and
7.8 MB Arabic recognizers), but the isolated Python environment occupies 1.1 GB. A dual-language
page averaged 157.718 seconds on this CPU before queue overhead. The richer PP-StructureV3 path had
a 946.422-second download-dominated cold initialization and 229.087-second first-page prediction;
it produced an output artifact but the process then exited with signal-derived status 133. Its
downloaded model cache reached 1.0 GB. That path is not operationally stable enough for the pilot.

### Decision

**Technical smoke pass; provider acceptance remains blocked.** The benchmark proves that local,
text-first OCR can recover most high-value fields and that a dual English/Arabic proposal is worth
continuing. It does not satisfy the provider gate because:

1. three pages are not a labeled representative evaluation of the 65-page corpus;
2. line-item and Arabic precision/recall have not been measured;
3. one critical identifier was wrong despite high confidence;
4. page/region fidelity and resource behavior on the target pilot VM are unverified;
5. CPU latency requires an asynchronous queue, timeout, retry, and cancellation design; and
6. PP-StructureV3 terminated abnormally after its first result.

No OCR worker/provider is enabled in production. Next is **OC5-OCR-B2**: create a sanitized labeled
evaluation set spanning the frozen routes, define field-level thresholds and confusable-character
policy, benchmark the lean bilingual pipeline on target-class resources, and explicitly accept or
reject it. Until then, OCR remains a disabled proposal adapter behind the existing human-review
contract.
