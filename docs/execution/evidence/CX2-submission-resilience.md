# CX2 — Vendor PO submission resilience

Date: 2026-08-12
Owner: Codex
State: **passed on deployed app 0.1.11 and host digest `fbe0ae9e5917…`**

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
| Installed app `0.1.3` browser | failed: `Creating…` persisted beyond 39 seconds |
| Installed app `0.1.4` publish/install | passed against `pashx-pilot` on 2026-08-13 |
| Installed app `0.1.4` browser | failed: `Creating…` persisted beyond 40 seconds |
| Installed app database cardinality | pending; do not retry either ambiguous cloud attempt blindly |

## CX2-R cloud result — 2026-08-13

App `0.1.3` was exercised from fresh Procurement Case
`673e42af-b5d6-4d36-b222-38f70127b3b6` (`CX2-R 2026-08-13`) against supplier
`PashX Supplier CL2`. Required-supplier validation failed closed, both footer controls measured
44 px high, and Cancel remained enabled during submission. The command nevertheless remained in
`Creating…` for more than 39 seconds, so CX2-R failed its bounded-outcome criterion.

Root cause: front components proxy same-origin requests through the host-fetch bridge. That bridge
serializes URL, method, headers, and body but not `AbortSignal`; therefore the component's timer
called `abort()` after 30 seconds without settling the bridged request promise. The UI could remain
pending indefinitely even though the abort signal itself was set.

App `0.1.4` races the request against an explicitly rejecting timeout promise and retains abort as
best-effort cancellation. This keeps the fix inside the pilot component instead of changing the
shared host-fetch protocol during acceptance. Direct oxlint passes with zero warnings/errors;
aggregate Nx typecheck remains blocked by the pre-existing `twenty-ui:build` shell dependency on a
missing `yarn` executable. Publish/install `0.1.4`, then repeat this same fresh-case boundary and
read-only cardinality verification before closing CX2-R.

## Cloud acceptance handoff

Build and install PashX MAB app `0.1.4`, then execute one submission from a fresh Procurement Case.
Accept when it either completes normally or leaves `Creating…` within 30 seconds with an actionable
localized status and enabled retry/cancel. A retry after an ambiguous timeout must reuse the same
idempotency identity and create at most one document/receipt/audit chain.

## CX2-R cloud result — app 0.1.4

The private app publisher built, uploaded, and installed `pashx-mab` `0.1.4` successfully on the
`pashx-pilot` remote. A fresh browser session loaded the updated compiled bundle; inspection of that
bundle confirmed the explicit `Promise.race`, 30,000 ms rejecting timeout, abort call, typed error
copy, and retry state were all present.

One initial submission from case `673e42af-b5d6-4d36-b222-38f70127b3b6`, supplier
`PashX Supplier Final`, and vendor reference `CX2-R-014` still displayed `Creating…` beyond 40
seconds. Cancel remained enabled and closed the panel. The app-local timeout therefore does not
execute while the bridged REST request is pending; the host-fetch call appears to starve or block the
front-component worker event loop, rather than merely discarding the abort signal.

Do not publish another timer variant. The next repair must instrument the shared host-fetch and
server request boundary, determine whether the POST reaches Nest, and enforce a bounded settlement
outside the blocked front-component worker. Before any retry, use read-only Cloud SQL evidence to
determine whether either ambiguous attempt committed and to preserve the at-most-one invariant.

## Host-boundary repair

The installed app metadata was verified in the pilot UI as Current `0.1.4` and Latest `0.1.4`.
Because Cancel remained responsive during the failed submission, the worker was not wholly blocked;
the original app-local timeout nevertheless did not produce a bounded result. The shared host-fetch
policy now dispatches browser fetch immediately, races it against a 30-second host-thread deadline,
aborts it best-effort, and returns the clonable `FRONT_COMPONENT_HOST_FETCH_TIMEOUT` error. PashX
maps that code to its existing bilingual actionable timeout copy. A focused regression test proves a
POST is dispatched before a never-settling fetch rejects and its host signal becomes aborted.

The app version is `0.1.5`. This repair changes the host application bundle as well as the private
app, so CX2-R remains blocked until a new immutable host image is deployed and app `0.1.5` is
published/installed.

## CX2-R cloud result — app 0.1.5 / corrected host image

Cloud Build `795bfa22-ad02-40f8-82d2-098a09cf1491` succeeded and Terraform deployed immutable
image digest `sha256:222323b976ec67ef96dbdcb4d2c996051b9c954e30be6ad8c28dbf3b6efaddb2`.
The replacement VM reached `/healthz` 200, and the running container's
`FrontComponentRenderer-BTRvIK23.js` contains `FRONT_COMPONENT_HOST_FETCH_TIMEOUT`, proving the
shared repair is present in production.

One and only one submission was made at `2026-08-13T20:14:25.362Z` from fresh case
`0b3cbd2d-6caf-429e-8c3e-74a767142a31`, supplier `PashX Supplier Final`, vendor reference
`CX2-R-016`. Required-supplier validation failed closed before the form was completed. The valid
submission remained `Creating…` beyond 47 seconds. Read-only database verification returned
`case_version=0`, `documents=0`, `receipts=0`, and `audits=0`; server and Caddy logs contained no
request in the submission window.

This falsifies the earlier assumption that adding a deadline inside the host fetch implementation
would make the UI bounded. Evidence still places the failure before the Nest controller and before
any transaction, now more narrowly at or before the worker-to-host `hostFetch` RPC dispatch. Do not
retry `CX2-R-016`: no acceptance retry is allowed until that bridge boundary is instrumented or
repaired and a new fresh case is used.

## Continued isolation — apps 0.1.6 through 0.1.8

Three progressively narrower experiments were published, installed, and exercised on fresh cases:

- `0.1.6` deferred `submit()` to a new macrotask after the remote click callback.
- `0.1.7` replaced `RestApiClient` with an explicit authenticated JSON `fetch`.
- `0.1.8` moved command dispatch out of the click lifecycle into a post-render React effect.

All publisher builds and typechecks passed. Each experiment still remained in `Creating…`, including
case `6c918f5b-f4c7-473d-915c-8e99cc877701` / reference `CX2-R-020` on `0.1.8`. The earlier `0.1.6`
case had read-only cardinality `case_version=0`, `documents=0`, `receipts=0`, `audits=0`.
These results rule out the app-local promise wrapper, `RestApiClient`, and direct remote-click
re-entrancy as independent causes. CX2-R remains failed; do not claim its traffic is available to
the monitoring drill until the shared transport is repaired and database cardinality proves a real
command committed.

## CX2-R final acceptance — 2026-08-14

The shared renderer now supplies front components with a dedicated native `MessagePort` fetch
channel and excludes the native API from the generic synchronous host proxy. App `0.1.11` also
constructs and dispatches the command before the first remote React state flush and uses a
`crypto.getRandomValues` UUID implementation supported by the sandbox. The immutable host image
deployed to the pilot is `sha256:fbe0ae9e5917ab1c89ce67a4773cfe8efa058f03e439f0b31facee0b618047e7`.

The first bounded response after that repair was the typed authorization error “Your role does not
allow this action.” This proved the POST reached Nest and exposed a separate installation gap: the
installed `pashx.procurement.issue` permission flag existed but was not assigned to Shahil's Admin
role. The single missing role-permission assignment was added and the application services were
restarted to flush metadata caches.

Using source PO `MAB-PO-2026-4141 - DBMSC`, the browser selected supplier `Steel and Metal Solution
Trading Company`, currency `SAR`, and vendor reference `MAB-PO-2026-4141` on fresh disposable case
`14e6b407-9c8a-4885-9e9c-28fa18f9ae96`. The command returned the bounded success
`MAB-VPO-2026-0004 created as a draft.` Cloud SQL evidence immediately after the response was:

| Invariant | Evidence | Result |
|---|---:|---|
| Procurement-case version increment | `aggregateVersion = 1` | pass |
| Commercial documents for case | `1` | pass |
| Command receipts for case | `1` | pass |
| Audit events for case | `1` | pass |
| Number allocation | `vendorPurchaseOrder / 2026 = 4`; document `MAB-VPO-2026-0004` | pass |
| Document lifecycle | `VENDOR_PURCHASE_ORDER / DRAFT / SAR` | pass |

CX2-R is closed. The successful command traffic is available for the remaining CL0-M1 monitoring
drill. A browser-automation limitation left the persisted issue date at the form's initial
`2026-08-14` value despite the date input visually showing `2026-06-06`; this does not affect the
submission-resilience cardinality gate, but source-document field ingestion remains a follow-up QA
item rather than being represented as accepted mapping coverage.
