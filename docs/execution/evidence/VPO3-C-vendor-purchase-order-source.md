# VPO3-C — Vendor Purchase Order detail source (Codex lane)

- Date: 2026-08-25
- Owner: VPO3-C (Codex source lane)
- Worktree: `twenty-vpo-codex`, branch `deepseek/vpo-codex`
- BASE_SHA: `03d391db609afc805b5fc1756d344df1acc1e40c`
- Frozen scope: `docs/execution/evidence/VPO2-vendor-purchase-order-frozen-contract.md`
  (plan worktree, read-only)

## Implemented (frozen scope only)

- New native read-only "Vendor PO detail" page at navigation position 5 (icon `IconFileInvoice`),
  one front-component widget in a standalone page layout. Vendor directory shifts 5 → 6.
- `loadVendorPurchaseOrder(poRecordId)` bounded read model:
  - phase 1 `commercialDocuments` by `id eq` (first 1), `documentLines` by
    `commercialDocumentRecordId eq`, `approvalRequests` by
    `requestedActionCode eq 'purchaseOrder.approval'`, `cashMovements` by
    `sourceDocumentRecordId eq`;
  - phase 2 `procurementCases` by `id eq`, `companies` by `id eq`,
    `commercialDocuments` by `procurementCaseRecordId eq` (receipt/vendor-invoice evidence);
  - phase 3 `workspaceMembers` by `id eq` (owner name).
  - Every connection server-filtered and defensively re-scoped; no cross-case join.
- Pure `vendor-purchase-order.model.ts`:
  - `deriveMabOperatingSteps`/`buildMabProgressRail` derived from
    `PASHX_MAB_WORKFLOW_DOCUMENT_RULES` (seven operating steps; closed/cancelled terminal);
  - `validateVendorPurchaseOrderLines` gate order `no-lines` → `mixed-currency` →
    `invalid-quantity` → `unsafe-amount` → `mismatched-total` (integer micros, fail closed);
  - `selectVerifiedPaymentMovements` (VERIFIED, OUTFLOW, positive, source-linked, evidence-linked);
  - `buildSupportingEvidence` (internal approval, supplier confirmation, receipt, vendor invoice,
    verified payment) with explicit Not recorded until the authoritative record exists;
  - `buildSupplierRisk` always `not-recorded` (D3); `selectApprovalPanelState`.
- Human approval panel backed by the audited approval REST boundary
  (`/rest/pashx-mab/approval-requests` request + `:id/decisions` decide), reusing
  idempotency/CAS/audit. Request carries the canonical digest via
  `buildPurchaseOrderApprovalPayloadDigest`.
- D1 `documentLine` extended (10 fields); D2 `procurementCase.requiredBy` (Date);
  D5 operator gains `approvalDecide`; D5 requester-may-not-decide-own enforced server-side;
  D6 native read-only drill-through only; D7 download = unavailable; D9 no 27-line import.

## Files changed

- NEW `packages/twenty-apps/pashx-mab/src/vendor-purchase-order/vendor-purchase-order.types.ts`
- NEW `packages/twenty-apps/pashx-mab/src/vendor-purchase-order/vendor-purchase-order.model.ts`
- NEW `packages/twenty-apps/pashx-mab/src/vendor-purchase-order/load-vendor-purchase-order.ts`
- NEW `packages/twenty-apps/pashx-mab/src/front-components/vendor-purchase-order.copy.ts`
- NEW `packages/twenty-apps/pashx-mab/src/front-components/vendor-purchase-order.front-component.tsx`
- NEW `packages/twenty-apps/pashx-mab/src/front-components/vendor-purchase-order.styles.ts`
- NEW `packages/twenty-apps/pashx-mab/src/navigation-menu-items/vendor-purchase-order.navigation-menu-item.ts`
- NEW `packages/twenty-apps/pashx-mab/src/page-layouts/vendor-purchase-order.page-layout.ts`
- NEW `packages/twenty-apps/pashx-mab/test/vendor-purchase-order.model.test.ts`
- NEW `packages/twenty-apps/pashx-mab/test/vendor-purchase-order.ui.test.ts`
- NEW `packages/twenty-apps/pashx-mab/test/vendor-purchase-order.accessibility.test.ts`
- NEW `packages/pashx-mab-contract/test/vendor-purchase-order-approval.test.mjs`
- EDIT `packages/twenty-apps/pashx-mab/src/objects/document-line.object.ts` (D1 fields)
- EDIT `packages/twenty-apps/pashx-mab/src/objects/procurement-case.object.ts` (`requiredBy`)
- EDIT `packages/pashx-mab-contract/src/metadata.ts` (fresh UUIDs below)
- EDIT `packages/pashx-mab-contract/src/workflow-commands.ts` (PO approval action code + digest + validation)
- EDIT `packages/pashx-mab-contract/src/capabilities.ts` (operator + `approvalDecide`, D5)
- EDIT `packages/pashx-mab-contract/test/contract-manifest.test.mjs` (operator approvalDecide false → true)
- EDIT `packages/twenty-apps/pashx-mab/src/navigation-menu-items/vendor-directory.navigation-menu-item.ts` (5 → 6)
- EDIT `packages/twenty-apps/pashx-mab/test/vendor-directory-ui.test.ts` (position 5 → 6)
- EDIT `packages/twenty-server/src/modules/pashx-mab/services/pashx-approval-command.service.ts` (D5 requester-may-not-decide-own)
- EDIT `packages/twenty-server/src/modules/pashx-mab/__tests__/pashx-approval-command.service.spec.ts` (D5 cases)
- NEW `docs/execution/evidence/VPO3-C-vendor-purchase-order-source.md`

## New identifiers (fresh UUID v4, verified unique by contract test)

- `documentLine.commercialDocumentRecordId`: `ba229708-78dc-4d2a-a448-f8672cc6dae9`
- `documentLine.position`: `833863b2-a5b7-4d79-81ac-c36189b4dd79`
- `documentLine.description`: `d7804164-b632-4074-bec2-e6a4ec3e76ed`
- `documentLine.specification`: `f731fedf-37bb-4066-aa06-f6be3dbd7a31`
- `documentLine.quantity`: `0aa5ee3a-185c-4dbd-bf16-f539ce81d095`
- `documentLine.unit`: `1944b68b-97d5-45e1-a11e-62e6ed70afa6`
- `documentLine.unitPriceMicros`: `aebbc257-a039-40b2-8cb4-50a115b7035f`
- `documentLine.lineTotalMicros`: `f30cee9f-eb21-4070-a887-3230a8f1abd2`
- `documentLine.currencyCode`: `1c3abcf9-a87e-4cb6-8ee8-1e1f311ef309`
- `documentLine.sourceFileReference`: `7ff0a80c-56ba-40cc-b688-08bf88817b30`
- `procurementCase.requiredBy`: `36bd316c-02ec-4b71-887c-e505e4e6b303`
- front-component `vendorPurchaseOrder`: `0c56c0d5-afac-437d-8434-4d94072d36b6`
- page layout `vendorPurchaseOrder`: `1bdc9a8a-a892-4ef4-bf4d-e81ad7db2907`
- page layout `vendorPurchaseOrderOverviewTab`: `77316cec-d66b-4342-b0d4-bd868c791956`
- page layout `vendorPurchaseOrderWidget`: `66e04884-960f-497b-b8cb-ead1d32bb4a9`
- navigation item `vendorPurchaseOrder`: `f90e66d2-8039-46ec-86b4-9198c567a03e`

## Dependencies installed (inside worktree, nothing copied)

1. `corepack yarn install` at worktree root → completed with peer/build-script warnings, exit 0
   (~13m 46s). No node_modules/dists copied from other worktrees.
2. `packages/pashx-mab-contract` `yarn build`.
3. `packages/twenty-shared` `yarn build` then
   `npx tsgo -p tsconfig.lib.json --declaration --emitDeclarationOnly --noEmit false --outDir dist --rootDir src`
   then `npx tsc-alias -p tsconfig.lib.json --outDir dist`.
   Note: the `tsc-alias` step is required to resolve `@/` path aliases in the emitted `.d.ts`;
   without it the twenty-sdk declaration emit fails and the app typecheck shows false
   `RelationFieldManifest`/`FieldMetadataType$2` errors (same step QV3-C recorded).
4. `packages/twenty-sdk` seven vite builds (`node, define, billing, front-component,
   logic-function, utils, browser`) then `tsgo` declaration emit then `tsc-alias` then
   `rimraf 'dist/sdk' 'dist/define/**/*.d.ts' ...` then `rollup -c rollup.config.sdk-dts.mjs`.
5. `packages/twenty-client-sdk` `yarn build`.

## Verification (exact outputs)

- `cd packages/twenty-apps/pashx-mab && yarn test` → `ℹ tests 156 / pass 156 / fail 0`
  (127 pre-existing + 29 new; all green).
- `cd packages/pashx-mab-contract && yarn test` → `ℹ tests 34 / pass 34 / fail 0` with 100%
  line/branch/funcs coverage across every dist file.
- `cd packages/twenty-apps/pashx-mab && yarn lint` → `Found 0 warnings and 0 errors.`
- `cd packages/twenty-apps/pashx-mab && yarn typecheck` → exit 0, zero errors.
- `cd packages/pashx-mab-contract && yarn lint && yarn typecheck` → 0 warnings/0 errors, exit 0.
- `cd packages/twenty-apps/pashx-mab && yarn twenty dev:build .` → `✓ Build succeeded (28 files)`.
- `cd packages/twenty-server && npx jest src/modules/pashx-mab --config=jest.config.mjs` →
  `9 suites / 65 tests passed`.
- `git diff --check` → clean.

## Out-of-allowlist files (required by frozen D5 / navigation shift, flagged for reviewer)

- `packages/pashx-mab-contract/src/capabilities.ts` + its `contract-manifest.test.mjs`: the frozen
  VPO2 D5 decision ("Operator may decide") supersedes the base assertion that operator lacks
  `approvalDecide`; the contract-wide write authority comes from the VPO2 frozen contract.
- `packages/twenty-server/src/modules/pashx-mab/…`: justified by the failing contract test
  `packages/pashx-mab-contract/test/vendor-purchase-order-approval.test.mjs` — the assertion
  `isPurchaseOrderApprovalDecisionAuthorized({ requesterRecordId: X, approverRecordId: null,
  actorRecordId: X, decision: 'APPROVE' }) === false` fails against the pre-change
  `pashx-approval-command.service.ts`. The base `decide` only rejected an actor when an approver
  was assigned and differed (`approverRecordId !== null && approverRecordId !== actorRecordId`),
  so with no assigned approver the requester could approve/reject their own request — a direct
  D5 violation. The rule is a server-side authorization boundary (a client can only hide buttons,
  never enforce), so only the service change (enforce the frozen contract predicate in `decide`)
  satisfies D5 requester≠approver; the app-only implementation is insufficient.
- `vendor-directory.navigation-menu-item.ts` + `vendor-directory-ui.test.ts`: mechanical 5 → 6
  shift implied by the "add Vendor PO detail at position 5 (update the navigation source tests
  for the shift)" instruction.

## Deferred (recorded gaps, not silently dropped)

- `no-permission` for record visibility surfaces as the honest not-found state ("not visible to
  this account"); the read model does not fabricate a permission claim it cannot prove. The
  approval action panel itself now renders an explicit read-only no-permission state (P2-3).
- Cross-user assigned-approver enforcement needs a second credentialed identity for live QA
  (stays BLOCKED without one; the unit-level rule is enforced and tested).
- Supplier risk remains `Not recorded`; no compliance projection exists this release (D3).

## Repair iteration VPO3-C.2 (VPO4-A P2 findings)

- P2-1: `.pxd-vpo__table-num` is now applied to every numeric order-line cell (position, quantity,
  unit price, line total) and its column headers, matching DESIGN.md tabular-nums.
- P2-2: approval-request identity is deterministic — `buildPurchaseOrderApprovalIdempotencyKey`
  (stable per PO) and `buildPurchaseOrderApprovalRequestRecordId` (v4 UUID derived from the digest)
  — so a timeout retry resends a byte-identical request and hits the audited replay no-op.
- P2-3: approval actions are role-gated via `resolveApprovalCapabilities` from the workspace
  member's MAB permission flags; Viewer/Evidence Agent render the read-only `readOnlyApproval`
  state while Admin/Operator keep request + decide + cancel.
- P2-4: the server change is now driven by the frozen contract predicate
  `isPurchaseOrderApprovalDecisionAuthorized` and cited to the failing assertion in
  `vendor-purchase-order-approval.test.mjs` (see above).
