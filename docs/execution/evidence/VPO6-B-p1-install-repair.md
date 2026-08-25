# VPO6-B — VPO6-A P1 install repair (DeepSeek lane)

- Node: VPO6-B
- Owner: DeepSeek lane (deepseek/vpo6-p1-fix, based on deepseek/vpo-integration)
- BASE_SHA (integration): `c5e59900bb`
- Date: 2026-08-25
- Precondition: VPO6-A isolated live QA (commit `1fc6f41764`, branch
  `deepseek/vpo-claude`) recorded **BLOCKED** at the app-install step with three
  install errors and two P1 root causes, both Codex-owned, in
  `packages/twenty-apps/pashx-mab/src/objects/document-line.object.ts`.

## Decision (Shahil-approved, 2026-08-25)

- **P1-1** — `quantity` switches from `FieldType.NUMERIC` to `FieldType.NUMBER`.
  The metadata engine deliberately rejects `NUMERIC` field creation for custom
  apps (`rejectUserCreation` in
  `packages/twenty-server/src/engine/metadata-modules/flat-field-metadata/services/flat-field-metadata-type-validator.service.ts`:
  "Field type NUMERIC is not supported for field creation. Use NUMBER instead."),
  so re-enabling server support would reverse platform policy with wide blast
  radius. `NUMBER` maps to a float64 column
  (`field-metadata-type-to-column-type.util.ts`: `NUMBER` → `float`), so decimal
  quantities remain representable; money stays in integer micros. The frozen D1
  line-validation gate (`quantity × unitPriceMicros`, rounded to integer micros)
  is unaffected — its unit suite stays green.
- **P1-2** — the `position` field is renamed to **`linePosition`**.
  `position` is one of the engine-reserved system fields provisioned on every
  object (`buildReservedSystemFlatFieldMetadatasForCustomObject`: id, createdAt,
  updatedAt, deletedAt, createdBy, updatedBy, position), so no app may declare a
  field with that name (`NOT_AVAILABLE`). The field's **universal identifier is
  unchanged** (`833863b2-a5b7-4d79-81ac-c36189b4dd79`), so the engine's
  auto-generated INDEX view field (the P1-3 cascade error) resolves against the
  same identifier once the field creates.
- **P1-3** — cascade of P1-2 (`INVALID_VIEW_DATA: Field metadata not found`);
  no independent defect.

## Files changed

- `packages/twenty-apps/pashx-mab/src/objects/document-line.object.ts` —
  `quantity` → `type: FieldType.NUMBER`; `position` field → `name: 'linePosition'`
  (identifier key `documentLine.linePosition`).
- `packages/pashx-mab-contract/src/metadata.ts` — identifier map key
  `documentLine.position` → `documentLine.linePosition` (value unchanged).
- `packages/twenty-apps/pashx-mab/src/vendor-purchase-order/load-vendor-purchase-order.ts`
  — GraphQL selection and `LineNode`/record mapping use `linePosition`.
- `packages/twenty-apps/pashx-mab/src/vendor-purchase-order/vendor-purchase-order.types.ts`
  — `VendorPurchaseOrderLineRecord.linePosition`.
- `packages/twenty-apps/pashx-mab/src/vendor-purchase-order/vendor-purchase-order.model.ts`
  — `line.linePosition` in the three validation gates.
- `packages/twenty-apps/pashx-mab/src/front-components/vendor-purchase-order.front-component.tsx`
  — render `line.linePosition`.
- `packages/twenty-apps/pashx-mab/test/vendor-purchase-order.model.test.ts`,
  `packages/twenty-apps/pashx-mab/test/vendor-purchase-order.ui.test.ts` —
  line-record fixtures use `linePosition`.
- `packages/twenty-apps/pashx-mab/package.json` — app version `0.2.14` → `0.2.15`
  so the fixed manifest is distinguishable from the blocked install.

## Gates run (source-level; no live install per VPO7 authority)

- App suite: **161/161** pass (`yarn test`, incl. vendor-purchase-order specs).
- Contract suite: **35/35 @100%** line/branch/funcs (`yarn test` rebuilds dist).
- App typecheck: **0 errors**.
- oxlint on changed files: **0 warnings / 0 errors** (5 pre-existing errors in
  untouched test files remain; unchanged from baseline).
- `git diff --check`: clean.
- Official app build (`yarn twenty dev:build .`): **✓ Build succeeded (28 files)**.
- Built manifest verified: `documentLine.linePosition` → `NUMBER`
  (`833863b2-a5b7-4d79-81ac-c36189b4dd79`) and `documentLine.quantity` →
  `NUMBER` (`0aa5ee3a-185c-4dbd-bf16-f539ce81d095`); no `position` field and no
  `NUMERIC` anywhere in the manifest.

## Remaining (not run here — QA-lane and release authority)

- Re-run VPO6-A isolated live QA (app publish + install on a fresh disposable
  stack) to execute the full command matrix (Scenarios A–C), create fixtures,
  and unblock the assigned-approver / cross-user rows.
- VPO6-C gate blind spot noted in VPO6-A: `dev:build` never runs the server's
  metadata install validator, so install-time failures surface only in live QA;
  that observation stands and is not repaired by this change.

## Risks

- `quantity` as float64 is approximate (never exact `numeric`); acceptable for
  PO line quantities, and all money remains exact integer micros.
- Any workspace that installed `documentLine` with a `position` field under a
  different identifier is unaffected (identifier unchanged); no such install
  exists (VPO6-A install never succeeded).
