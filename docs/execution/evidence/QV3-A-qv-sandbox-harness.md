# QV3-A — sandbox QA harness for Quotation & Vendor Comparison

- Date: 2026-08-25
- Owner: Claude lane (executed by the DeepSeek harness as lane delegate after two
  subagent-stall interruptions; deviation recorded in the shared ledger)
- BASE_SHA: `26d55fde1a85a4a24f35898bc751a62832c04fcc`
- Lane worktree: `/Users/pxd/PycharmProjects/ hallo world/twenty-qv-claude`
  (branch `deepseek/qv-claude`)

## Harness design

Deliverables (all under the Claude lane's write authority):

- `packages/twenty-apps/pashx-mab/test/qv-sandbox-harness/run-qv6-source-gates.sh`
- `packages/twenty-apps/pashx-mab/test/qv-sandbox-harness/fixture-inventory-template.json`
- `packages/twenty-apps/pashx-mab/test/qv-sandbox-harness/README.md`
- `docs/execution/evidence/QV8-release-evidence-template.md`

## Locally-runnable gates (QV6 source side)

Run from the lane worktree root with `bash -n`-verified script:

1. `cd packages/twenty-apps/pashx-mab && yarn test` — full app suite green,
   including the new `vendor-comparison.*` specs.
2. `cd packages/pashx-mab-contract && yarn test` — contract suite green
   (identifier-uniqueness tests cover the new UUIDs).
3. `cd packages/twenty-apps/pashx-mab && yarn twenty dev:build .` — official build.
4. oxlint on the vendor-comparison files (0 warnings/errors).
5. `git diff --check` — clean.
6. Read-only source assertions — no `fetch(`, no mutation references,
   `target="_top"` native links present.
7. Fixture cleanup proof — captured fixture IDs deleted, absence verified, page
   reloaded and counts confirmed honest.

App `yarn typecheck` is NOT a gate (7 pre-existing baseline errors); the QV3-C
evidence must show the new files add zero NEW errors (targeted tsc or diffed
error list).

## Lane topology and ports

- Claude lane runtime: port 2022 (sandbox server); project names suffixed
  `-qv-claude`.
- Codex lane runtime: port 2024 (`-qv-codex`).
- Integration lane runtime: port 2026 (`-qv-integration`).
- Containers are stopped after QA; no cross-lane `.env`, secrets, browser
  profiles or dumps.

## Sanitized-fixture approach

- Only explicitly inventoried `QV6-QA-DISPOSABLE` records are created; every
  record is registered in `fixture-inventory-template.json` with its captured
  UUID before creation.
- Fixtures never mix with accepted pilot evidence (MI5 import, WF evidence).
- Cleanup proof: each ID deleted via the recorded command, absence verified
  (query by ID returns nothing), then the page is reloaded and the counts must
  be honest (no residual fixture rows).

## Manual-only checks (honest boundary)

Per the DS6 precedent, these cannot be automated on this workstation and remain
human observations at WF5/QV9: VoiceOver spoken output, exact native 200% zoom,
physical Tab order through the language switch and first evidence link.
