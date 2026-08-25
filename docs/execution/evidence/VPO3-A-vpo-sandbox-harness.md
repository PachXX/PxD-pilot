# VPO3-A — sandbox QA harness for Vendor Purchase Order detail

- Date: 2026-08-25
- Owner: Claude QA harness lane (VPO3-A)
- BASE_SHA: `03d391db609afc805b5fc1756d344df1acc1e40c`
- Lane worktree: `/Users/pxd/PycharmProjects/ hallo world/twenty-vpo-claude`
  (branch `deepseek/vpo-claude`)
- Frozen scope: `VPO2-vendor-purchase-order-frozen-contract.md`
- Precedent: `packages/twenty-apps/pashx-mab/test/qv-sandbox-harness/`

## Harness design

Deliverables (all under the Claude lane's write authority, exact allowlist):

- `packages/twenty-apps/pashx-mab/test/vpo-sandbox-harness/run-vpo6-source-gates.sh`
- `packages/twenty-apps/pashx-mab/test/vpo-sandbox-harness/fixture-inventory-template.json`
- `packages/twenty-apps/pashx-mab/test/vpo-sandbox-harness/README.md`
- `docs/execution/evidence/VPO3-A-vpo-sandbox-harness.md` (this file)
- `docs/execution/evidence/VPO8-vpo-release-evidence-template.md`

No app features are implemented and no publish/install is attempted. The
harness only runs the locally-runnable gates from the frozen acceptance matrix
at VPO6, and it is the fixture inventory and cleanup proof home.

## Locally-runnable gates (VPO6 source side)

Run from the lane worktree root with the `bash -n`-verified runner:

1. `cd packages/twenty-apps/pashx-mab && yarn test` — full app suite green,
   including the new `vendor-purchase-order.*` specs.
2. `cd packages/pashx-mab-contract && yarn test` — contract suite green.
3. `cd packages/twenty-apps/pashx-mab && yarn twenty dev:build .` — official
   build.
4. oxlint on the VPO files (new detail-page files + D1/D2/D5 object/role/flag
   edits) — 0 warnings/errors.
5. `git diff --check` — clean.
6. Read-only source assertions on the vendor-purchase-order front component:
   no `fetch(`, no mutation imports, `target="_top"` native links present, no
   mockup values (Al Noor / Omar).
7. Fixture cleanup proof — captured IDs deleted, REST 404 + SQL zero-row +
   pre/post counts equal.

App `yarn typecheck` is NOT a gate in this runner (baseline parity with the QV
precedent); the VPO6-C evidence must show the new files add zero NEW errors.

## Role / permission matrix (frozen D5)

| Role | Request approval | Decide (approve/reject) | Cancel | Edit PO | Read page |
|---|---|---|---|---|---|
| PashX MAB Admin | ✓ | ✓ | ✓ | ✗ (D6 read-only drill-through) | ✓ |
| PashX MAB Operator | ✓ | ✓ | ✓ | ✗ | ✓ |
| Viewer | ✗ | ✗ | ✗ | ✗ | ✓ |
| Evidence Agent | ✗ | ✗ | ✗ | ✗ | ✓ |

Enforcement rules:

- Assigned-approver enforcement: the requester may not approve their own
  request (requester ≠ approver).
- Cross-user: acting on another user's request without authority fails closed.
- Cross-workspace: any read or write outside the owning workspace fails closed.
- Unauthorized requester/approver fails closed with a typed error and zero rows
  written.

### Second-identity requirement (never inferred)

The assigned-approver row and every cross-user row REQUIRE a second real
credentialed identity. If that identity is unavailable, those rows stay
**BLOCKED** — they are never inferred from source behavior or from a single
principal acting as both sides. This is a hard boundary of the frozen fixture
rule.

## Sanitized-fixture approach

- One fixture family `VPO-QA-DISPOSABLE-<run-id>`: one fictional supplier, one
  case, one PO, verified test lines, and only the approval records the matrix
  needs.
- Every UUID is captured immediately and registered in
  `fixture-inventory-template.json` before creation.
- Fixtures never mix with accepted pilot evidence (MI5 import, WF evidence).
- Cleanup by captured IDs with REST 404 + SQL zero-row + pre/post counts.

## Manual-only checks (honest boundary)

Per the DS6/QV precedent, these cannot be automated on this workstation and
remain human observations at VPO9: VoiceOver spoken output, exact native 200%
zoom, physical Tab order through the language switch and first evidence link.

## Lane topology and ports

- Claude QA lane runtime: port 2032 (`-vpo-claude`).
- Codex source lane runtime: port 2034 (`-vpo-codex`).
- Integration lane runtime: port 2036 (`-vpo-integration`).
- Containers are stopped after QA; no cross-lane `.env`, secrets, browser
  profiles or dumps.
