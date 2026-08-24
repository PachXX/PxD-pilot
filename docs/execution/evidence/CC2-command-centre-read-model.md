# CC2 — Command Centre typed read model

- Date: 2026-08-21
- Status: **complete in source; not deployed**
- Depends on: approved CC1 signal contract

## Delivered

- Shared contract exports deterministic signal/reason vocabularies, next-action and blocker codes,
  and the bounded `PashxCommandCentreItem` / result envelope.
- Procurement Case source metadata declares the approved `stage`, `nextActionCode`, `actionDueAt`,
  and `blockedReasonCode` fields with UUID-backed select options.
- The classifier emits only evidence-backed action, missing-data, and compliance signals. It applies
  precedence `COMPLIANCE_EXCEPTION` → `BLOCKED_DATA` → `ACTION_REQUIRED` and stable due/update/ID
  ordering.
- Action visibility is scoped to the authenticated current workspace member. The loader resolves
  that identity from the metadata API rather than accepting a caller-supplied member ID; missing
  identity fails closed.
- Reads are workspace-authenticated through Twenty clients, capped at 1–500 records per connection,
  and return an explicit `isPartial` flag when any connection has another page.
- Unknown external enum values normalize to `null` rather than becoming invented business state.

## Source packet reconciliation

The provided Google Sheet and all 17 files in `/Users/pxd/Desktop/mab/` were inspected read-only.
They contain three real customer chains and useful realistic test shapes, but also missing links,
compound PDFs, filename mismatches, and reused files. Full findings are in
`CC1-source-metadata-audit.md`.

CC2 does not query the sheet/folder at runtime and does not infer workflow truth from filenames.
Those source anomalies belong to the separately scoped staged-import correction ledger.

## Verification

| Check | Result |
|---|---|
| CC2 focused tests | 8/8 pass |
| Full app tests | 25/25 pass before final identity test; focused suite rerun 8/8 afterward |
| Contract tests | 9/9 pass, 100% measured contract coverage |
| Contract lint | clean |
| App lint | clean |
| Official `twenty dev:build` | pass; manifest, files, and typecheck |
| Whitespace | pending final graph/ledger update check |

## Boundary

No application version bump, publish, install, deployment, migration, Terraform action, or live-data
change occurred. App `0.2.5` remains the frozen pilot version. Metadata additions exist only in
source until the CC3/CC4 gates pass, the demo freeze is explicitly lifted, and CC5 is authorized.

## Next node

CC3: native Twenty Command Centre page and navigation entry consuming this read model. CC3 remains
source-only under the freeze.
