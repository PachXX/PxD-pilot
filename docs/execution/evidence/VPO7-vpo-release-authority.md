# VPO7 — Vendor Purchase Order detail: release and live-fixture authority

- Node: VPO7
- Owner: Shahil (product authority)
- Date: 2026-08-26
- Recorded by: DeepSeek Harness (Claude lane)
- Governing graph: `docs/execution/2026-08-25 - vendor-purchase-order detail parallel harness graph.md`

## Authority granted

Shahil granted **explicit, separate release authority** (VPO7 gate) for the Vendor
Purchase Order detail track on 2026-08-26, after reviewing the VPO6 evidence:

- **VPO6-A** (isolated live QA, `1fc6f41764`) — BLOCKED at app install by two P1
  Codex-owned metadata defects; everything not depending on install passed
  (D5 fail-closed 403, typed validation 400, D9 real-PO absence, zero fixtures,
  clean QA-DB drop).
- **VPO6-B** (install repair, `c686ee33e4`) — `quantity` `NUMERIC` → `NUMBER`
  (float64 keeps decimals; D1 money gate intact), `position` → `linePosition`
  (engine-reserved name; universal identifier unchanged). Gates: app 161/161,
  contract 35/35 @100%, typecheck 0, oxlint 0, build 28 files, manifest verifies
  both fields as `NUMBER`. App version 0.2.14 → 0.2.15.

### Authorized actions

1. **Private publish + install** of the pashx-mab app on the pilot host
   (`https://mab.pashx.com`), version resolved at runtime (0.2.17 — 0.2.16 was
   already taken by the parallel overview release).
2. **Bounded live-fixture authorization** for VPO9 QA, restricted to exactly one
   fixture family per run prefixed `VPO-QA-DISPOSABLE-<run-id>`: one fictional
   supplier, one case, one PO, verified test lines, and only the approval records
   required by the matrix. Every UUID captured immediately; cleanup by captured
   IDs with REST 404 + SQL zero-row proof.

### Explicitly NOT authorized

- Email/OCR access, pilot data mutation beyond the disposable fixture family,
  infrastructure changes, or server/renderer deltas without a separate host-build
  authority (the concurrent company-identity lane's host rebuild ran under its own
  lane's authority, not this gate).
- Claiming VPO9 acceptance or any node verdict without the machine-readable
  handoff block.

## Outcome

- Authority used 2026-08-26: pashx-mab **0.2.17** published and installed on the
  pilot at 13:37 UTC (parallel lane executed the same release from the same source;
  installed artifact verified byte-identical — see `VPO8-vpo-release-evidence.md`).
- VPO9 fixture authorization remains OPEN and is granted only for the disposable
  family described above.
