# UI1 profitability data contract and aggregation evidence

- Date: 2026-08-14
- Owner: Codex
- State: complete
- Scope: read-only Operational profitability dashboard, decision 15A

## Result

Shahil approved the minimum metadata extension and the proposed margin, credit, and ZATCA rules on
2026-08-14. UI1 now provides the typed, bounded read layer and deterministic aggregation required by
the read-only Operational profitability dashboard. No pilot deployment, live record, database
migration, or cloud resource was changed by this node.

## Implemented contract

- `commercialDocument` now declares a Currency total, customer invoice/customer credit/vendor
  credit types, finalized/cancelled/credited lifecycle states, and an explicit compliance state.
- `expense` now declares a Currency amount, approval state, procurement-case relation, and incurred
  date.
- `procurementCase` now declares customer, project, and owner reporting dimensions.
- The server manifest mapper recognizes the added contract values; metadata UUID ownership remains
  centralized in `packages/pashx-mab-contract`.
- The loader reads only the fields needed by the aggregation, requests at most 1,000 records per
  connection, and fails explicitly if a result would be truncated instead of presenting incomplete
  totals as authoritative.

## Frozen calculation rules

- Finalized customer invoices increase revenue; finalized customer credit notes reduce it.
- Finalized vendor purchase orders and approved direct expenses increase direct cost; finalized
  vendor credit notes reduce it.
- Draft, cancelled, and credited originals; unapproved expenses; compliance-pending/rejected
  customer documents; invalid amounts; missing dates; and records outside the selected filters are
  excluded and counted by reason.
- Currency totals are never combined. Amount validation uses the contract's safe-integer micros
  boundary and calculation uses BigInt internally.
- Gross profit is revenue minus direct cost. Margin rounds half away from zero to one basis point;
  zero revenue produces `null` (`not applicable`), never `0%` or infinity.
- Outputs contain source-level contributions and case/customer/project/owner/period breakdowns so
  UI3 can show provenance and drill-through without recomputing financial logic.

## Verification

- `yarn workspace pashx-mab test` — 5/5 aggregation invariant tests pass.
- `yarn workspace pashx-mab test:coverage` — 100% statements, branches, functions, and lines for
  the aggregation implementation.
- `yarn workspace pashx-mab-contract test` — 9/9 tests pass; 100% line, branch, and function
  coverage across the built contract.
- `yarn workspace pashx-mab lint` — zero warnings and zero errors.
- `yarn workspace pashx-mab-contract lint` — zero warnings and zero errors.
- `yarn workspace pashx-mab-contract build` — passes.
- `yarn workspace pashx-mab twenty dev:build .` — manifest generation, application build, and
  builder typecheck pass.
- `yarn workspace pashx-mab typecheck` — no diagnostic in `src/profitability`; the aggregate app
  command remains nonzero only for 23 pre-existing missing `twenty-sdk` declaration diagnostics
  and two pre-existing CX2 front-component strict-null diagnostics. The official builder is the
  authoritative app gate and passes.

The tests cover mixed revenue/cost/credit inputs, multiple currencies, every explicit exclusion,
all five reporting filters, positive and negative half-away rounding, zero-revenue handling, and an
empty source set.

## Evidence

- `packages/twenty-apps/pashx-mab/src/objects/*.object.ts`
- `packages/twenty-apps/pashx-mab/src/profitability/*.ts`
- `packages/twenty-apps/pashx-mab/test/aggregate-operational-profitability.test.ts`
- `packages/pashx-mab-contract/src/domain.ts`
- `packages/pashx-mab-contract/src/metadata.ts`
- `packages/pashx-mab-contract/src/money.ts`
- `DESIGN.md`, approved Evidence Ledger implementation contract
- `docs/architecture/Architecture Overview.md`, read model boundary
- `docs/execution/2026-08-14 - post-SG interface graph.md`, node state and scope boundary
