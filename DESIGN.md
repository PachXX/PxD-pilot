# Design System — PxD MAB Procurement

## Product Context

- **What this is:** A bilingual internal procurement workspace and read-only operational-profitability dashboard inside Twenty. PxD connects finalized commercial records, approved direct expenses, cases, customers, projects, owners, and audit evidence.
- **Who it is for:** MAB procurement operators, finance reviewers, management sponsors, and internal pilot administrators.
- **Space:** Enterprise procurement operations and management analysis.
- **Project type:** Data-dense internal web application and dashboard.
- **Memorable quality:** **Trustworthy numbers.** Every authoritative total must visibly earn trust through its period, currency, inclusion rule, data-quality coverage, and drill-through evidence.

## Scope Boundary

This design system currently authorizes:

- A minimal native Twenty navigation shell branded PxD.
- The read-only **Operational profitability** dashboard.
- English and Arabic, including true RTL layout.
- Loading, empty, error, and partial-data states for those surfaces.

It does not authorize the full Command centre, Operations Inbox/Autopilot, OCR review, ERP synchronization, ZATCA operations screens, AI insight narration, or new transactional workflows. Each requires a separate graph and product authorization.

## Aesthetic Direction

- **Direction:** Evidence Ledger — industrial/utilitarian, precise, and calm.
- **Decoration:** Minimal. Typography, ruled separators, alignment, and information density carry the hierarchy.
- **Mood:** An operational instrument: calm enough for daily use, exact enough for sponsor scrutiny, and dense without becoming cryptic.
- **Research baseline:** SAP Ariba, Ramp reporting, and Procurify Spend Insights establish expected period filters, trends, contributor ranking, and record drill-through.
- **Deliberate distinction:** PxD foregrounds deterministic evidence and inclusion quality rather than AI narration or decorative executive cards.

## Core Principles

1. **Evidence is part of the number.** Totals and deltas link to contributing records and formulas.
2. **One authoritative state.** Financial totals never use optimistic or AI-generated values.
3. **Exceptions stay visible.** Excluded, pending, missing, and partial records are counted and explained.
4. **Currency is never implied.** Show the ISO code; never combine currencies without an approved conversion source, rate, and date.
5. **Arabic is native.** RTL affects reading order, alignment, tables, icons, focus order, and mixed-direction content—not only text direction.
6. **Color has a job.** Green identifies PxD, verified states, and actions; it does not tint every financial value.
7. **Motion explains change.** No decorative chart choreography or bouncing metrics.

## Typography

- **English UI and display:** IBM Plex Sans.
- **Arabic UI and display:** IBM Plex Sans Arabic.
- **Data and tables:** IBM Plex Sans with `font-variant-numeric: tabular-nums`.
- **Evidence IDs and technical references:** IBM Plex Mono, never normal prose or financial totals.
- **Loading strategy:** Self-host the approved 400/600 Sans and Arabic weights and 400 Mono weight
  as Twenty app public assets. Production must not depend on a font CDN.
- **Product identity:** Visible browser, PWA, authentication, default workspace, and application
  surfaces use the bundled PxD mark. The host keeps a shell copy for pre-install/auth rendering and
  the app keeps its own asset copy for portable manifest/install rendering; neither depends on an
  external image URL. Existing internal `pashx-*` identifiers remain stable and are not display copy.

### Type Scale

| Role | Size | Weight | Line height |
|---|---:|---:|---:|
| Page title | 32px | 600 | 1.15 |
| Section title | 20px | 600 | 1.25 |
| Panel title | 16px | 600 | 1.35 |
| Body, controls, and state messages | 16px | 400 | 1.5 |
| Dense table | 12px | 400–600 | 1.45 |
| Metadata/evidence | 11px | 400–600 | 1.4 |
| KPI value | 32–40px | 600 | 1.05 |

Use negative letter spacing only on large Latin display values. Preserve Arabic shaping and natural tracking.
Dense table and metadata roles may remain below 16px only where their specified contrast, 200% zoom,
and no-content-loss acceptance checks pass.

## Color

### Approach

Restrained forest green plus warm neutrals. Semantic colors appear only when status or variance changes interpretation.

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--px-navigation` | `#0C1511` | `#080E0B` | Native navigation shell surface |
| `--px-navigation-active` | `#19261F` | `#17251E` | Active navigation item |
| `--px-brand-mark` | `#2ECC71` | `#42D77E` | PxD mark and narrow active indicator |
| `--px-action` | `#167A43` | `#42B874` | Primary action, links, verified emphasis |
| `--px-action-hover` | `#116837` | `#58C989` | Hover/pressed progression |
| `--px-link-visited` | `#5F3B8C` | `#D0A9F5` | Previously inspected evidence and record links |
| `--px-canvas` | `#F6F8F5` | `#101713` | Workspace canvas |
| `--px-surface` | `#FFFFFF` | `#17201B` | Panels, tables, controls |
| `--px-surface-muted` | `#F0F3F0` | `#1D2822` | Secondary surfaces |
| `--px-ink` | `#142019` | `#EBF2EE` | Primary text and financial values |
| `--px-muted` | `#647069` | `#A6B2AC` | Supporting copy and metadata |
| `--px-border` | `#DCE3DF` | `#2E3C34` | Rules, tables, panel edges |
| `--px-warning` | `#9A620E` | `#E8B354` | Pending and partial evidence |
| `--px-danger` | `#B42318` | `#FF8178` | Errors and negative integrity states |
| `--px-info` | `#246BCE` | `#83B4FF` | Neutral informational states |

Do not use gradients. Do not use green text for ordinary positive currency values when the value is already authoritative; reserve it for change or evidence affordances.

## Spacing and Shape

- **Base unit:** 4px.
- **Density:** Compact and comfortable.
- **Scale:** `2xs 2`, `xs 4`, `sm 8`, `md 12`, `lg 16`, `xl 24`, `2xl 32`, `3xl 48`, `4xl 64`.
- **Control minimum:** 44×44px for interactive targets.
- **Radii:** 4px controls/tags, 6px panels, 8px major preview frames. Do not apply one large bubbly radius everywhere.
- **Borders:** Use 1px rules to establish ledger structure. Major KPI groups use block borders rather than floating cards.
- **Shadows:** Avoid inside the product shell. A shadow is permitted only when Twenty uses one for an overlay or side panel.

## Layout

- **Approach:** Grid-disciplined.
- **Dashboard grid:** Twelve columns on wide screens; six on tablets; one reading column on narrow screens.
- **Content behavior:** Use the native Twenty page-layout container and navigation drawer. Do not build a second router or shell.
- **First viewport:** Page identity and filters → as-of/inclusion context → one four-column KPI ledger → trend and evidence coverage.
- **Secondary order:** Deterministic margin bridge → ranked contributors → detailed drill-through → complete inclusion/exclusion ledger.
- **Maximum content width:** Follow Twenty's native workspace width; dashboard content may extend to 1440px where the host allows it.

### KPI Ledger

Finalized revenue, direct cost, gross profit, and gross margin form one ruled strip. Each cell includes:

- metric label;
- ISO currency and tabular value, except margin;
- prior-period delta with explicit comparison language;
- contributing-record count or formula link;
- keyboard-accessible drill-through.

Do not render the four metrics as independent decorative cards.

### Evidence Coverage

Evidence coverage is a first-class panel, not a footnote. Show:

- included finalized records;
- draft/cancelled/credited exclusions;
- ZATCA-pending/rejected exclusions;
- pending/rejected direct expenses;
- missing/unsafe amount and currency records;
- partial or missing case dimensions;
- conversion status (`None` when currencies remain separated).

Never summarize exclusions as “other.”

### Charts

- Use line/area charts for time trends and horizontal bars for ranked contributors.
- Keep series count low and labels direct.
- Every chart has a tabular or drill-through equivalent.
- Tooltips include period, ISO currency, exact value, and source-record count.
- Never rely on color alone; use labels, stroke patterns, or markers.
- Disable nonessential animation when filters change.

### Tables

- Preserve Twenty keyboard, focus, sorting, and resizing behavior.
- Financial columns align to the inline end and use tabular figures.
- Record names are the primary drill-through links.
- Sticky headers are permitted for long tables.
- On narrow screens, preserve data via horizontal scrolling or a structured row detail—not column deletion that changes meaning.

## Components

Reuse Twenty primitives and theme variables where the front-component boundary exposes them. PxD additions are compositions, not forks.

| Need | Pattern |
|---|---|
| Navigation | Native `PAGE_LAYOUT` item, PxD name/mark, forest active accent |
| Filters | Native selects/date controls with explicit active-filter summary |
| Method notice | Calm informational banner: “Management analysis, not accounting P&L” |
| Loading | Skeleton preserving the KPI ledger and analysis grid geometry |
| Empty | State the period/currency/filter combination and offer filter reset |
| Error | Preserve filters; identify query versus partial-record failure; provide retry |
| Partial | Keep valid totals visible and show exactly which records/dimensions are missing |
| Drill-through | Native record links or side panel; Back restores filters and scroll |
| Export | Secondary action; export repeats as-of, filters, currency, and inclusion rules |

## Motion

- **Approach:** Minimal-functional.
- **Durations:** micro 80ms, short 140ms, medium 180ms.
- **Easing:** enter ease-out, exit ease-in, movement ease-in-out.
- Update numbers without count-up animation.
- Keep loading indicators quiet and localized.
- Respect `prefers-reduced-motion` and eliminate nonessential transitions.

## Bilingual and RTL

- English and Arabic use identical information and authoritative values.
- Set `dir="rtl"` at the dashboard boundary for Arabic and use logical CSS properties.
- Mirror layout order but do not mirror charts' time axis unless locale conventions require it.
- Preserve LTR direction for ISO currency codes, UUIDs, document numbers, and timestamps inside Arabic sentences using isolation.
- Arabic labels are written for meaning, not transliterated.
- Test mixed Arabic/Latin customer and project names, long labels, and Arabic-Indic display digits separately from canonical stored values.

## Accessibility

- WCAG 2.1 AA contrast minimum.
- Visible focus on every control, chart drill target, metric, and table link.
- DOM order matches visual/focus order in both LTR and RTL.
- Every target is at least 44px where interactive.
- Charts have accessible names and equivalent data tables.
- State changes use text plus color/icon.
- Loading and error announcements use appropriate live regions without repeated noise.

## Data Integrity Contract

- Revenue includes only finalized customer invoices and finalized customer credit notes whose compliance state is cleared or not required.
- Direct cost includes finalized vendor purchase orders, finalized vendor credit notes, and approved direct expenses.
- Customer and vendor credit notes use positive stored amounts and a deterministic negative aggregation sign.
- Draft, cancelled, credited-original, ZATCA-pending, ZATCA-rejected, pending-expense, rejected-expense, unsafe-amount, invalid-currency, and missing-case records are excluded and counted.
- Money calculations convert safe integer micros to BigInt inside the calculation boundary.
- Currencies remain separate without an approved conversion source, rate, and date.
- Gross margin is rounded half away from zero to one basis point. When finalized revenue is zero, margin is `not applicable`.
- Every aggregate returns contributing record IDs and all active filters.
- Sample numbers may appear only in labeled design/test fixtures and must never enter live records.

## Responsive Acceptance

- **≥1200px:** Four-column KPI ledger; trend and evidence coverage side by side.
- **768–1199px:** Two-column KPI ledger; analysis panels stack as needed.
- **<768px:** One-column KPI ledger; filters scroll or wrap; tables retain all meaning through horizontal scroll/detail views.
- No clipped currency values, inaccessible evidence links, or reordered semantics.

## Approved Reference

- Direction: **Evidence Ledger**.
- Approved preview: `/Users/pxd/.gstack/projects/PachXX-pashx-mab/designs/evidence-ledger-20260814/preview.html`.
- Preview screenshot: `/Users/pxd/.gstack/projects/PachXX-pashx-mab/designs/evidence-ledger-20260814/preview.png`.
- Approval: Shahil, 2026-08-14.
- Preview values are illustrative and are not production evidence.

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-08-14 | Replace the earlier design direction with Evidence Ledger | Shahil requested a fresh consultation and selected “trustworthy numbers” as the memorable quality |
| 2026-08-14 | Use IBM Plex Sans / IBM Plex Sans Arabic / IBM Plex Mono | One coherent technical bilingual family supports dense financial data and evidence IDs |
| 2026-08-14 | Use a compact ruled KPI ledger | It makes the four metrics read as one calculation chain instead of decorative cards |
| 2026-08-14 | Make evidence coverage first-class | Visible inclusion/exclusion quality is PxD's deliberate distinction from AI-first competitors |
| 2026-08-14 | Keep AI insights out of the current phase | Deterministic traceability must pass before any explanatory narration is authorized |
| 2026-08-20 | Preserve full dashboard geometry during initial loading | Stable spatial context makes the financial instrument feel dependable before evidence arrives |
| 2026-08-20 | Show active filter provenance beside as-of context | Totals remain attributable in screenshots and after scrolling away from controls |
| 2026-08-20 | Freeze ≥1200, 768–1199, and <768 responsive ranges | One explicit contract makes visual and 200%-zoom acceptance reproducible |
| 2026-08-20 | Distinguish visited evidence links | Repeated reviewers can see which sources they already inspected without new workflow state |
| 2026-08-20 | Use 16px for normal reading text | Body, control, method, and state copy remain readable while dense table metadata stays compact |
| 2026-08-20 | Rebrand visible Twenty shell and application surfaces to PxD using bundled assets | PxD must own the browser, PWA, authentication, workspace-default, and app-install identity without an external asset dependency or breaking stable internal contracts |
