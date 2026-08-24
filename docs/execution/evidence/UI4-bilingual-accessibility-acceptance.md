# UI4 bilingual and accessibility acceptance

- Date: 2026-08-14
- Owner: Codex
- State: complete in source
- Version: PxD MAB app `0.2.1`
- Scope: English/Arabic parity, RTL, WCAG 2.1 AA foundations, and dashboard interaction states

## Result

UI4 completes the source-level bilingual and accessibility pass for the UI2 navigation target and
UI3 Evidence Ledger dashboard. The dashboard now reacts to Twenty's host locale, retains an
approved local language switch, sets its own `lang` and `dir` boundary, and translates its entire
information model rather than headings alone. The generated app manifest contains a complete
16-message `ar-SA` catalog for the application, objects, command, navigation item, page, and widget.

The generated manifest retains the UI3 page/widget/component identities and now emits the dashboard
front component with built checksum
`0a6349b55d4ca30300dae596f48ab394b5503010c0456410d7a79122aab9a143`.

No pilot deployment, live record, migration, cloud resource, or application installation changed.

## Findings resolved

1. **Complete locale contract.** Added one exhaustive typed English/Arabic copy contract and
   deterministic `en-GB`/`ar-SA` formatting with `Asia/Riyadh` as-of time.
2. **Native manifest translation.** Extracted Twenty's official translatable catalog and supplied
   every Arabic label, including Operational profitability and Overview navigation surfaces.
3. **Real RTL without corrupting canonical values.** Arabic changes the dashboard boundary to RTL;
   ISO currency codes, record identifiers, dates, money, and the chronological SVG remain isolated
   left-to-right. Currency codes embedded in sentences use Unicode direction isolation.
4. **Keyboard and target behavior.** DOM order remains visual/focus order, controls remain native,
   every action has a visible 3 px focus indicator, and interactive targets are at least 44 px.
5. **State semantics.** Refresh exposes `aria-busy`; loading, partial, stale-error, and terminal-error
   messages use appropriate status/alert live regions; filter state survives refresh failures.
6. **Nonvisual chart evidence.** The SVG has a localized accessible name and its legend marks are
   hidden from assistive technology; the exact monthly table remains the authoritative equivalent.
7. **Light and dark contrast.** Text, muted text, links/status colors, focus rings, control borders,
   and dark-theme primary actions meet their applicable automated contrast floors.

## WCAG 2.1 AA source audit

| Principle | Criteria checked | Result and source evidence |
|---|---|---|
| Perceivable | 1.1.1, 1.3.1, 1.4.3, 1.4.11 | Semantic labels and table equivalent; light/dark text is at least 4.5:1; controls/focus/status boundaries are at least 3:1. |
| Operable | 2.1.1, 2.4.3, 2.4.7, 2.5.5 | Native keyboard controls, no positive `tabindex`, DOM-order focus, 3 px focus ring, and 44 px minimum targets. |
| Understandable | 3.2.1, 3.3.1, 3.3.2 | No focus-triggered context changes; explicit bilingual labels; errors identify the failed refresh/load action and retain context. |
| Robust | 4.1.2 | Dashboard name, `lang`, `dir`, busy state, status/alert states, labeled filters, and named chart are programmatically exposed. |

Exact contrast checks recorded by the UI4 suite include: light primary text 16.79:1, muted text
5.17:1, action 5.39:1, warning 5.09:1, danger 6.57:1, focus 5.16:1, and control border
3.85:1; dark primary text 14.67:1, muted text 7.61:1, action 6.63:1, warning 8.74:1,
danger 6.88:1, focus 7.89:1, control border 4.33:1, primary-button text 4.90:1, and
primary-button boundary 3.40:1.

## Verification

- `yarn workspace pashx-mab test` — 14/14 pass (5 UI1, 4 UI3, 5 UI4).
- `yarn workspace pashx-mab test:coverage` — UI1 remains at 100% statements, branches,
  functions, and lines.
- `yarn workspace pashx-mab test:ui3:coverage` — 94.89% lines, 85.31% branches, and 97.10%
  functions; enforced minimums remain 90/80/90.
- `yarn workspace pashx-mab test:ui4` — 5/5 bilingual, manifest, locale, WCAG-source, and
  numeric-contrast suites pass.
- `yarn workspace pashx-mab-contract test` — 9/9 pass at 100% line, branch, and function coverage.
- `yarn workspace pashx-mab exec oxlint -c .oxlintrc.json src test` — zero warnings/errors across
  36 files.
- `yarn workspace pashx-mab-contract lint` — zero warnings/errors across 9 files.
- `yarn workspace pashx-mab-contract build` — passes.
- `yarn workspace pashx-mab twenty dev:build .` — manifest, five application files, and official
  builder typecheck pass.
- `git diff --check` — passes.

The package's standalone `tsc` command remains nonzero for 25 existing workspace declaration
diagnostics from `twenty-sdk` being emitted without declarations and the same two pre-UI4 CX2
strict-null diagnostics. It reports no UI4-owned non-SDK diagnostic, while the official Twenty
builder's supported typecheck passes. The repository exposes no Prettier command, so no formatter
claim is made.

## Runtime boundary and handoff

UI4 is complete in source, not a deployed WCAG certification. VoiceOver navigation, browser zoom at
200%, actual host focus order, light/dark rendering, and Arabic font/layout inspection require a
runnable build. UI5 owns that visual/runtime acceptance gate and is now ready. Claude remains
blocked until UI5 completes or Codex explicitly asks for an interim CL-I1 deployment.

## Source evidence

- `packages/twenty-apps/pashx-mab/src/front-components/operational-profitability-dashboard.front-component.tsx`
- `packages/twenty-apps/pashx-mab/src/front-components/operational-profitability-dashboard.copy.ts`
- `packages/twenty-apps/pashx-mab/src/front-components/operational-profitability-dashboard.styles.ts`
- `packages/twenty-apps/pashx-mab/src/profitability/operational-profitability-dashboard.model.ts`
- `packages/twenty-apps/pashx-mab/locales/en.json`
- `packages/twenty-apps/pashx-mab/locales/ar-SA.json`
- `packages/twenty-apps/pashx-mab/test/operational-profitability-dashboard.accessibility.test.ts`
- `packages/twenty-apps/pashx-mab/.twenty/output/manifest.json`

