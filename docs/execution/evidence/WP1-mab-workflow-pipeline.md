# WP1 — MAB deals pipeline (Kanban deal tracking)

- Date: 2026-08-25
- Owner: Codex
- State: **complete in source; not published or installed**
- Branch: `codex/mab-workflow-pipeline`
- Base: QV integration `692d55ce8f`, plus MAB tenant branding `4da33761f9`

## Outcome

WP1 replaces the generic sales-opportunity mental model with a dedicated MAB operating pipeline.
The standalone native Kanban page tracks MAB deals through the deal-facing stage names requested
by Shahil:

1. RFQ Received
2. Quotation Requested from Vendor
3. Quotation Sent to Client
4. PO Approved from Client
5. PO Approved to Vendor
6. Delivery Note
7. Invoice

Each column is bound to the authoritative `procurementCase.stage` underneath (intake, sourcing,
quoted, customer-order, vendor-order, delivery, invoicing), so the deal-tracking names are a
display vocabulary, not a parallel state machine. Stage changes still go through the audited WF2
transition commands.

Closed and cancelled cases remain available behind an explicit archive toggle. Every card is built
from the role-scoped Procurement Case, Company and Commercial Document records already visible to
the authenticated user. Cards show the customer/project, next task, stage-specific due date,
blocked/compliance signals, finalized-versus-total document evidence and one named latest finalized
financial record with its exact stored amount. The page does not calculate or imply an unsupported
case total.

The board is bilingual (English/Arabic), explicitly RTL-aware, dark-theme aware, keyboard operable,
screen-reader structured and designed to reflow to one column at native 200% zoom. It uses the
bundled MAB Indus Solutions tenant logo and the existing PxD Evidence Ledger design language.

## Architectural boundary

Twenty's native Kanban view was deliberately not used for this page. The current operator/admin
roles can update Procurement Case records, so native card drag-and-drop could write `stage`
directly and bypass WF2's permission, approval, idempotency, audit and compare-and-swap transition
commands. WP1 is therefore a read-only Kanban-style board:

- case and evidence links drill into authoritative native records;
- no drag handlers or mutation calls exist in the component; and
- stage changes continue through the audited workflow command surface.

At deployment, the app-owned **MAB pipeline** drawer entry takes position 2, followed by **Case
workflow** at 3 and **Vendor comparison** at 4. The generic core **Opportunities** item cannot be
safely removed by this source-only app node; hiding it is an explicit workspace-administration step
for release QA, not a silent live mutation.

## Changed source

- `packages/pashx-mab-contract/src/metadata.ts` — stable front-component, page-layout, tab, widget
  and navigation identifiers.
- `packages/twenty-apps/pashx-mab/src/workflow-pipeline/` — bounded loader, deterministic card
  model, evidence selection and native record links.
- `packages/twenty-apps/pashx-mab/src/front-components/workflow-pipeline.*` — bilingual MAB board,
  tenant branding, loading/partial/error/empty states and responsive presentation.
- `packages/twenty-apps/pashx-mab/src/page-layouts/workflow-pipeline.page-layout.ts` — standalone
  page with one front-component widget.
- `packages/twenty-apps/pashx-mab/src/navigation-menu-items/workflow-pipeline.navigation-menu-item.ts`
  — native drawer entry.
- Case workflow and vendor-comparison navigation positions and their source tests were shifted by
  one to preserve deterministic ordering.
- `packages/twenty-apps/pashx-mab/test/workflow-pipeline.*.test.ts` — loader, model, evidence,
  read-only boundary, bilingual structure, keyboard, RTL, dark-theme and 200%-reflow checks.

## Verification

- `yarn workspace pashx-mab test` — **113/113 pass**.
- `yarn workspace pashx-mab-contract test` — **26/26 pass**, 100% line/branch/function coverage.
- `yarn workspace pashx-mab lint` — **0 warnings, 0 errors**.
- `yarn workspace pashx-mab twenty dev:build .` — **build succeeded (24 files)**; manifest and
  application bundle typecheck pass.
- `git diff --check` — pass.
- `yarn workspace pashx-mab typecheck` — the new workflow-pipeline files emit no errors. The
  package command remains blocked by the seven already-recorded baseline strictness errors in
  `create-vendor-purchase-order.front-component.tsx`, `approval-request.object.ts`,
  `operational-insight.object.ts` and the pre-existing option arrays in
  `procurement-case.object.ts`; WP1 did not modify those owners.

## Release boundary and next owner

No app version bump, publish, install, infrastructure change or live-data mutation is included.
After this source commit is reviewed, Claude owns the bounded release lane: bump from the currently
installed 0.2.13 to the next approved version, publish/install, confirm health and identity-preserving
upgrade, hide the generic Opportunities navigation item only with explicit workspace authority, and
run live role-scope/drill-through/English/Arabic/RTL/Tab/VoiceOver/exact-200% acceptance.
