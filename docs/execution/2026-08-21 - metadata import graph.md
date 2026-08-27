# MAB metadata import graph — source registry to authoritative Twenty records

- Date: 2026-08-21
- Owners: Codex (contract/import source), Claude (pilot execution/evidence)
- Source: Google Sheet `Meta information - Demo`
  (`1MpVpiBdkYO9u7uMMjfjubNGycLJivHCIEGMlnuxdOAk`) and `/Users/pxd/Desktop/mab/`
- Status: **MI3, MI4 and MI5 complete 2026-08-24; WF1 ready**

## Outcome

Add existing MAB business data to the pilot once, with stable provenance and without turning
spreadsheet guesses into workflow truth. Imported records become visible to the Command Centre
through the existing workspace-scoped CC2 read model; the UI never queries Google Sheets directly.

## Source inventory

| Source | Populated rows | Import disposition |
|---|---:|---|
| Clients | 3 | Normalize and upsert Companies as customers. |
| Suppliers | 7 | Normalize and upsert Companies as suppliers. |
| Users | 4 | Reference only; do not overwrite Twenty membership, roles, or capabilities. |
| Documents | 24 | Stage into a correction ledger; import only rows with a uniquely matched source and verified type. |

## Safety rules

- Use a deterministic source key per row and upsert rather than blind create.
- Preserve the original sheet tab, row number, source filename, and import timestamp as provenance.
- Match existing Companies by verified CR first, then VAT, then normalized name; never merge on a
  partial name alone.
- Do not infer case stage, owner, due date, compliance state, financial finalization, or approval
  state from filenames.
- Do not import the Users tab as authorization truth.
- Do not split compound PDFs without page-level evidence and an explicit correction-ledger entry.
- Dry-run must report create/update/skip/conflict counts before any live write.
- Live execution requires a backup/rollback inventory and post-import duplicate checks.

## Nodes

| Node | Owner | Depends on | Deliverable | State |
|---|---|---|---|---|
| **MI0** | Codex | none | Re-read live sheet metadata and reconcile with the existing CC1 source audit. | **complete 2026-08-21** |
| **MI1** | Shahil + Codex | MI0 | Approve import scope: companies first; documents only when uniquely evidenced; users excluded. | **approved 2026-08-21** |
| **MI2** | Codex | MI1 | Versioned mapping manifest, normalization rules, deterministic source keys, and dry-run importer tests. | **complete in source 2026-08-21** |
| **MI3** | Claude | MI2 | Read-only pilot inventory and dry-run diff against live Companies/documents. | **complete 2026-08-24 — CREATE 10 / CONFLICT 0** |
| **MI4** | Claude | MI3 + explicit apply approval | Backup, execute idempotent import, verify counts/duplicates/provenance, retain rollback inventory. | **complete 2026-08-24 — 3 customers / 7 suppliers / zero duplicates / replay SKIP 10** |
| **MI5** | Codex | MI4 | Correction ledger, page-level verification, supported-record import with native source links, idempotent replay, and live health/integrity checks. | **complete 2026-08-24 — 4 documents / 4 attachments / replay SKIP** |

## Known document conflicts

- Three RFQs are represented only by missing filenames or channel text.
- Several rows have no source file.
- `MAB-INV-254 - Seyana.pdf` represents multiple document roles.
- `vendor invoices Al-sawaidi.pdf` contains six supplier invoices.
- `DBMS To MAB-DN01.pdf` combines delivery notes and certificates.
- The Al Shuwayer invoice filename differs between the sheet and local packet.

These rows remain staged until a human confirms the intended page/document boundaries.

## MI5 result and next development

All 24 rows now have a correction-ledger decision. Nineteen were matched to reviewed local
evidence; five are missing or channel-only. Four uniquely verified records supported by the current
Commercial Document contract were imported with native source attachments and an identical replay
created nothing. The other 20 remain held without type coercion.

The next ready node is **WF1 — Codex** in
`docs/execution/2026-08-24 - MAB operating workflow graph.md`: extend the typed source contract to
represent the full supplied MAB sequence from client RFQ through supplier comparison, quotation,
human-approved client PO, vendor procurement, delivery note, and customer invoice.
