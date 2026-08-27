# MI3 / MI4 metadata Company import evidence

- Date: 2026-08-24
- Workspace: PxD MAB pilot (`160a3718-ce23-4150-9142-4e7ddd8b8850`)
- Source: approved `Meta information - Demo` manifest
- Scope: Companies only; Users excluded; all document rows remain staged

## MI3 read-only dry run

The live Company inventory was exported with `id`, `name`, CR, VAT, metadata source key, and MAB
business roles. The deterministic planner returned:

```text
CREATE=10 UPDATE=0 SKIP=0 CONFLICT=0
```

The pre-import rollback inventory is
`docs/execution/evidence/MI3-existing-companies-2026-08-24.json`.

## MI4 apply

The previously approved MI4 gate was exercised only after the clean MI3 result. Twenty's
authenticated batch record API created ten Companies from the versioned manifest:

- 3 customers
- 7 suppliers
- 10 stable `mab-meta:*` source keys
- CR on all 10 records
- VAT only where supplied by the source

The exact request payload is
`docs/execution/evidence/MI4-company-import-payload-2026-08-24.json`. The returned record IDs and
rollback inventory are in
`docs/execution/evidence/MI4-created-companies-2026-08-24.json`.

## Post-import verification

```text
imported_count|10
customer_count|3
supplier_count|7
duplicate_source_keys|0
duplicate_crs|0
duplicate_vats|0
audit_actor|shahil mohideen|10
```

An identical second deterministic plan returned:

```text
CREATE=0 UPDATE=0 SKIP=10 CONFLICT=0
```

This demonstrates idempotent matching for the accepted Company scope.

## Intentionally excluded

- The four Users rows were not imported or used to modify workspace membership, roles, or
  capabilities.
- All 24 document rows remain staged. Only 17 local files exist; three RFQs have no source file,
  several references differ from local filenames, and multiple PDFs contain compound document
  roles. The live Commercial Document contract also requires authoritative type, lifecycle,
  amount/date/case data that cannot be safely inferred from filenames.
- No dummy financial records, approvals, compliance decisions, or workflow states were created.

