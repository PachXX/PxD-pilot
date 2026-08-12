# CX2 — Vendor PO submission resilience

Date: 2026-08-12
Owner: Codex
State: **implemented; installed-app browser verification pending**

## Observed failure

During the first CX2 cloud browser pass, one valid Vendor PO submission remained in `Creating…` for
more than one minute. Both actions were disabled, no bounded failure appeared, and read-only database
verification showed that no command write occurred.

## Source findings

- The front component awaited `RestApiClient.post` without a signal or timeout.
- Cancel was disabled whenever `submitting` was true, leaving no user recovery path.
- `RestApiClient` throws `RestApiClientError` for non-2xx responses. The component's typed
  `if (!response.ok)` handling therefore did not receive normal 409/503 command errors; its generic
  catch incorrectly displayed the case/supplier loading error.
- The command-attempt ref already preserves the document ID and idempotency key for an unchanged
  request, making a bounded retry safe even when the client cannot know whether the first response
  was lost after the server committed.

## Repair

- Abort the POST after 30 seconds and show a specific bilingual timeout message.
- Keep Cancel enabled during submission; closing aborts the active request.
- Preserve the command-attempt identity on retry and label the next action `Retry creation`.
- Decode typed PashX error bodies carried by `RestApiClientError` and show the existing bilingual
  domain message.
- Separate load, submit, and timeout copy; localize the success snackbar.
- Bump the private installed app to `0.1.3` for the deployment handoff.

## Verification

| Gate | Result |
|---|---|
| Direct PashX app TypeScript | passed |
| PashX app oxlint | 0 warnings, 0 errors |
| oxfmt | passed |
| `git diff --check` | passed |
| Nx aggregate typecheck | environment-blocked in unrelated `twenty-ui:build`: shell could not locate `yarn` |
| Installed app browser and database | pending build/install of `0.1.3` |

## Cloud acceptance handoff

Build and install PashX MAB app `0.1.3`, then execute one submission from a fresh Procurement Case.
Accept when it either completes normally or leaves `Creating…` within 30 seconds with an actionable
localized status and enabled retry/cancel. A retry after an ambiguous timeout must reuse the same
idempotency identity and create at most one document/receipt/audit chain.
