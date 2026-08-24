# OC6-A — core operational Command Centre source acceptance

- Date: 2026-08-24
- Owner: Codex under the DeepSeek harness graph
- Outcome: **source accepted; immutable publish and live QA not started**
- Live boundary: no version bump, publish, install, infrastructure change or pilot-data mutation

## Delivered

- Extended the bounded, workspace-authenticated Command Centre read model with pending
  `approvalRequest` records and active stored `operationalInsight` records.
- Server-side filters request only `PENDING` approvals and `ACTIVE` insights. The client read model
  also excludes decided/dismissed/superseded rows defensively when a filter is not honored.
- Preserved the frozen operational precedence in one shared queue builder:
  compliance exception → approval required → blocked data → current operator action.
- Extended the existing native Twenty page rather than introducing a second shell. Its first
  viewport now contains one four-signal ruled band, one priority ledger and one narrow evidence-
  insights panel.
- Approval rows drill through to the native Approval Request record. Insight rows retain generated
  time, confidence, generator version and source IDs; source IDs become links only when their object
  type can be resolved from the bounded read, otherwise they remain honest plain identifiers.
- Kept email intake and OCR as explicit unavailable states. The source contains no candidate data,
  provider invocation, simulated counts or capability toggle.
- Added complete English/Arabic copy, semantic LTR/RTL, bounded partial/error/empty/success states,
  44px controls and links, visible focus, reduced motion, dark-theme tokens and responsive
  200%-zoom foundations.

## Verification

| Gate | Result |
|---|---|
| Focused operational/application test run | 50/50 pass |
| `yarn workspace pashx-mab-contract test` | 15/15 pass; 100% line/branch/function coverage |
| `yarn workspace pashx-mab test` | 50/50 pass |
| `yarn workspace pashx-mab lint` | 0 warnings, 0 errors across 58 files |
| `yarn workspace pashx-mab twenty dev:build .` | pass; manifest, application files and typecheck; 17 files |

## Integrity and safety findings

- Unknown insight type/confidence values normalize to `null`; the UI labels them unknown instead of
  inventing an approved category.
- Decided approvals cannot enter the operational queue even if returned unexpectedly.
- Stale refresh protection remains intact and an earlier request cannot overwrite a later result.
- The UI remains read-only. Approve, reject and cancel stay behind the audited OC3 command boundary.
- OCR remains disabled and OC5-OCR-B2 human ground truth was not read, labeled or approved by this
  source node.

## Residual live gate

Claude may prepare the immutable app-only publish/install packet, but deployment requires the
existing release authority. After installation, OC6-A still needs live role-scoped query behavior,
approval/insight drill-through, empty/success/partial/error presentation, English/Arabic RTL,
keyboard/VoiceOver, exact native 200% zoom, health and rollback evidence. Cross-user approval
visibility/enforcement remains an explicit OC7 two-identity case; this source packet does not claim
it passed in the single-user pilot.

