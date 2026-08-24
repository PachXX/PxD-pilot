# WF3 — native case workflow page (timeline, price comparison, delivery, invoice readiness)

- Date: 2026-08-25
- Owner: Codex, executed via the DeepSeek harness
- State: **complete in source; not published or installed**
- Depends on: WF2 idempotent workflow commands and the `deliveryStatus`/`deliveryDueAt` fields

## Outcome

WF3 ships the native read-only case timeline the operating graph calls for. One standalone
"Case workflow" page, surfaced from the native navigation drawer at position 2, renders for any
selected Procurement Case:

- the frozen WF1 stage rail, with the current stage marked and complete/upcoming stages derived
  from the case's own stage (a cancelled case marks only the cancellation marker);
- a deterministic supplier price comparison that ranks finalized vendor quotations ahead of
  drafts, then by ascending total (missing totals last), then by document reference;
- the delivery state (`deliveryStatus`, `deliveryDueAt`, finalized-vs-total delivery-note counts)
  sourced from the WF2 delivery fields; and
- invoice-readiness gates that derive exclusively from finalized evidence (customer purchase
  order, delivery note, customer invoice) and never from compliance state.

The page is read-only and evidence-linked: every case, document and supplier is a native
`/object/...` link with `target="_top"` drill-through and there are no write controls. It honours
the Evidence Ledger design language, is bilingual (English/Arabic with explicit RTL switching),
and preserves keyboard, screen-reader, 200%-zoom, dark-theme and reduced-motion foundations.

## Changed source

- `packages/pashx-mab-contract/src/metadata.ts` — `caseWorkflow` front-component, page-layout
  (`caseWorkflow`, `caseWorkflowOverviewTab`, `caseWorkflowWidget`) and navigation-menu-item
  identifiers (the WF2 delivery field/option identifiers live in the same file and are captured
  by the WF2 commit).
- `packages/twenty-apps/pashx-mab/src/case-workflow/` — `case-workflow.types.ts`,
  `case-workflow.model.ts` (stage rail, price comparison, delivery state, invoice readiness,
  deterministic amount/date formatting, record-href helpers), `load-case-workflow.ts` (bounded
  GraphQL loader with kebab/camel value normalizers and partial-page detection).
- `packages/twenty-apps/pashx-mab/src/front-components/case-workflow.copy.ts` (bilingual copy),
  `case-workflow.front-component.tsx`, `case-workflow.styles.ts`.
- `packages/twenty-apps/pashx-mab/src/page-layouts/case-workflow.page-layout.ts`
  (standalone page with one `FRONT_COMPONENT` widget).
- `packages/twenty-apps/pashx-mab/src/navigation-menu-items/case-workflow.navigation-menu-item.ts`.
- `packages/twenty-apps/pashx-mab/test/case-workflow-ui.test.ts` (16 specs).

## Verification

- `cd packages/twenty-apps/pashx-mab && yarn test` — **69/69 pass** (16 new case-workflow specs
  on top of the 53 pre-existing app specs).
- `cd packages/pashx-mab-contract && yarn test` — **26/26 pass**, 100% line/branch/function
  coverage. The WF2 evidence doc recorded 27/27; the authoritative top-level count is 26
  (18 pre-WF2 plus the 8 `workflow-commands` specs), coverage unchanged at 100%.
- `cd packages/twenty-apps/pashx-mab && yarn twenty dev:build .` — **✓ Build succeeded
  (20 files)**; manifest and application typecheck pass (the 18-file count in the WF1/WF2
  records grew to 20 with the case-workflow front-component bundle).
- `cd packages/twenty-apps/pashx-mab && yarn typecheck` — **fails with 7 pre-existing baseline
  errors unrelated to WF3**, all in files this node did not touch: `create-vendor-purchase-order.front-component.tsx`
  (2), `approval-request.object.ts` (1), `operational-insight.object.ts` (1), and the pre-existing
  option arrays of `procurement-case.object.ts` (3, lines 74/102/141 — outside the WF2
  `deliveryStatus`/`deliveryDueAt` additions). No case-workflow source emits a type error; these
  are reported separately and left for their owning lanes rather than fixed here.
- `git diff --check` — pass on the staged files.
- Integration suites are not re-run here (they require live infrastructure); the WF2 evidence doc
  records **14/14 suites, 109/109 assertions**.

## Boundary and next node

WF3 contains no publish, install, live-data mutation, or version bump — that remains WF4
(Claude). **WF4 stays assigned to Claude and blocked on the WF3-published state.** Visual parity
against the approved mockups is flagged for WF5 review alongside bilingual/RTL acceptance.
