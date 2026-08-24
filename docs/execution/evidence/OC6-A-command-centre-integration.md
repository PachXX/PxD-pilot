# OC6-A — Command Centre four-signal integration

- Date: 2026-08-24
- Coordinator: DeepSeek harness
- Owner (source): Codex
- Status: source complete; DS4 independent review ran in the same session; publish/deploy remains
  Claude-owned and has NOT started (DS5 requires explicit deploy authority)
- Scope: `packages/pashx-mab-contract` + `packages/twenty-apps/pashx-mab` only
- Graph: `docs/execution/2026-08-24 - deepseek-command-centre-handoff.md`

## Delivered

The existing native Command Centre page now renders the OC6-A first viewport:

1. **One ruled four-signal band** — compliance exceptions, pending approvals, blocked data, and the
   current operator's actions, in exactly the frozen precedence
   `COMPLIANCE_EXCEPTION → APPROVAL_REQUIRED → BLOCKED_DATA → ACTION_REQUIRED`.
2. **One deterministic priority ledger** composed by the existing
   `buildOperationalWorkQueue`; the JSX never re-sorts and duplicates no precedence.
3. **One narrow, read-only evidence-insights panel** listing only active stored
   `operationalInsight` records with generated timestamp, confidence, generator version, and
   source-record links.
4. **Honest unavailable states** for synchronized email (OC5 blocked) and OCR (OC5-OCR blocked).
   Neither capability is simulated or enabled; no candidates, proposals, or fabricated rows exist.

## Read-model decisions (recorded, smallest-change policy)

- The bounded loader now queries `approvalRequests` with `filter: { status: { eq: 'PENDING' } }`
  and `operationalInsights` with `filter: { lifecycleStatus: { eq: 'ACTIVE' } }`, plus a defensive
  in-code filter, so decided approvals and dismissed/superseded insights can never render even if
  a server filter were not honored.
- Unknown stored enum values normalize to `null` (CC2 doctrine), never to invented state. The
  contract therefore makes `PashxEvidenceInsight.insightType` and `.confidence` nullable.
- Stored `sourceRecordIds` are plain UUID arrays without object types. Source links resolve ONLY
  against the loaded bounded records (procurement cases, commercial documents, expenses, approval
  requests, operational insights). Unresolvable IDs render as plain monospaced identifiers — never
  invented `/object/...` links.
- Ledger rows remain read-only drill-through (`target="_top"`). No approve/reject/cancel control
  exists; OC3 REST commands remain the only transactional boundary.

## Authority-order conflict record

`DESIGN.md`'s scope boundary predates the operational graph and says the full Command centre is not
authorized. Authority order ranks the 2026-08-21 operational graph and the 2026-08-24 handoff above
`DESIGN.md`; both explicitly authorize OC6-A as an extension of the existing page. Proceeding on
that basis, applying `DESIGN.md`'s Evidence Ledger language (typography, ruled bands, semantic
colors, RTL, 44px targets, zoom safety) to the new panels. No other `DESIGN.md` conflict found.

## Verification

| Check | Result |
|---|---|
| App focused + full suite | 50/50 pass |
| Contract suite (build + coverage gates) | 100% line/branch/function across all files |
| App lint | 0 warnings, 0 errors |
| Contract lint | 0 warnings, 0 errors |
| Official `yarn twenty dev:build .` | Build succeeded (17 files), manifest typecheck pass |

## DS4 coordinator classification

| Handoff exit condition | Classification | Evidence |
|---|---|---|
| Every UI value maps to an authoritative field or an explicit unavailable state | pass | Ledger cells render only classified signal/reason fields or `approvalRequest` fields; insight panel renders stored `operationalInsight` fields; email/OCR render only static blocked-state copy |
| No fake metrics | pass | All band counts derive from loaded records via `buildOperationalWorkQueue`; no hard-coded numbers in copy or JSX |
| No invented links | pass | `resolveInsightSourceLinks` emits `/object/...` only for IDs resolvable in the loaded bounded set; other IDs render as plain mono text (test-asserted) |
| No optimistic mutations | pass | Component contains no create/update/delete/destroy/mutate calls (test-asserted); ledger is read-only drill-through with `target="_top"` |
| No graph violations | pass | No approve/reject/cancel controls (OC3 remains the transactional boundary); no email candidates or OCR proposals; no capability enablement; no publish/deploy/live-data action (DS5 not started) |
| Deterministic precedence not duplicated | pass | `buildOperationalWorkQueue` is the only sorter; JSX contains no `SIGNAL_PRIORITY`/`signalRank` (test-asserted) |
| Independent fresh-eyes review | ran in-session | Two DS4 reviewers: **ACCEPT-WITH-FINDINGS, all 10 checklist items PASS**. Findings (2× TS narrowing, `replaceAll` lib, duplicate source-ID keys, empty action-code cosmetic) all repaired with the smallest change; full battery re-run green after repair |
| DS4 repairs verified | pass | After repairs: contract 15/15 @100% coverage, app 50/50, both lints 0/0, official build succeeded (17 files) |

No failure required an owner assignment: every DS2/DS3 exit condition passed verification before DS4 began.

## Boundary

No application version bump, publish, install, deployment, migration, live-data change, mailbox
connection, OCR provider enablement, or Terraform action occurred. DS5 remains Claude-owned and
blocked on explicit deploy authority.
