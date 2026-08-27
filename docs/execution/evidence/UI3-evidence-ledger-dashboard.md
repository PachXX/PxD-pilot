# UI3 Evidence Ledger dashboard

- Date: 2026-08-14
- Owner: Codex
- State: complete in source
- Version: PxD MAB app `0.2.0`
- Scope: native Twenty read-only Operational profitability dashboard

## Result

UI3 implements the approved Evidence Ledger direction as a full-width native Twenty
`FRONT_COMPONENT` widget inside the existing Operational profitability dashboard page layout. It
renders only UI1 results; it contains no sample production totals, AI insight feed, parallel router,
or Command-centre expansion. No pilot deployment, live record, migration, or cloud resource changed.

The generated manifest links:

- standalone dashboard page layout `daf057bd-668a-4c8d-8c49-f5cff3b2b208` (`STANDALONE_PAGE`), as required by Twenty for a `PAGE_LAYOUT` navigation item;
- widget `54b0fb43-e678-4dc8-a0dd-2adc062fda26` (12 columns × 24 rows);
- front component `1e81794c-ebfb-42ce-9e5f-d8e07b9936c2`;
- built checksum `57db979b5359a1ca1c0b2b517bd14c10025ff66c6141d23af95b4e03a69d9650`.

## Implemented Evidence Ledger

- Period-start/end, case, customer, project, owner, and separate-currency filters.
- Concurrent selected-period and equal-duration prior-period reads using the bounded UI1 loader.
- One ruled KPI ledger for finalized revenue, direct cost, gross profit, and gross margin.
- Explicit prior-period comparisons; higher direct cost is treated as unfavorable and zero/nonpositive
  baselines are never converted into misleading percentages.
- Shared-scale monthly revenue/direct-cost SVG trend with an exact tabular equivalent.
- First-class evidence coverage with source/included/excluded counts and every exclusion reason shown
  separately; nothing is grouped as “other.”
- Deterministic revenue − direct cost = gross profit bridge.
- Ranked procurement-case contributors and source-record ledger with native record links.
- Visible as-of time, comparison duration, inclusion rules, and “no currency conversion” statement.
- Loading, empty, initial error, stale-snapshot refresh error, and partial-evidence foundations. UI4
  owns the bilingual/RTL, accessibility, and full state-acceptance hardening pass.

## Verification

- `yarn workspace pashx-mab test` — 9/9 tests pass (5 UI1 invariants + 4 UI3 model suites).
- `yarn workspace pashx-mab test:coverage` — UI1 aggregation remains at 100% statements, branches,
  functions, and lines.
- `yarn workspace pashx-mab test:ui3:coverage` — UI3 model: 94.37% lines, 83.45% branches,
  96.97% functions; enforced minimums are 90/80/90.
- `yarn workspace pashx-mab-contract test` — 9/9 tests pass; 100% line, branch, and function
  coverage.
- `yarn workspace pashx-mab exec oxlint -c .oxlintrc.json src test` — zero warnings and errors
  across 34 files.
- `yarn workspace pashx-mab-contract lint` — zero warnings and errors.
- `yarn workspace pashx-mab-contract build` — passes.
- `yarn workspace pashx-mab twenty dev:build .` — manifest generation, component build, and official
  builder typecheck pass; five application files are emitted.
- `yarn workspace pashx-mab typecheck` — no UI3 implementation diagnostic. The command remains
  nonzero only for 24 workspace-wide missing `twenty-sdk` declaration diagnostics (one is the new
  component's import of the same package) and the two previously recorded CX2 strict-null warnings.
- `git diff --check` — passes.

The repository does not expose a Prettier command, so no formatter-pass claim is made.

## Boundaries and handoff

- UI3 is complete in source, not deployed or visually accepted against the live pilot.
- UI4 is now ready for English/Arabic parity, true RTL, keyboard/focus/target checks, WCAG contrast,
  and full loading/empty/error/partial interaction acceptance.
- UI5 remains blocked on UI4 and owns the final `/plan-design-review` visual gate.
- Claude remains blocked on UI5 unless Codex explicitly requests an interim CL-I1 deployment.

## Source evidence

- `packages/twenty-apps/pashx-mab/src/front-components/operational-profitability-dashboard.front-component.tsx`
- `packages/twenty-apps/pashx-mab/src/front-components/operational-profitability-dashboard.styles.ts`
- `packages/twenty-apps/pashx-mab/src/profitability/operational-profitability-dashboard.model.ts`
- `packages/twenty-apps/pashx-mab/src/page-layouts/operational-profitability.page-layout.ts`
- `packages/twenty-apps/pashx-mab/test/operational-profitability-dashboard.model.test.ts`
- `packages/twenty-apps/pashx-mab/.twenty/output/manifest.json`
- `DESIGN.md`
