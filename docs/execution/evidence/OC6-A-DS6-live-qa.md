# OC6-A DS6 live QA — app 0.2.10

- Date: 2026-08-24
- Live host: `https://34-18-165-1.nip.io`
- Application: `pashx-mab` `0.2.10`
- Published tarball shasum: `523a49f211e1c3d113bee79a5bcaebfca0d077ef`
- Rollback application: `0.2.9`
- Scope: OC6-A browser/runtime acceptance plus two explicitly approved disposable QA fixtures
- Decision: **DS6 fixture-dependent matrix complete; manual native checks remain**

## Deployment and runtime baseline

Claude's DS5 evidence records the immutable app-only publish/install, the unchanged application
identity, the `0.2.10` row in `core.application`, the `0.2.9` rollback target, clean server logs and
external `/healthz` HTTP 200. Codex independently rechecked `/healthz` and received HTTP 200 with
`{"status":"ok"}` before browser acceptance.

No OCR or email capability was enabled. On Shahil's explicit authority, Codex created exactly one
clearly labelled pending approval and one active insight, exercised their native drill-through,
then deleted both exact UUIDs. The pilot was temporarily started from its scheduled-off state for
the matrix; its original scheduled/off policy is restored after verification.

## Live matrix

| Check | Evidence | Result |
|---|---|---|
| Authenticated operator session | Native profile page identifies the active user as `PashX Operator`. No credential retrieval or login was needed. | pass |
| Role scope | Read-only DB evidence: `PashX MAB Operator` has global `canReadAllObjectRecords=false` and `canUpdateAllObjectRecords=false`; object permissions grant read only to `approvalRequest`, `commercialDocument`, `company`, `documentLine`, `expense`, `operationalInsight` and `procurementCase`; update is limited to `commercialDocument`, `documentLine` and `procurementCase`. The page exposes no approval mutation controls. | pass for the operator identity; cross-user enforcement remains OC7 |
| Four-signal band | Live page shows Compliance exceptions `0`, Pending approvals `0`, Blocked data `10`, Your actions `0`, in the frozen precedence. | pass |
| Honest approval/insight counts | Live DB has one `APPROVED` and one `CANCELLED` approval, no `PENDING` approval, and no stored operational-insight row. UI shows `0` pending approvals and `No active insights`. | pass |
| Deterministic ledger | Ten blocked-data rows render below one header with the approved column order; no JSX re-sort or invented count was observed. | pass |
| Evidence drill-through | First `Open evidence record` navigated to procurement case `ea9a71fa-363a-4c9b-aa5b-f1bce9232fd3`; the native record page loaded and browser Back returned to the same Command Centre route. | pass |
| Approval drill-through | Disposable approval `d5600000-0000-4000-8000-000000000001` rendered first in the ledger, raised the signal to `1`, and opened `/object/approvalRequest/d560…0001` with `Pending`, `TEST_ACTION`, the expected source UUID and idempotency key. | pass |
| Insight drill-through | Disposable insight `d5600000-0000-4000-8000-000000000002` rendered as an active suggestion with generated time, high confidence, generator version and a resolvable procurement-case source; `Open insight record` opened the native record. | pass |
| English | English heading, copy, signal descriptions, ledger headings and capability states render with no console warning/error. | pass |
| Arabic / RTL | Component root changes to `lang=ar`, `dir=rtl`, computed RTL; heading, signal copy, ledger headings, evidence-link copy and unavailable states translate. Global Twenty shell correctly remains English/LTR. | pass |
| Accessibility semantics | One H1, three H2s, named summary/work/insight/capability regions, a six-column native table, language and refresh buttons, and ten evidence links are exposed in the accessibility tree. DOM focus order is language → refresh → evidence links. Interactive targets measured at least 44 px high. | pass for semantics and target size |
| Physical Tab and VoiceOver speech | The in-app automation surface could inspect focusability and focus-ring CSS but could not reliably advance native Tab focus or capture VoiceOver spoken output. | manual residual; not claimed as passed |
| 200% layout behavior | A half-CSS-width live viewport equivalent to the 200%-zoom reflow condition produced no horizontal overflow (`innerWidth=348`, `scrollWidth=348`) and retained 44 px controls. The in-app browser does not expose native page-zoom control, and keyboard zoom shortcuts did not change zoom. | layout equivalent pass; exact native 200% remains manual |
| Success state | Four-signal ledger, empty insight panel and capability status all load from the live workspace. | pass |
| Refresh/loading state | `Refresh queue` disables immediately, then re-enables with a newer observed timestamp and unchanged truthful count. | pass |
| Empty state | `No active insights` renders against the confirmed empty insight table. | pass |
| Partial state | Synchronized email and document OCR both render explicit `Unavailable` copy; neither is simulated. | pass |
| Error state | The bounded error model remains covered by DS4 source tests. The approved fixtures close the data-state matrix without weakening or intercepting the live network boundary. | source pass; destructive live fault injection remains out of scope |
| Console/runtime health | Zero warning/error entries across navigation, refresh, drill-through and language switching; external health remains 200. | pass |

## Approved fixture inventory and cleanup

| Object | UUID | Label | Result |
|---|---|---|---|
| Approval Request | `d5600000-0000-4000-8000-000000000001` | `DS6-QA-DISPOSABLE Pending approval` | Created once, verified live, deleted once |
| Operational Insight | `d5600000-0000-4000-8000-000000000002` | `DS6-QA-DISPOSABLE Active insight` | Created once, verified live, deleted once |

Both records linked only to existing procurement case
`ea9a71fa-363a-4c9b-aa5b-f1bce9232fd3`. Post-cleanup SQL returned `remaining|0|0`; a fresh
Command Centre load returned Pending approvals `0`, Blocked data `10`, `10 visible records` and
`No active insights`. No accepted CX2-R evidence row was modified.

## Manual native-check attempt — 2026-08-24

Shahil approved the remaining exact native 200% and physical Tab/VoiceOver checks. The pilot was
started through workflow `72c6f40b-8208-4b62-829c-71d00ca717eb` and remained healthy. The macOS
automation boundary did not expose a browser accessibility window or screen-reader speech:
System Events reported zero accessible Chrome windows and native screen capture returned black.
Therefore no evidence-grade native zoom or VoiceOver claim was made. The environment was restored
through shutdown workflow `fe9337ea-fbbe-44c2-bc42-53ca2ae8c5fb`; final state is VM `TERMINATED`,
Cloud SQL `STOPPED / NEVER`. These two observations still require a human at the Mac.

## Runtime finding

After a clean hard reload, the Twenty shell can appear without the front component for roughly
five seconds; the Command Centre is present by the ten-second observation with no console error.
This was observed twice. The loaded page itself is healthy, and a previous apparently blank capture
was separately traced to the intentionally expanded small-screen navigation panel placing the page
off-canvas; collapsing the panel restored it immediately. The clean-reload delay remains a real
loading-feedback gap: the host shows no skeleton or status while the app front component mounts.

The root cause is now isolated one layer earlier than the front-component renderer:
`PageLayoutRendererContent` returned `null` while page-layout metadata initialized. The smallest
repair renders the existing `WidgetSkeletonLoader` during that interval. A focused Jest regression
test passes both pre-initialization and initialized states (2/2), and both changed files pass
`oxfmt --check`. Host deployment evidence is recorded separately when the immutable image lands.

## Loading repair deployment

- Cloud Build: `929f6a51-0c90-4f0b-ade7-1a0e1bcb6399` — `SUCCESS`, 18m56s.
- Deployed host: `sha256:9dba74f7425bcdc523132923824738df8b6e25749f1f3f32e34aca25e38fe3ec`.
- Rollback host: `sha256:a33a2ff46b2f78714f3f4c57d7058cc4a20288e33634ed380aaae5de7493452f`.
- Terraform: reviewed `2 add / 6 change / 1 destroy`; applied exactly that plan.
- Runtime: startup exit `0`, all five containers healthy, `/healthz` 200 after 140 seconds,
  installed app still `0.2.10`, no real server error line.
- Live hard reload: skeleton placeholders were present at one second and 3.5 seconds; the complete
  Command Centre then loaded with Pending approvals `0`, Blocked data `10` and `No active insights`.
- Post-QA shutdown: workflow `f5dbd7ab-a48b-481a-8fd5-fa173d6c0be6` succeeded; VM is
  `TERMINATED`, Cloud SQL is `STOPPED / NEVER`, and the three schedule-sensitive alerts are off.

## Evidence files

- `oc6-a-ds6-runtime/03-command-centre-live-en.png`
- `oc6-a-ds6-runtime/04-evidence-drill-through.png`
- `oc6-a-ds6-runtime/05-command-centre-ar-rtl.png`
- `oc6-a-ds6-runtime/07-command-centre-half-css-viewport.png`
- `oc6-a-ds6-runtime/09-command-centre-after-nav-collapse.png`

## Closure decision

DS5 is complete. The fixture-dependent DS6 matrix is complete and the live workspace is clean.
Physical Tab/VoiceOver speech and exact native 200% zoom remain explicitly manual observations;
they are not falsely claimed from automation. Full OC6-B/OC7 and OCR/email gates remain blocked as
before.
