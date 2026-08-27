# QV3-C — Vendor comparison source (Codex lane)

- Date: 2026-08-25
- Owner: QV3-C (Codex source lane)
- Worktree: `twenty-qv-codex`, branch `deepseek/qv-codex`
- BASE_SHA: `26d55fde1a85a4a24f35898bc751a62832c04fcc`
- Frozen scope: `docs/execution/evidence/QV2-vendor-comparison-frozen-scope.md` (integration worktree, read-only)

## Implemented (frozen scope only)

- New read-only page "Vendor comparison" at navigation position 3 (icon `IconScale` from the
  existing Twenty icon set), one front-component widget in a standalone page layout.
- Read-model `loadVendorComparison(caseId)`:
  - phase 1 `procurementCases` by `id eq` (first 1);
  - phase 2 `commercialDocuments` by `procurementCaseRecordId eq` (bounded limit, `pageInfo`
    → partial state), plus a defensive re-scope that drops any document whose
    `procurementCaseRecordId` differs from the requested case;
  - phase 3 `companies` by `id IN` derived supplier/customer ids.
  - All filters server-side; no cross-case or cross-workspace join.
- Pure `buildVendorComparisonRecommendation(finalizedQuotes, asOf)` with the frozen gate order:
  `no-finalized-quotes` → `mixed-currency` (currencies listed) → `missing-total` (refs listed) →
  `conflicting-supplier-quotes` (refs listed) → expired exclusion (counted and shown) →
  `all-expired` → `insufficient-comparable` → total-order ranking
  (`totalAmountMicros` asc → `leadTimeDays` asc with nulls last → reference asc → id asc).
  Payment terms displayed, never ordinally ranked. Formula and exclusions are static bilingual
  copy; no AI narration.
- Summary signals (displayed with formula): invited = distinct suppliers on finalized
  `supplierRfq`; responses = distinct suppliers on finalized `vendorQuote`; response deadline =
  `procurementCase.supplierResponseDeadlineAt`; price variance = (max−min)/min over finalized
  same-currency quotes when ≥2 else not applicable.
- Case header (client RFQ, due date, stage, evidence completeness derived counts),
  customer-quotation summary (finalized state, native drill-through, source linkage "none
  selected"), next-task/approval/compliance signals (read-only, native links).
- States: loading, empty (combined no-permission/empty honest copy), partial-evidence, conflict,
  error. Bilingual EN/AR with RTL switch, aria live regions, table semantics, 44px targets,
  contrast floors, reduced-motion, IBM Plex via public assets.

## Files changed

- NEW `packages/twenty-apps/pashx-mab/src/vendor-comparison/vendor-comparison.types.ts`
- NEW `packages/twenty-apps/pashx-mab/src/vendor-comparison/vendor-comparison.model.ts`
- NEW `packages/twenty-apps/pashx-mab/src/vendor-comparison/load-vendor-comparison.ts`
- NEW `packages/twenty-apps/pashx-mab/src/front-components/vendor-comparison.copy.ts`
- NEW `packages/twenty-apps/pashx-mab/src/front-components/vendor-comparison.front-component.tsx`
- NEW `packages/twenty-apps/pashx-mab/src/front-components/vendor-comparison.styles.ts`
- NEW `packages/twenty-apps/pashx-mab/src/navigation-menu-items/vendor-comparison.navigation-menu-item.ts`
- NEW `packages/twenty-apps/pashx-mab/src/page-layouts/vendor-comparison.page-layout.ts`
- NEW `packages/twenty-apps/pashx-mab/test/vendor-comparison.model.test.ts`
- NEW `packages/twenty-apps/pashx-mab/test/vendor-comparison.ui.test.ts`
- NEW `packages/twenty-apps/pashx-mab/test/vendor-comparison.accessibility.test.ts`
- EDIT `packages/twenty-apps/pashx-mab/src/objects/commercial-document.object.ts`
  (added `leadTimeDays` Number, `paymentTerms` Text, `validUntil` Date — additive only)
- EDIT `packages/twenty-apps/pashx-mab/src/objects/procurement-case.object.ts`
  (added `supplierResponseDeadlineAt` Date — additive only)
- EDIT `packages/pashx-mab-contract/src/metadata.ts` (fresh UUIDs below)
- NEW `docs/execution/evidence/QV3-C-vendor-comparison-source.md`

## New identifiers (fresh UUID v4, verified unique by contract test)

- `commercialDocument.leadTimeDays`: `c9b4daa8-8734-424c-9dd7-d49f28b71ff6`
- `commercialDocument.paymentTerms`: `aca372c0-089b-44ee-b871-04e85507c74f`
- `commercialDocument.validUntil`: `1d212108-8eb5-4449-bdc5-bf81cd0fd6d7`
- `procurementCase.supplierResponseDeadlineAt`: `cac02a45-571f-45ad-83af-413d83907b6f`
- front-component `vendorComparison`: `b4405431-752b-43ff-8c75-d1115b324dbe`
- page layout `vendorComparison`: `818ea2d1-777d-401b-a122-44c383dd68fb`
- page layout `vendorComparisonOverviewTab`: `45194dc2-6325-46b5-b930-544f00656c28`
- page layout `vendorComparisonWidget`: `7497e9c5-8beb-455a-a3f4-3772c73be9c6`
- navigation item `vendorComparison`: `4d87cab5-b423-47e5-ab4f-211ec7f689c1`

## Dependencies installed (inside worktree, nothing copied)

1. `corepack yarn install` at worktree root → completed with peer warnings, exit 0 (~5m 25s).
   No node_modules were copied from the primary worktree; no `.env` files touched.
2. `packages/pashx-mab-contract` `yarn build` (and `yarn test`, which rebuilds).
3. `packages/twenty-shared` full build (the package.json script only runs vite):
   `npx vite build` then
   `npx tsgo -p tsconfig.lib.json --declaration --emitDeclarationOnly --noEmit false --outDir dist --rootDir src`
   then `npx tsc-alias -p tsconfig.lib.json --outDir dist`.
4. `packages/twenty-client-sdk` `yarn build` (vite + metadata vite succeed; the tsgo step is
   re-run after twenty-shared declarations exist):
   `npx tsgo -p tsconfig.lib.json --declaration --emitDeclarationOnly --noEmit false --outDir dist --rootDir src`
   then `npx tsc-alias -p tsconfig.lib.json --outDir dist`.
5. `packages/twenty-sdk` full build: the seven vite submodule builds
   (`vite.config.{node,define,billing,front-component,logic-function,utils,browser}.ts`),
   then the same `tsgo` + `tsc-alias` declaration steps, then
   `npx rollup -c rollup.config.sdk-dts.mjs` for `define/front-component/billing/logic-function/utils` d.ts.

These extra builds are runtime/declaration prerequisites for the app's own `yarn test`,
`yarn twenty dev:build .` and `yarn typecheck`; they produce only gitignored `dist/` artifacts.

## Verification (exact outputs)

### `cd packages/twenty-apps/pashx-mab && yarn test`
`ℹ tests 98 / pass 98 / fail 0 / cancelled 0 / skipped 0` — all green including the three new files.

### `cd packages/pashx-mab-contract && yarn test`
`ℹ pass 26 / fail 0` with coverage `100.00 % line / branch / funcs` across every dist file
(including `metadata.js`). The identifier-uniqueness tests pass with the nine new UUIDs.

### `cd packages/twenty-apps/pashx-mab && yarn twenty dev:build .`
`✓ Build succeeded (21 files)` → `.twenty/output`.

### oxlint (new and edited files)
- pashx-mab (13 files, both oxlintrc configs): `Found 0 warnings and 0 errors.`
- contract `src/metadata.ts`: `Found 0 warnings and 0 errors.`

### `git diff --check`
Clean (no whitespace errors).

### Typecheck (NOT a gate — baseline is 7 pre-existing errors)
`yarn typecheck` reports exactly **7** errors, all pre-existing and none in vendor-comparison
files:
- `create-vendor-purchase-order.front-component.tsx(32,15)` and `(33,15)`
- `approval-request.object.ts(38,7)`
- `operational-insight.object.ts(24,7)`
- `procurement-case.object.ts(74,7)`, `(102,7)`, `(141,7)`

Zero new errors from vendor-comparison source or the additive object edits.

### Read-only proof (asserted in UI test)
`vendor-comparison.ui.test.ts` asserts the component source contains no `fetch(`, no
`RestApiClient`, no `mutat`/`mutation`, and uses native `target="_top"` links.

## Deferred (recorded gaps, not silently dropped)

- customerQuote → source-vendorQuote linkage (summary shows "none selected").
- source-attachment presence column (native drill-through satisfies "source-evidence link").
- payment-terms ordinal vocabulary (terms are display-only).
