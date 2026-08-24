# CC1 source metadata audit — MAB demo sheet and document packet

- Date: 2026-08-21
- Spreadsheet: `Meta information - Demo`
  (`1MpVpiBdkYO9u7uMMjfjubNGycLJivHCIEGMlnuxdOAk`)
- Local packet: `/Users/pxd/Desktop/mab/`
- Handling: read-only source evidence; no spreadsheet, document, pilot record, or accepted CX2-R
  evidence changed.

## Spreadsheet inventory

| Tab | Useful rows | Content |
|---|---:|---|
| Clients | 3 | Al Shuwayer, M.S Al-Suwaidi Industrial Services, Seyana |
| Suppliers | 7 | DBMS Steel, Asia Oruba, PowerTech, Sana, Smart Decision, Excellence & Success, Attieh |
| Users | 4 | Mansoor (Admin), Aman, Haneen, Shahil (Admin control) |
| Documents | 24 populated document rows | Three customer chains plus source filenames and several missing references |

The sheet is a source registry, not an authoritative workflow-state table. It contains no stable
record IDs, lifecycle states, case stages, action owners, due dates, blocker codes, or verified
attachment checksums.

## Local packet inventory

All 17 supplied files were inspected. Text-backed files were extracted and scan-only pages were
rendered for visual inspection.

| File | Observed role |
|---|---|
| `0560(641) #35.pdf` | Two-page MAB VAT invoice; scan-only. |
| `350173745 MAB INVOICE.pdf` | Two-page Attieh tax invoice to MAB; scan-only. |
| `ASHM-004151-1 Mohammed Ali Al Barqi.pdf` | Five-page Al Shuwayer customer PO, dated 7 Jun 2026, SAR, quotation reference `MAB-QT-2026-1006-JBL`. |
| `DBMS To MAB-DN01.pdf` | 26-page compound supplier packet: multiple DBMS delivery notes plus mill/test certificates. |
| `DBMSC to MAB Delivery Note.pdf` | Four DBMS delivery-note pages. |
| `Delivery note - DN164 - Al Shuweir - Copy.pdf` | MAB delivery note `DN-164`, dated 6 Jun 2026, linked to ASHM-004151-1. |
| `Delivery note - DN165-A - Al Shuweir.pdf` | MAB delivery note `DN-165-A`, dated 16 Jun 2026. |
| `Delivery note - DN171 - Al Shuweir.pdf` | MAB delivery note `DN-171`, dated 30 Jun 2026. |
| `Invoice to Al shuwayer.pdf` | Five-page MAB invoice packet; scan-only. |
| `MAB-INV-254 - Seyana.pdf` | Compound four-page packet: MAB invoice `MAB-INV-254`, supporting page, Seyana PO, and delivery note. |
| `MAB-PO-2026-4141- DBMSC..pdf` | Two-page MAB vendor PO to DBMS, dated 6 Jun 2026, SAR. |
| `MAB-QT-26-1004-REV.02-MS AL-SUWAIDI.xlsx` | Al-Suwaidi customer quotation, 15 Jun 2026, total SAR 24,815.85. |
| `MAB-QT-26-1027- SEYANA.xlsx` | Seyana customer quotation, 15 Jul 2026, total SAR 3,310.16. |
| `MAB-TQ-26-1006-JBL.xlsx` | Al Shuwayer quotation and vendor-comparison working sheet. |
| `PO_SIS-PO-26-01027_0.pdf` | Al-Suwaidi customer PO `SIS-PO-26-01027/0`, dated 17 Jun 2026, SAR. |
| `QUOTE DBMSC TO MAB.pdf` | DBMS supplier quotation packet; first page is the quote, second page supporting correspondence. |
| `vendor invoices Al-sawaidi.pdf` | Six supplier tax invoices from multiple vendors, bundled into one file. |

## Evidence-backed data-quality findings

1. The Documents tab names an Al Shuwayer RFQ file that is not present in the supplied folder.
2. The Al-Suwaidi RFQ is recorded only as “email, call, whatssap”, not a stable source file.
3. The Seyana RFQ is likewise recorded only as channel text.
4. Several document rows have no source filename, including the DBMS supplier invoice and Seyana
   vendor quotation.
5. `MAB-INV-254 - Seyana.pdf` is assigned to customer PO, delivery note, and invoice rows. Visual
   inspection confirms it is a compound packet, so one filename cannot be treated as one typed
   commercial-document record without page-level segmentation.
6. `vendor invoices Al-sawaidi.pdf` contains six separate supplier invoices; it also requires
   page/document segmentation before import.
7. `DBMS To MAB-DN01.pdf` combines delivery notes and mill certificates across 26 pages. Attachment
   presence does not prove a single document type or a complete delivery event.
8. Spreadsheet and local filenames differ for the Al Shuwayer invoice (`invoice 1 (596) #35.pdf`
   versus `0560(641) #35.pdf`). Matching requires human confirmation or checksum/content evidence.
9. Sheet dates are largely empty even where dates are visible inside source documents.
10. The sheet's user roles are business input, not authorization truth. They must not overwrite the
    deployed Twenty role/capability model.

## CC2 consequence

The Command Centre must not query this Google Sheet or local folder at runtime. CC2 remains based on
workspace-scoped Twenty records. Missing source files, compound packets, filename mismatches, and
page-level document segmentation belong to the staged-import correction ledger, which is still a
separate graph.

For CC2, this packet is used only to:

- validate that blocked-data presentation is necessary;
- supply realistic test names and chain shapes;
- preserve direct drill-through to authoritative imported records once those records exist;
- prohibit inference of stage, status, owner, or compliance truth from filenames.

No new Command Centre reason code is emitted for these source-only findings until an authoritative
import/source-record contract exists.
