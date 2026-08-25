# VPO sandbox QA harness (Claude lane)

Read-only QA tooling for the PashX MAB Vendor Purchase Order detail track.
Lane-owned by the Claude QA harness lane (`deepseek/vpo-claude`). It never
imports production source as implementation and never touches the other lanes'
worktrees (`twenty-vpo-codex`, `twenty-vpo-integration`).

## Files

- `run-vpo6-source-gates.sh` — executes the locally-runnable acceptance gates
  from the frozen VPO2 matrix (app suite, contract suite, `twenty dev:build .`,
  oxlint on the VPO files, `git diff --check`, read-only source assertions on
  the vendor-purchase-order front component, fixture cleanup proof).
- `fixture-inventory-template.json` — sanitized-fixture inventory template.
  Every disposable record created during QA is registered here with its
  captured UUID and the `VPO-QA-DISPOSABLE-<run-id>` creator tag.

## Running the source gates

```bash
cd "/Users/pxd/PycharmProjects/ hallo world/twenty-vpo-claude"
bash packages/twenty-apps/pashx-mab/test/vpo-sandbox-harness/run-vpo6-source-gates.sh
```

With fixtures to clean up (space-separated UUIDs):

```bash
FIXTURE_IDS="uuid1 uuid2" bash packages/twenty-apps/pashx-mab/test/vpo-sandbox-harness/run-vpo6-source-gates.sh
```

The cleanup section contains a PLACEHOLDER deletion command — fill in the real
command for each record type before VPO6 execution. Deletions target
`VPO-QA-DISPOSABLE-<run-id>` records only, never accepted pilot evidence.

Do NOT run the source gates as authoring verification: they require
`node_modules` and Codex's VPO3-C source, which is VPO6-C's job. Authoring
verification is `bash -n` on the runner and `JSON.parse` on the template only.

## Lane isolation rules

- Containers and servers use lane-specific ports: claude 2032, codex 2034,
  integration 2036. Container project names must be lane-specific too
  (`-vpo-claude`, `-vpo-codex`, `-vpo-integration`).
- No `.env` files, secrets, browser profiles or database dumps are copied
  between lanes.
- Containers are stopped after QA (`docker compose down` with the lane's project
  name) and the fixture inventory is closed out with the cleanup proof.
- Stop-after-QA: this harness never publishes, installs, or deploys. Release
  authority is Shahil's separate VPO7 gate; VPO8 performs the release, never
  VPO6.

## The one-fixture-family rule

Mutation QA uses exactly one fixture family `VPO-QA-DISPOSABLE-<run-id>`
containing: one fictional supplier, one procurement case, one PO, verified test
lines, and only the approval records required by the matrix. No email, no
finalizing real evidence, no compliance change, no cash evidence, no touching
the accepted `MAB-PO-2026-4141` record. The real PO is read-only.

## Cleanup by captured IDs

Every fixture UUID is captured immediately at creation. Cleanup targets those
captured IDs only — never names or broad filters — and proves absence three
ways:

1. REST: the read endpoint for each ID returns 404.
2. SQL: the active-row query for each ID returns zero rows.
3. Pre/post counts: record the row count before fixture creation and after
   cleanup; they must be equal with no residual fixture rows.

Record all three in `fixture-inventory-template.json` under `cleanupProof`.

## Manual-only checks (honest boundary)

These cannot be automated on this workstation and remain human observations at
VPO9: VoiceOver spoken output, exact native 200% zoom (no clipping/scroll),
physical Tab order through the language switch and first evidence link.
