# CX4-d — app-dev runtime dependency packaging

Date: 2026-08-12
Owner: Codex
State: **complete**

## Failure

PR 1 run `31528620461`, job `test-app-dev`, built the `twenty-app-dev` image but the container
never became healthy. Its initialization process failed with:

```text
Error: Cannot find module 'pashx-mab-contract'
Require stack:
- /app/packages/twenty-server/dist/modules/pashx-mab/controllers/pashx-vendor-purchase-order.controller.js
```

The server, unit, and integration CI gates passed because their environments retained the complete
workspace. The app-dev runtime target is assembled independently.

## Root cause and repair

`server-deps` focused `pashx-mab-contract`, and the production `twenty-server` image copied its
manifest and compiled `dist`. The separate `twenty-app-dev` target copied the focused root
`node_modules` workspace link but omitted the link target at `/app/packages/pashx-mab-contract`.

The app-dev target now copies the contract manifest and compiled output from `twenty-server-build`.
The Docker workflow also resolves and loads the contract in a one-shot container before starting the
all-in-one services, converting this failure mode from a five-minute health timeout into an immediate
packaging assertion.

## Verification

| Gate | Result |
|---|---|
| Workflow Prettier | passed |
| Workflow YAML parse | passed |
| Contract TypeScript build | passed |
| Local Node runtime resolution/load | passed |
| `git diff --check` | passed |
| Local Docker image boot | unavailable; Docker daemon is not running |
| GitHub `test-app-dev` | passed: build, contract assertion, container start, health |

The fork's preview-dispatch failure is separate: the upstream Twenty GitHub App client ID is not
available in the fork. It does not exercise application or image behavior.

## Delivery

- Commit: `74807292b7`
- GitHub workflow: `CI Docker` run `31589840301`
- App-dev job: `94092089257`, passed
