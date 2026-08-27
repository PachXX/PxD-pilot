# WF1 — MAB operating document and transition contract

- Date: 2026-08-24
- Owner: Codex
- State: **complete in source; not published or installed**
- Depends on: WF0 accepted MAB operating workflow

## Outcome

The shared contract and Twenty application manifest now represent the source roles required to
carry one Procurement Case through MAB's operating cycle without coercing unlike records into a
generic financial document.

### Explicit document roles

1. customer RFQ;
2. supplier RFQ and vendor quotation;
3. customer quotation;
4. customer purchase order;
5. vendor purchase order;
6. delivery note;
7. customer invoice.

Vendor invoice is also represented as supporting purchase-to-pay evidence. Existing customer and
vendor credit-note roles remain intact. The older generic `rfq` contract value remains for backward
compatibility, but the operating workflow uses only `customerRfq` and `supplierRfq` so direction is
never inferred from a filename.

## Transition invariants

| From | To | Required finalized evidence | Gate |
|---|---|---|---|
| Intake | Sourcing | Customer RFQ | none |
| Sourcing | Quoted | Vendor quotation + customer quotation | none |
| Quoted | Customer order | Customer purchase order | client-order verification |
| Customer order | Vendor order | Vendor purchase order | internal procurement approval |
| Vendor order | Delivery | Vendor purchase order | none |
| Delivery | Invoicing | Delivery note | none |
| Invoicing | Closed | Customer invoice | finance-posting approval |

Every primary transition and document finalization is human-owned. Evidence agents remain forbidden
from approving, finalizing documents, recording delivery, posting invoices, or changing compliance
state. Active stages may be cancelled; no skip, backward, closed-to-active, or cancelled-to-active
transition is authorized.

## Changed source

- `packages/pashx-mab-contract/src/operating-workflow.ts`
- `packages/pashx-mab-contract/src/domain.ts`
- `packages/pashx-mab-contract/src/metadata.ts`
- `packages/pashx-mab-contract/src/index.ts`
- `packages/pashx-mab-contract/test/operating-workflow.test.mjs`
- `packages/twenty-apps/pashx-mab/src/objects/commercial-document.object.ts`
- `packages/twenty-server/src/modules/pashx-mab/utils/pashx-manifest-value.util.ts`

## Verification

- `yarn workspace pashx-mab-contract test` — **18/18 pass**, 100% line/branch/function coverage.
- `yarn workspace pashx-mab test` — **51/51 pass**.
- `yarn workspace pashx-mab twenty dev:build` — manifest, application typecheck and package build
  pass; 18 files packaged.
- `yarn nx typecheck:ci twenty-server` — pass.
- `git diff --check` — pass.

## Boundary and next node

WF1 contains no endpoint, persistence command, live migration, version bump, publish, install, or
workflow-data mutation. **WF2 is ready:** implement permission-checked, idempotent, audited commands
that enforce this transition graph and its human approval gates transactionally.
