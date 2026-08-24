# QV sandbox QA harness (Claude lane)

Read-only QA tooling for the PashX MAB Quotation & Vendor Comparison track.
Lane-owned by the Claude harness lane (`deepseek/qv-claude`). It never imports
production source as implementation and never touches the other lanes' worktrees.

## Files

- `run-qv6-source-gates.sh` — executes the locally-runnable acceptance gates from
  the frozen QV2 matrix (app suite, contract suite, `twenty dev:build`, oxlint on
  the vendor-comparison files, `git diff --check`, read-only source assertions,
  fixture cleanup proof).
- `fixture-inventory-template.json` — sanitized-fixture inventory template. Every
  disposable record created during QA is registered here with its captured UUID.

## Running the source gates

```bash
cd /Users/pxd/PycharmProjects/ hallo world/twenty-qv-claude
bash packages/twenty-apps/pashx-mab/test/qv-sandbox-harness/run-qv6-source-gates.sh
```

With fixtures to clean up (space-separated UUIDs):

```bash
FIXTURE_IDS="uuid1 uuid2" bash packages/twenty-apps/pashx-mab/test/qv-sandbox-harness/run-qv6-source-gates.sh
```

The cleanup section contains a PLACEHOLDER deletion command — fill in the real
command for the record type before QV6 execution. Deletions target
`QV6-QA-DISPOSABLE` records only, never accepted pilot evidence.

## Lane isolation rules

- Containers and servers use lane-specific ports: claude 2022, codex 2024,
  integration 2026. Project names must be lane-specific too.
- No `.env` files, secrets, browser profiles or database dumps are copied between
  lanes.
- Containers are stopped after QA (`docker compose down` with the lane's project
  name) and the fixture inventory is closed out with the cleanup proof.
- Manual-only checks (not automatable here): VoiceOver speech output, exact native
  200% zoom, physical Tab order — these follow the DS6 precedent and require a
  human operator.
