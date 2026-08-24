# UI5 design acceptance

- Date: 2026-08-20
- Owner: Codex
- State: runtime acceptance active; live app `0.2.5` passes RTL plus disposable success/partial/error-state verification
- Target: live PxD MAB app `0.2.5` (supersedes the invalid-date crash found while accepting `0.2.4`)
- Review method: complete seven-pass `plan-design-review` against `DESIGN.md` and the approved
  Evidence Ledger preview

## Review target and boundary

Shahil selected the complete branch-diff review. This review may improve the acceptance plan and
record implementation tasks, but does not change application code. The approved Evidence Ledger
preview is reused because the gstack designer binary is unavailable. Source-plan review cannot
substitute for final inspection in a runnable Twenty shell.

## Ratings and decisions

| Pass | Initial | Current | Result |
|---|---:|---:|---|
| 1. Information architecture | 10/10 | 10/10 | No issue. Page identity and filters lead to method/as-of context, KPI ledger, primary analysis, secondary analysis, evidence table, and rules. |
| 2. Interaction states | 7/10 | 10/10 planned | D2-A approved: replace the single loading bar with a geometry-preserving skeleton for filters, KPI ledger, trend, evidence coverage, and lower panels before acceptance. |
| 3. User journey and emotional arc | 10/10 | 10/10 | No issue. The first scan establishes authority, the first session exposes evidence, and repeated use preserves deterministic trust. |
| 4. AI-slop risk | 10/10 | 10/10 | No issue. Ruled ledger composition, utility copy, restrained color, and evidence density avoid generic dashboard-card treatment. |
| 5. Design-system alignment | 7/10 | 10/10 planned | D3-A approved: self-host approved IBM Plex Latin, Arabic, and Mono weights through app public assets. D4-A approved: show a compact active-filter summary in the method/as-of context band. |
| 6. Responsive and accessibility | 7/10 | 10/10 planned | D5-A approved: align implementation to the frozen ≥1200, 768–1199, and <768 viewport contract. D6-A approved: add distinct accessible visited-link colors in both themes. D7-A approved: use 16px for normal reading text/controls while retaining compact metadata and dense-table roles. Live assistive-technology verification remains a runtime gate, not a source-plan gap. |
| 7. Unresolved decisions | — | 1 resolved, 0 deferred | D8-A approved: implement all repairs, publish a new candidate, request interim CL-I1 deployment, then run real-shell acceptance before completing UI5. |

## Information hierarchy

```text
Native Twenty navigation
└── Operational profitability
    ├── Page identity + language/refresh actions
    ├── Seven explicit filters
    ├── Method + as-of + active-filter provenance
    ├── Four-cell KPI calculation ledger
    ├── Trend + evidence coverage
    ├── Margin bridge + ranked cases
    ├── Source-record evidence table
    └── Inclusion rules + separate-currency statement
```

The three things that must remain visible first are the selected evidence context, the four linked
financial results, and whether exclusions make those results partial.

## Interaction-state acceptance

| Feature | Loading | Empty | Error | Success | Partial |
|---|---|---|---|---|---|
| Filters/context | Disabled geometry retained; selected values remain visible | Exact selection remains visible with reset action | Selection retained with retry | Active dimensions summarized beside as-of context | Valid dimensions remain visible; missing dimensions named |
| KPI ledger | Four-cell skeleton preserves size | Not rendered as zero | No authoritative values shown on initial failure | Four linked, currency-explicit results | Valid totals remain visible with prominent exclusion count |
| Analysis panels | Trend/evidence/lower-panel geometry retained | Empty explanation and filter reset replace charts | Stale snapshot remains visible when refresh fails | Exact table accompanies trend and drill-through | Missing/excluded evidence stays named, never grouped as other |

## User journey storyboard

| Step | User does | Intended feeling | Design support |
|---|---|---|---|
| 1 | Opens Operational profitability | Oriented, not impressed | Page identity, selected period/currency, method boundary, calm ledger hierarchy |
| 2 | Scans the four totals | Cautiously confident | One calculation strip, explicit prior comparison, contribution/formula links |
| 3 | Checks evidence quality | In control of uncertainty | Included/excluded counts and every exclusion reason remain visible |
| 4 | Inspects a case or source record | Able to verify independently | Native drill-through, stable IDs, dates, signed contributions, visited state |
| 5 | Returns for another review | Familiar and efficient | Stable layout, active-filter provenance, deterministic rules, no narrative AI |

## AI-slop and app-UI litmus check

| Check | Result |
|---|---|
| PxD/product unmistakable in the first screen | Yes: native PxD application and Operational profitability identity |
| One strong visual anchor | Yes: the four-cell ruled KPI calculation ledger |
| Understandable by scanning headings | Yes |
| Every section has one job | Yes |
| Cards necessary | Panels contain distinct analysis/evidence interactions; KPI cells remain one ledger, not four cards |
| Motion improves hierarchy | Yes: only quiet loading feedback; reduced motion supported |
| Premium without decorative shadows | Yes: hierarchy relies on type, alignment, rules, and evidence density |

## What already exists

- `DESIGN.md`, approved by Shahil, is the binding design and data-integrity contract.
- The approved Evidence Ledger preview and approval record remain the visual reference.
- Twenty's native dashboard page layout, navigation item, record links, locale, and color-scheme
  context remain the host patterns; UI5 does not introduce a parallel shell or router.
- UI1 deterministic aggregation, UI3 dashboard model, and UI4 bilingual/WCAG source suites remain
  valid foundations and must stay green.

## Not in scope

- AI insights, because deterministic evidence remains the current product boundary.
- Full Command centre navigation or transactional workflows, because this graph authorizes only
  the minimal native navigation target and read-only profitability dashboard.
- Export, because it was not included in the graph's authorized deliverable; it needs a separate
  contract for filters, as-of time, currency, and inclusion rules.
- Inbox/Autopilot, OCR, ERP sync, ZATCA operations UI, and new financial mutations, because each has
  its own product and execution gate.
- Changes to UI1 financial formulas or live pilot records, because UI5 is presentation acceptance.

## Implementation Tasks

Synthesized from this review's findings. All are approved for the current UI5 repair candidate.

- [x] **UI5-T1 (P1, human: ~2h / Codex: ~20min)** — Dashboard loading state — Preserve the complete dashboard geometry while
  initial evidence loads, including filters, four KPI cells, first analysis row, and lower panels.
  - Surfaced by: Pass 2, interaction-state coverage.
  - Files: `packages/twenty-apps/pashx-mab/src/front-components/operational-profitability-dashboard.front-component.tsx`, `packages/twenty-apps/pashx-mab/src/front-components/operational-profitability-dashboard.styles.ts`.
  - Verify: automated semantic/source test plus visual checks at wide, tablet, and narrow widths
    with reduced motion enabled and disabled.

- [x] **UI5-T2 (P1, human: ~2h / Codex: ~20min)** — Dashboard typography — Bundle the approved IBM Plex Sans, IBM Plex Sans
  Arabic, and IBM Plex Mono weights as Twenty app public assets and load them locally with
  `@font-face`; retain sensible host/system fallbacks only after the approved family.
  - Surfaced by: Pass 5, design-system alignment.
  - Files: `packages/twenty-apps/pashx-mab/public/`, dashboard front-component/styles, app manifest
    build output and package notice/license documentation.
  - Verify: official app build includes checksummed font assets; English, Arabic, and evidence IDs
    render in the named families with external network access disabled.

- [x] **UI5-T3 (P1, human: ~90min / Codex: ~15min)** — Filter provenance — Add a compact localized active-filter summary to the
  method/as-of context band for period, currency, case, customer, project, and owner, omitting only
  dimensions explicitly set to All.
  - Surfaced by: Pass 5, design-system alignment.
  - Files: dashboard copy contract, front component, styles, and UI4/UI5 tests.
  - Verify: English/Arabic and mixed-direction fixtures show the exact active dimensions; changing
    or resetting a filter updates the summary without changing the query result contract.

- [x] **UI5-T4 (P1, human: ~90min / Codex: ~15min)** — Responsive contract — Align KPI, filter, primary-analysis, secondary-panel,
  header, context, and table behavior to the frozen ≥1200px, 768–1199px, and <768px ranges.
  - Surfaced by: Pass 6, responsive acceptance.
  - Files: dashboard stylesheet and UI4/UI5 structural tests.
  - Verify: visual checks immediately below, at, and above 768px and 1200px in both directions;
    200% zoom must preserve content and keyboard access without two-dimensional page scrolling.

- [x] **UI5-T5 (P2, human: ~45min / Codex: ~10min)** — Visited evidence links — Define contrast-safe light/dark visited-link
  tokens and apply them to KPI evidence, record, and case drill-through links using native
  `:visited` behavior.
  - Surfaced by: Pass 6, accessibility and repeated-review usability.
  - Files: dashboard stylesheet and numeric contrast tests.
  - Verify: unvisited and visited links remain distinguishable without color being the only signal
    of clickability; each state meets 4.5:1 text contrast and preserves visible keyboard focus.

- [x] **UI5-T6 (P1, human: ~60min / Codex: ~10min)** — Reading text scale — Raise normal body copy, controls, method context, and
  state messages to 16px while preserving the approved 11–12px metadata and 12–14px dense-table
  hierarchy where contrast and zoom acceptance pass.
  - Surfaced by: Pass 6, accessibility.
  - Files: dashboard stylesheet and visual acceptance fixtures.
  - Verify: English/Arabic at 100% and 200% zoom across the three responsive ranges; no clipped
    controls, financial values, evidence links, or lost table meaning.

- [ ] **UI5-T7 (P1, human: ~3h / Codex + Claude: ~45min)** — Runtime acceptance — Build/publish the
  repaired app candidate, request the explicitly authorized interim CL-I1 deployment, and run the
  English/Arabic, LTR/RTL, light/dark, keyboard, focus, VoiceOver/accessibility-tree, responsive,
  loading/empty/error/partial, and 200%-zoom matrix in the real Twenty shell.
  - Surfaced by: Pass 7, deployment/acceptance dependency.
  - Files: immutable build/deployment evidence, this UI5 evidence record, graph, and shared ledger.
  - Verify: `/healthz` 200, installed application version/checksum, screenshots and pass/fail matrix
    at all accepted widths/themes/locales, with no mutation of non-disposable pilot records.

## Approved mockup

| Screen | Reference | Direction | Constraint |
|---|---|---|---|
| Operational profitability | `/Users/pxd/.gstack/projects/PachXX-pashx-mab/designs/evidence-ledger-20260814/preview.png` | Evidence Ledger; trustworthy numbers visibly earned | Illustrative values are never production evidence; current graph excludes AI insights and the full Command centre. |

## Completion summary

| Review area | Result |
|---|---|
| System audit | `DESIGN.md` present and binding; app UI scope confirmed; approved preview reused |
| Initial assessment | 8/10; strong direction with unverified runtime and four source-plan gaps |
| Information architecture | 10/10 → 10/10 |
| Interaction states | 7/10 → 10/10 planned |
| User journey | 10/10 → 10/10 |
| AI-slop risk | 10/10 → 10/10 |
| Design-system alignment | 7/10 → 10/10 planned |
| Responsive/accessibility | 7/10 → 10/10 planned |
| Decisions | 6 accepted, 0 deferred, 0 unresolved |
| TODOs.md | 0 deferred design debts; all six repairs and runtime acceptance stay in UI5 |
| Mockups | Existing approved Evidence Ledger reference reused; generator unavailable |
| Overall plan score | 8/10 → 10/10 |

The UI5 plan and six source repairs are complete. Real-shell acceptance started on 2026-08-20,
found one host-boundary RTL failure, and verified the repair against deployed app `0.2.4`. UI5
remains active only for the explicitly bounded manual keyboard/VoiceOver/native-zoom checks and
safe non-empty/error fixtures described below.

## Source-repair verification

- Candidate: PxD MAB app `0.2.4`; live `0.2.3` is superseded after runtime acceptance found that
  the front-component host stripped global `dir` and `lang` attributes.
- Dashboard built checksum:
  `ef05cbfff82e9512650c17873adf6aeb59cfa6fc8ae3a26844ff0b9ba2ff417b`.
- Generated manifest: 16 complete Arabic messages and ten checksummed public assets (the bundled
  PxD logo and provenance README, five WOFF2 files, SIL OFL license, font provenance notice, and
  generated PxD cover image).
- `yarn workspace pashx-mab test` — 17/17 pass, including the application display-name/logo and
  bundled-asset regression.
- `yarn workspace pashx-mab test:coverage` — UI1 remains 100% statements, branches, functions,
  and lines.
- `yarn workspace pashx-mab test:ui3:coverage` — 94.89% lines, 85.31% branches, 97.10% functions
  against enforced 90/80/90 minimums.
- `yarn workspace pashx-mab test:ui4` — 6/6 localization, font-asset, structural accessibility,
  responsive, and numeric contrast suites pass.
- `yarn workspace pashx-mab-contract test` — 9/9 pass at 100% line/branch/function coverage.
- Both package linters report zero warnings/errors; contract build passes.
- `yarn workspace pashx-mab twenty dev:build .` — manifest, 15 emitted files, and official builder
  typecheck pass.
- `git diff --check` — passes.

## Runtime acceptance attempt — live 0.2.3

Captured evidence is stored in `docs/execution/evidence/ui5-runtime/`: desktop light empty state,
desktop Arabic showing the historical RTL semantic failure, desktop dark empty state, mobile dark
empty state, and repaired `0.2.4` Arabic desktop/mobile captures. Screenshots contain live UI only
and no credential values.

| Check | Result | Evidence |
|---|---|---|
| Host/app prerequisite | Pass | CL-I1 live image `sha256:57f0f9b9…`; `/healthz` 200; database confirms PxD application `0.2.3` in the pilot workspace. |
| Browser/PWA identity | Pass | Live title `PxD`, PNG favicon URL, and PWA manifest `PxD` / `PxD Procurement` verified. Stored workspace identity still displays `PashX MAB Pilot` and its letter avatar; this is the separately recorded supported-settings step. |
| Native navigation | Pass | Installed `Operational profitability` item resolves to live standalone layout `/page/19f450f5-056b-40e3-a797-5bf1367bc717`. |
| English empty state | Pass | Complete filters, management-analysis boundary, as-of/filter provenance, truthful no-finalized-evidence state, and reset action render without console warnings/errors. |
| Live data boundary | Correctly empty | Read-only database evidence shows four non-deleted Vendor POs, all `DRAFT`, and no expenses; no live finalized evidence exists. Success/partial evidence states are not manufactured because this gate forbids pilot business-record mutation. |
| Light/dark themes | Pass for empty state | Both themes render legibly with the intended evidence-led hierarchy and no horizontal overflow. |
| Responsive boundaries | Pass for empty state | 1201/1200px use seven filter columns; 1199/769/768px use four; 767/390px use one and a column header. No body/root horizontal overflow; all dashboard controls are at least 44px high. |
| Arabic copy | Pass | Complete localized labels, dates, states, actions, and filter provenance render. |
| Arabic language/RTL semantics | **Fail** | Live host DOM drops the component root's `lang="ar"` and `dir="rtl"`; computed direction remains LTR and RTL CSS selectors do not apply. Root cause is absent `dir`/`lang` entries in the renderer's generated common-property schema, not dashboard state. |
| Keyboard/focus | Partial | Language action receives a visible 3px focus outline and all dashboard controls have native focusability/tab indexes. The current browser-control surface did not advance native Tab focus reliably, so the full manual sequence remains pending rather than being claimed. |
| 200% zoom | Pending | Browser-control viewport checks cover the equivalent narrow geometry, but this surface did not change native browser zoom; manual 200% verification remains required. |
| Success/partial/error states | Pending safe fixture | The live workspace cannot exercise these without creating/changing financial evidence or forcing infrastructure failure. Source suites remain green; runtime evidence requires an approved disposable fixture or an existing safe fixture. |

## Runtime RTL repair — candidate 0.2.4

The renderer's allowlisted common HTML property schema now includes safe global `dir` and `lang`
properties. Generated remote element/component registries were rebuilt from that source schema; the
dashboard can therefore retain its existing semantic `dir={rtl|ltr}` and `lang={ar|en}` contract
without an app-specific data-attribute workaround. A focused renderer regression passes 1/1, app
tests pass 17/17, app lint reports zero findings, and the official app build/typecheck emits 15
files and ten assets. Candidate manifest SHA-256:
`ce42cb30072fb0d497429a4c5c14f115c9f2b57cb8a9e31f5f5572aaaca919e4`.

The Nx dependency pipeline remains baseline-blocked in upstream `twenty-ui` by TS5042. Direct
renderer `tsc` also remains nonzero on existing unbuilt workspace/Storybook/remote-dom declarations
and one unrelated host-fetch test tuple diagnostic; neither reports a diagnostic in the changed
common-property source or regenerated schema. These baseline failures are not represented as a
passing renderer-wide typecheck.

Claude built and deployed host digest
`sha256:c48dd052dcf79ca6fa18cee90d47d66b10a16ab813688106650ee06b1e66156d`, published and installed
app `0.2.4`, and verified `/healthz` 200 plus the installed application row in `core.application`.
Codex then resumed UI5-T7 in the authenticated live shell. No UI5 completion is claimed yet.

## Runtime repair verification — live 0.2.4

Verification ran on 2026-08-20 against the deployed standalone dashboard route. The pilot remained
read-only: no commercial document, expense, case, infrastructure failure, or other financial
fixture was created or changed.

| Check | Result | Evidence |
|---|---|---|
| Deployment prerequisite | Pass | `/healthz` returns 200; Claude's read-only `core.application` evidence confirms app `0.2.4` in the pilot workspace; immutable host digest is recorded above. |
| English semantics regression | Pass | Live dashboard root retains `lang="en"`, `dir="ltr"`, and computed LTR after the repaired host deploy. |
| Arabic semantic RTL | **Pass** | Switching language yields root `lang="ar"`, `dir="rtl"`, computed RTL, and `IBM Plex Sans Arabic`; the prior host stripping defect is absent. |
| Arabic responsive empty state | Pass | At 390×844 the dashboard has no root/document horizontal overflow; all ten visible dashboard inputs, selects, and actions measure at least 44px in both dimensions where applicable. |
| Accessibility tree | Pass for available empty state | The live tree exposes one named dashboard generic, banner, level-1 heading, main, named filter region, labelled textboxes/comboboxes, management-analysis region, level-2 empty-state heading, and named actions in Arabic. |
| Focus styling/native focusability | Pass | All dashboard controls remain native focusable controls and the focused language action exposes a visible 3px blue outline. |
| Manual Tab sequence + VoiceOver | Pending manual device check | The browser-control surface still does not advance native Tab focus reliably and does not expose VoiceOver output. DOM order and the accessibility tree are correct, but manual assistive-technology evidence is not manufactured. |
| Native 200% browser zoom | Pending manual device check | Explicit responsive viewports pass, but the browser-control surface does not report or reliably set an exact native zoom percentage. |
| Success/partial/error runtime states | Superseded by live `0.2.5` pass | Shahil approved a disposable fixture on 2026-08-20. The subsequent run found and repaired an invalid-date host crash, exercised trustworthy non-empty/partial/error rendering on `0.2.5`, and removed every tagged fixture. Details follow. |

New repair evidence:

- `docs/execution/evidence/ui5-runtime/2026-08-20-desktop-arabic-rtl-pass-0.2.4.png`
- `docs/execution/evidence/ui5-runtime/2026-08-20-mobile-arabic-rtl-pass-0.2.4.png`

## Disposable state acceptance and invalid-date repair — live 0.2.5

Shahil explicitly approved creating and cleaning disposable pilot financial fixtures for UI5-T7.
Codex used the authenticated public GraphQL API, not direct database writes, and assigned the unique
prefix `UI5T7-20260820-6d456bc4` to every record. The fixture consisted of one case, one finalized
cleared SAR 2,000 customer invoice, one finalized SAR 1,200 vendor PO, one approved SAR 100 direct
expense, and one SAR 400 draft invoice. Existing four draft Vendor POs remained untouched.

The resulting dashboard correctly rendered SAR 2,000 finalized revenue, SAR 1,300 direct cost,
SAR 700 gross profit, 35.00% gross margin, three contributing records, a deterministic margin
bridge, ranked case/record evidence links, and a partial-evidence notice counting five draft
exclusions (the four pre-existing drafts plus the disposable draft). English LTR and Arabic RTL
both retained exact totals; the Arabic 390×844 view had no root/document horizontal overflow.

The controlled error exercise exposed a real `0.2.4` defect: an invalid/intermediate native date
input reached `formatDashboardDate`, which called `Intl.DateTimeFormat.format` with an invalid date
and crashed the entire remote component with `RangeError: Invalid time value`. Candidate `0.2.5`
makes user-controlled date formatting render-safe with an em-dash fallback while leaving
`toProfitabilityFilters` responsible for the explicit validation error. A regression covers empty,
malformed, impossible, and valid dates.

App `0.2.5` verification:

- `yarn workspace pashx-mab test:ui4` — 9/9 pass.
- `yarn workspace pashx-mab test` — 18/18 pass.
- `yarn workspace pashx-mab lint` — zero warnings/errors.
- official `twenty dev:build` and typecheck — pass, 15 files.
- manifest SHA-256: `715ae676953737e8a0d1b16e1b0b5d74a1778d8c5b2b9902b98d08595fca3928`.
- tarball SHA-256: `5abd755f2d3026b72cf7988db2a9b775f9c3e87d4aaf3298153da2a44178af87`;
  npm shasum: `2cf3b36b1a2e15454ffb089efb0cd5642941d7fd`.
- private server-registry publish and install passed; read-only `core.application` verification
  confirms universal identifier `058263f0-1cc0-42e7-94a1-b4beb688e771`, version `0.2.5`, the
  unchanged pilot workspace, and update time `2026-08-20 17:56:33.399673+00`.
- `/healthz` — HTTP 200 after installation.

Live `0.2.5` then accepted the same native invalid-date sequence without a host crash: the active
period displayed `— – 20 Aug 2026`, a named alert reported that refresh failed because the dashboard
date was invalid, the last successful evidence snapshot and all totals remained visible, and focus
retained its 3px outline. The initial accidental `app:publish` invocation selected npm and stopped
with `ENEEDAUTH`; nothing was published to npm. The corrected `--private --remote pashx-pilot`
command published and installed the server-registry package.

Cleanup deleted exactly the approved expense, three commercial documents, and procurement case by
their recorded IDs, child-first. A post-delete public-API query found zero remaining records with
the fixture prefix; a dashboard reload returned to the truthful empty state and contained no fixture
label. No pre-existing record was changed or deleted.

New state evidence:

- `docs/execution/evidence/ui5-runtime/2026-08-20-mobile-arabic-success-partial-0.2.4.png`
- `docs/execution/evidence/ui5-runtime/2026-08-20-desktop-english-success-partial-0.2.4.png`
- `docs/execution/evidence/ui5-runtime/2026-08-20-native-invalid-date-error-pass-0.2.5.png`
- `docs/execution/evidence/ui5-runtime/2026-08-20-native-invalid-date-error-alert-pass-0.2.5.png`

UI5-T7 now remains open only for manual native Tab sequencing, VoiceOver output, and an exact native
200% browser-zoom observation. The browser-control surface preserves focus styling and exposes the
complete accessibility tree, but it does not advance native Tab focus or report/set exact native
zoom reliably; these device-level checks are not represented as automated passes.

Standalone package `tsc` remains nonzero only for 26 known missing declaration diagnostics from the
workspace-built `twenty-sdk` subpaths and the same two pre-UI5 CX2 strict-null diagnostics. It has
zero UI5-owned non-SDK diagnostics. The official supported builder typecheck passes.

## Completed interim deployment

Claude completed CL-I1 for candidate `0.2.3` using the reviewed pilot deployment path, preserving
the private database/network posture and recording immutable host, health, installed-version,
manifest, asset, and dashboard reachability evidence. That deployment enabled the runtime attempt
above and is now superseded by the narrowly scoped CL-I1-R request for `0.2.4`.

## CL-I1 install repair

Billing is restored on replacement account `01C37A-1AC8B7-B4E2B4`; the VM, Cloud SQL, and external
health endpoint were restored by Claude. App `0.2.2` published but failed installation on two
metadata validations:

1. the `PAGE_LAYOUT` navigation item referenced a `DASHBOARD` layout instead of the required
   `STANDALONE_PAGE`; and
2. reconciliation tried to delete the CX2-R emergency PashX permission relation from Twenty's
   non-editable built-in Admin role, but the deletion validator rejected even a relation owned by
   the caller application.

Candidate `0.2.3` corrects the page type and completes the visible product rebrand from Twenty to
PxD: browser metadata/title, favicon, PWA manifest/icons, authentication mark, default workspace
identity, app display name, app logo, and generated cover use locally bundled PxD assets. Stable
internal `pashx-*` contracts, database identifiers, and migration identifiers remain unchanged.
The host repair permits only deletion of a
role-permission relation owned by the caller application (or a system build) from a non-editable
role; creation and update protection remain unchanged, and deletion of another application's
relation remains rejected. App tests pass 17/17, the focused validator regression passes 2/2,
formatting and `git diff --check` pass, and the official app build/typecheck emits a 15-file
manifest with SHA-256 `59c144422ba5ced2a912443cc536089cc34d311ffc1e4a2613a79a267016626f` and a
`STANDALONE_PAGE` target.

Claude completed that host deployment and installed `0.2.3`; both prior sync errors are absent and
health, version, assets, browser/PWA identity, and dashboard reachability pass. The live workspace
record still overrides the default name/logo and requires the separately recorded supported-settings
step. UI5-T7 started against this deployment and produced the runtime matrix above.
