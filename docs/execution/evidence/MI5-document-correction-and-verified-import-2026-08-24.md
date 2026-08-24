# MI5 — MAB document correction ledger and verified import evidence

- Date: 2026-08-24
- Executor: Codex
- Authority: Shahil approved MI1 and the MI4 live apply boundary
- Pilot: `https://34-18-165-1.nip.io`
- Result: **PASS — four uniquely verified records imported with native source attachments**

## Reconciliation result

| Control | Result |
|---|---:|
| Metadata document rows | 24 |
| Local files inventoried and SHA-256 hashed | 17 |
| Rows matched to local evidence | 19 |
| Missing or channel-only rows | 5 |
| Supported, uniquely verified import candidates | 4 |
| Imported / idempotently replayed | 4 |
| Held without type coercion | 20 |
| OCR used as authoritative truth | 0 |

The correction ledger is
`/Users/pxd/Documents/Codex/2026-08-12/m/outputs/document-correction-ledger/MAB-document-correction-ledger-2026-08-24.xlsx`.
It records every source row, filename correction, page range, SHA-256, extracted fact, import/hold
decision, live record ID, live attachment ID, and local source link.

## Live records

| Reference | Type | Date | Gross total | Live document | Native attachment |
|---|---|---|---:|---|---|
| `MAB-PO-2026-4141` | Vendor purchase order | 2026-06-06 | SAR 127,544.20 | `1f7f5050-3885-49c4-8b9a-058595da6d11` | `18e8e10a-11a7-4488-b774-03c1c9b3a543` |
| `MAB-0560` | Customer invoice | 2026-06-30 | SAR 47,537.1015 | `466a5c05-0bcb-4f39-ad25-950ee0412a12` | `7c516f9c-8482-48f5-9526-cb37cb512c51` |
| `MAB-0521` | Customer invoice | 2026-06-08 | SAR 102,804.2385 | `ef650e93-88cf-4234-9ca2-bcb1ef95679d` | `348321b2-0a41-4580-82a1-5a2ea545a362` |
| `MAB-INV-254` | Customer invoice | 2026-07-28 | SAR 3,310.16 | `49c279b5-9266-4f02-8996-ab3928fc1449` | `a8447b27-b991-41b5-b1d1-cab8ffc4d328` |

Each record is `FINALIZED`, has its authoritative SAR amount/date, belongs to the intended
Procurement Case, and has exactly one native Twenty attachment linked to the Commercial Document.
The source files are the reviewed originals in `/Users/pxd/Desktop/mab/`.

## Held records and workflow boundary

Twenty's current Commercial Document contract does not represent supplier RFQs, quotations,
customer purchase orders, delivery notes, or vendor invoices. Those verified source documents
remain in the ledger rather than being mislabeled as supported document types. Missing files,
channel-only RFQs, and multi-document bundles also remain held.

The supplied **MAB Operating Process Workflow** is now the governing product contract:

1. client RFQ to MAB;
2. supplier RFQ and price comparison;
3. MAB quotation to client;
4. approved client PO to MAB;
5. vendor PO and procurement;
6. delivery and delivery note to client;
7. customer invoice and billing.

The next source node must add these explicit document roles and their transitions, human approval,
vendor comparison, delivery tracking, evidence links, and Command Centre signals. It must not infer
approval/finalization or allow an agent to approve, deliver, invoice, or alter compliance state.

## Failure handling and replay evidence

- The first apply rejected a planner-only field before any document write.
- A reused permanent file ID was rejected before attachment creation.
- Three created invoices initially lacked relations because the REST create response was interpreted
  incorrectly. The importer now re-fetches created records, repairs relations idempotently, and
  uploads a unique file ID per attachment.
- One proven orphan duplicate Procurement Case (`99b1dc91-ebfc-477c-b362-3c3735ea6a83`) was deleted
  after confirming it had no dependent records. That empty duplicate is not recoverable through the
  application UI; normal Cloud SQL backup/PITR remains the recovery boundary.
- The final identical replay returned `SKIP_EXISTING` for all three cases, four documents, and four
  attachments. No duplicate document/reference remained.

## Post-import verification

- Live API: exactly three deterministic metadata cases, four target documents, and four linked
  attachments with non-null file IDs.
- Workbook: all 24 rows decided; four import rows carry live IDs; formula-error scan found zero
  errors.
- Pilot health: `/healthz` returned HTTP 200 with `{"status":"ok"}`.
- No OCR, email intake, approval decision, compliance-state mutation, infrastructure change, or
  invented financial record was used.
