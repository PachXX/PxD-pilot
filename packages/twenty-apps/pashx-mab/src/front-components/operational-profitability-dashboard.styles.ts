export type OperationalProfitabilityDashboardFontUrls = Readonly<{
  sansRegular: string;
  sansSemiBold: string;
  sansArabicRegular: string;
  sansArabicSemiBold: string;
  monoRegular: string;
}>;

export const getOperationalProfitabilityDashboardFontStyles = (
  urls: OperationalProfitabilityDashboardFontUrls,
): string => `
  @font-face {
    font-display: swap;
    font-family: "IBM Plex Sans";
    font-style: normal;
    font-weight: 400;
    src: url("${urls.sansRegular}") format("woff2");
  }
  @font-face {
    font-display: swap;
    font-family: "IBM Plex Sans";
    font-style: normal;
    font-weight: 600;
    src: url("${urls.sansSemiBold}") format("woff2");
  }
  @font-face {
    font-display: swap;
    font-family: "IBM Plex Sans Arabic";
    font-style: normal;
    font-weight: 400;
    src: url("${urls.sansArabicRegular}") format("woff2");
  }
  @font-face {
    font-display: swap;
    font-family: "IBM Plex Sans Arabic";
    font-style: normal;
    font-weight: 600;
    src: url("${urls.sansArabicSemiBold}") format("woff2");
  }
  @font-face {
    font-display: swap;
    font-family: "IBM Plex Mono";
    font-style: normal;
    font-weight: 400;
    src: url("${urls.monoRegular}") format("woff2");
  }
`;

export const operationalProfitabilityDashboardStyles = `
  .pxd-dashboard {
    --pxd-canvas: var(--t-background-secondary, #f6f8f5);
    --pxd-surface: var(--t-background-primary, #ffffff);
    --pxd-surface-muted: var(--t-background-tertiary, #f0f3f0);
    --pxd-ink: var(--t-font-color-primary, #142019);
    --pxd-muted: var(--t-font-color-secondary, #647069);
    --pxd-border: var(--t-border-color-light, #dce3df);
    --pxd-border-strong: #78857e;
    --pxd-action: #167a43;
    --pxd-button: #167a43;
    --pxd-action-hover: #116837;
    --pxd-link-visited: #5f3b8c;
    --pxd-positive: #167a43;
    --pxd-negative: #b42318;
    --pxd-warning: #9a620e;
    --pxd-info: #246bce;
    background: var(--pxd-canvas);
    box-sizing: border-box;
    color: var(--pxd-ink);
    font-family: "IBM Plex Sans", var(--t-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
    font-size: 16px;
    line-height: 1.5;
    min-height: 100%;
    padding: 24px;
  }

  .pxd-dashboard[data-color-scheme="dark"] {
    --pxd-canvas: var(--t-background-secondary, #101713);
    --pxd-surface: var(--t-background-primary, #17201b);
    --pxd-surface-muted: var(--t-background-tertiary, #1d2822);
    --pxd-ink: var(--t-font-color-primary, #ebf2ee);
    --pxd-muted: var(--t-font-color-secondary, #a6b2ac);
    --pxd-border: var(--t-border-color-light, #2e3c34);
    --pxd-action: #42b874;
    --pxd-button: #2f7f53;
    --pxd-action-hover: #296e48;
    --pxd-link-visited: #d0a9f5;
    --pxd-positive: #42b874;
    --pxd-negative: #ff8178;
    --pxd-warning: #e8b354;
    --pxd-info: #83b4ff;
  }

  .pxd-dashboard *, .pxd-dashboard *::before, .pxd-dashboard *::after {
    box-sizing: border-box;
  }

  .pxd-dashboard button,
  .pxd-dashboard input,
  .pxd-dashboard select {
    font: inherit;
  }

  .pxd-dashboard[dir="rtl"] {
    font-family: "IBM Plex Sans Arabic", var(--t-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  }

  .pxd-dashboard__header {
    align-items: flex-start;
    display: flex;
    gap: 24px;
    justify-content: space-between;
    margin: 0 auto 20px;
    max-width: 1440px;
  }

  .pxd-dashboard__eyebrow {
    color: var(--pxd-muted);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    margin: 0 0 4px;
    text-transform: uppercase;
  }

  .pxd-dashboard__title {
    font-size: 30px;
    font-weight: 600;
    letter-spacing: -0.025em;
    line-height: 1.15;
    margin: 0;
  }

  .pxd-dashboard__subtitle {
    color: var(--pxd-muted);
    margin: 8px 0 0;
    max-width: 720px;
  }

  .pxd-dashboard__refresh {
    align-items: center;
    background: var(--pxd-button);
    border: 1px solid var(--pxd-button);
    border-radius: 4px;
    color: #ffffff;
    cursor: pointer;
    display: inline-flex;
    font-weight: 600;
    justify-content: center;
    min-height: 44px;
    padding: 0 16px;
    white-space: nowrap;
  }

  .pxd-dashboard__refresh:hover { background: var(--pxd-action-hover); }
  .pxd-dashboard__refresh:disabled { cursor: wait; opacity: 0.65; }

  .pxd-dashboard__header-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }

  .pxd-dashboard__language {
    align-items: center;
    background: var(--pxd-surface);
    border: 1px solid var(--pxd-border-strong);
    border-radius: 4px;
    color: var(--pxd-ink);
    cursor: pointer;
    display: inline-flex;
    font-weight: 600;
    justify-content: center;
    min-height: 44px;
    min-width: 88px;
    padding: 0 14px;
  }

  .pxd-dashboard__language:hover { background: var(--pxd-surface-muted); }

  .pxd-dashboard :is(button, input, select, a, summary):focus-visible {
    outline: 3px solid var(--pxd-info);
    outline-offset: 2px;
  }

  .pxd-dashboard__content {
    display: grid;
    gap: 16px;
    margin: 0 auto;
    max-width: 1440px;
  }

  .pxd-dashboard__filters {
    align-items: end;
    background: var(--pxd-surface);
    border: 1px solid var(--pxd-border);
    border-radius: 6px;
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(7, minmax(120px, 1fr));
    padding: 16px;
  }

  .pxd-dashboard__field {
    display: grid;
    gap: 5px;
    min-width: 0;
  }

  .pxd-dashboard__field label {
    color: var(--pxd-muted);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .pxd-dashboard__control {
    background: var(--pxd-surface);
    border: 1px solid var(--pxd-border-strong);
    border-radius: 4px;
    color: var(--pxd-ink);
    min-height: 44px;
    min-width: 0;
    padding: 9px 10px;
    width: 100%;
  }

  .pxd-dashboard__isolate {
    direction: ltr;
    font-family: "IBM Plex Sans", var(--t-font-family, sans-serif);
    unicode-bidi: isolate;
  }

  .pxd-dashboard__context {
    align-items: flex-start;
    background: color-mix(in srgb, var(--pxd-action) 6%, var(--pxd-surface));
    border: 1px solid color-mix(in srgb, var(--pxd-action) 24%, var(--pxd-border));
    border-radius: 6px;
    display: flex;
    gap: 12px;
    justify-content: space-between;
    padding: 13px 16px;
  }

  .pxd-dashboard__context-copy { margin: 0; }
  .pxd-dashboard__context-copy strong { font-weight: 600; }
  .pxd-dashboard__as-of {
    color: var(--pxd-muted);
    font-size: 12px;
    white-space: nowrap;
  }

  .pxd-dashboard__context-meta {
    display: grid;
    gap: 5px;
    justify-items: end;
    max-width: 720px;
  }

  .pxd-dashboard__active-filters {
    color: var(--pxd-muted);
    display: flex;
    flex-wrap: wrap;
    font-size: 12px;
    gap: 4px 10px;
    justify-content: flex-end;
  }

  .pxd-dashboard__active-filter {
    white-space: nowrap;
  }

  .pxd-dashboard__partial {
    background: color-mix(in srgb, var(--pxd-warning) 8%, var(--pxd-surface));
    border-inline-start: 3px solid var(--pxd-warning);
    color: var(--pxd-ink);
    margin-top: -8px;
    padding: 10px 13px;
  }

  .pxd-dashboard__kpis {
    background: var(--pxd-surface);
    border: 1px solid var(--pxd-border);
    border-radius: 6px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    overflow: hidden;
  }

  .pxd-dashboard__kpi {
    border-inline-end: 1px solid var(--pxd-border);
    display: grid;
    gap: 9px;
    min-width: 0;
    padding: 20px;
  }

  .pxd-dashboard__kpi:last-child { border-inline-end: 0; }
  .pxd-dashboard__kpi-label { color: var(--pxd-muted); font-size: 12px; font-weight: 600; }
  .pxd-dashboard__kpi-value {
    font-size: clamp(25px, 2.2vw, 36px);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    letter-spacing: -0.035em;
    line-height: 1.05;
    overflow-wrap: anywhere;
  }

  .pxd-dashboard__delta { font-size: 12px; font-weight: 600; }
  .pxd-dashboard__delta--positive { color: var(--pxd-positive); }
  .pxd-dashboard__delta--negative { color: var(--pxd-negative); }
  .pxd-dashboard__delta--neutral { color: var(--pxd-muted); }
  .pxd-dashboard__evidence-link {
    align-items: center;
    color: var(--pxd-action);
    display: inline-flex;
    font-size: 12px;
    font-weight: 600;
    min-height: 44px;
    width: fit-content;
  }

  .pxd-dashboard__evidence-link,
  .pxd-dashboard__record-link {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
  }

  .pxd-dashboard__evidence-link:visited,
  .pxd-dashboard__record-link:visited {
    color: var(--pxd-link-visited);
  }

  .pxd-dashboard__analysis-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
  }

  .pxd-dashboard__panel {
    background: var(--pxd-surface);
    border: 1px solid var(--pxd-border);
    border-radius: 6px;
    min-width: 0;
    overflow: hidden;
  }

  .pxd-dashboard__panel-header {
    align-items: flex-start;
    border-bottom: 1px solid var(--pxd-border);
    display: flex;
    gap: 16px;
    justify-content: space-between;
    padding: 16px 18px;
  }

  .pxd-dashboard__panel-title { font-size: 16px; font-weight: 600; margin: 0; }
  .pxd-dashboard__panel-subtitle { color: var(--pxd-muted); font-size: 12px; margin: 3px 0 0; }
  .pxd-dashboard__panel-body { padding: 18px; }

  .pxd-dashboard__legend { display: flex; flex-wrap: wrap; gap: 12px; }
  .pxd-dashboard__legend-item { align-items: center; color: var(--pxd-muted); display: flex; font-size: 11px; gap: 6px; }
  .pxd-dashboard__legend-line { border-top: 2px solid var(--pxd-action); display: inline-block; width: 18px; }
  .pxd-dashboard__legend-line--cost { border-color: var(--pxd-warning); border-top-style: dashed; }

  .pxd-dashboard__chart {
    min-height: 230px;
    overflow: hidden;
    padding: 8px 0 0;
    width: 100%;
  }

  .pxd-dashboard__chart svg { direction: ltr; display: block; height: 210px; overflow: visible; width: 100%; }
  .pxd-dashboard__chart-grid { stroke: var(--pxd-border); stroke-width: 1; }
  .pxd-dashboard__chart-revenue { fill: none; stroke: var(--pxd-action); stroke-width: 3; vector-effect: non-scaling-stroke; }
  .pxd-dashboard__chart-cost { fill: none; stroke: var(--pxd-warning); stroke-dasharray: 6 4; stroke-width: 2; vector-effect: non-scaling-stroke; }
  .pxd-dashboard__chart-label { fill: var(--pxd-muted); font-size: 11px; }

  .pxd-dashboard__quality-summary {
    border-bottom: 1px solid var(--pxd-border);
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }

  .pxd-dashboard__quality-stat { padding: 14px; text-align: center; }
  .pxd-dashboard__quality-stat + .pxd-dashboard__quality-stat { border-inline-start: 1px solid var(--pxd-border); }
  .pxd-dashboard__quality-value { display: block; font-size: 24px; font-variant-numeric: tabular-nums; font-weight: 600; }
  .pxd-dashboard__quality-label { color: var(--pxd-muted); font-size: 11px; }

  .pxd-dashboard__evidence-list { list-style: none; margin: 0; padding: 0; }
  .pxd-dashboard__evidence-row {
    align-items: center;
    border-bottom: 1px solid var(--pxd-border);
    display: flex;
    gap: 12px;
    justify-content: space-between;
    min-height: 37px;
    padding: 7px 14px;
  }
  .pxd-dashboard__evidence-row:last-child { border-bottom: 0; }
  .pxd-dashboard__evidence-count { font-variant-numeric: tabular-nums; font-weight: 600; }
  .pxd-dashboard__evidence-count--warning { color: var(--pxd-warning); }

  .pxd-dashboard__secondary-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pxd-dashboard__bridge-row,
  .pxd-dashboard__rank-row {
    display: grid;
    gap: 8px;
    margin-bottom: 15px;
  }
  .pxd-dashboard__bridge-row:last-child,
  .pxd-dashboard__rank-row:last-child { margin-bottom: 0; }
  .pxd-dashboard__bar-label {
    align-items: baseline;
    display: flex;
    gap: 12px;
    justify-content: space-between;
  }
  .pxd-dashboard__bar-label span:first-child { font-weight: 600; }
  .pxd-dashboard__bar-value { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .pxd-dashboard__bar-track { background: var(--pxd-surface-muted); height: 7px; overflow: hidden; }
  .pxd-dashboard__bar-fill { background: var(--pxd-action); height: 100%; min-width: 0; }
  .pxd-dashboard__bar-fill--cost { background: var(--pxd-warning); }
  .pxd-dashboard__bar-fill--negative { background: var(--pxd-negative); }

  .pxd-dashboard__table-wrap { overflow-x: auto; }
  .pxd-dashboard__table { border-collapse: collapse; font-size: 12px; min-width: 760px; width: 100%; }
  .pxd-dashboard__table th {
    background: var(--pxd-surface-muted);
    color: var(--pxd-muted);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.03em;
    padding: 10px 12px;
    text-align: start;
    text-transform: uppercase;
  }
  .pxd-dashboard__table td { border-top: 1px solid var(--pxd-border); padding: 11px 12px; }
  .pxd-dashboard__table td[data-numeric], .pxd-dashboard__table th[data-numeric] {
    direction: ltr;
    font-variant-numeric: tabular-nums;
    text-align: end;
    unicode-bidi: isolate;
  }
  .pxd-dashboard[dir="rtl"] .pxd-dashboard__table td[data-numeric],
  .pxd-dashboard[dir="rtl"] .pxd-dashboard__table th[data-numeric] {
    text-align: left;
  }
  .pxd-dashboard__record-link { color: var(--pxd-action); font-weight: 600; min-height: 44px; padding-block: 12px; }
  .pxd-dashboard__mono { direction: ltr; font-family: "IBM Plex Mono", var(--t-font-family-monospace, monospace); unicode-bidi: isolate; }

  .pxd-dashboard__rules summary {
    color: var(--pxd-action);
    cursor: pointer;
    font-weight: 600;
    min-height: 44px;
    padding: 13px 16px;
  }
  .pxd-dashboard__rules ol { border-top: 1px solid var(--pxd-border); margin: 0; padding: 14px 38px 18px; }
  .pxd-dashboard__rules li + li { margin-top: 7px; }

  .pxd-dashboard__state {
    align-items: center;
    background: var(--pxd-surface);
    border: 1px solid var(--pxd-border);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 360px;
    padding: 32px;
    text-align: center;
  }
  .pxd-dashboard__state h2 { font-size: 20px; margin: 0 0 8px; }
  .pxd-dashboard__state p { color: var(--pxd-muted); margin: 0; max-width: 560px; }
  .pxd-dashboard__state button { margin-top: 18px; }
  .pxd-dashboard__loading {
    display: grid;
    gap: 16px;
  }

  .pxd-dashboard__loading-status {
    color: var(--pxd-muted);
    margin: 0;
  }

  .pxd-dashboard__skeleton-block {
    animation: pxd-pulse 1.4s ease-in-out infinite;
    background: var(--pxd-surface-muted);
    border-radius: 4px;
  }

  .pxd-dashboard__skeleton-control { height: 44px; }
  .pxd-dashboard__skeleton-context { height: 72px; }
  .pxd-dashboard__skeleton-kpi { height: 150px; }
  .pxd-dashboard__skeleton-panel { height: 330px; }
  .pxd-dashboard__skeleton-secondary { height: 250px; }
  .pxd-dashboard__skeleton-ledger { height: 360px; }

  @keyframes pxd-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 0.9; } }

  @media (prefers-reduced-motion: reduce) {
    .pxd-dashboard__skeleton-block { animation: none; }
  }

  @media (max-width: 1199px) {
    .pxd-dashboard__filters { grid-template-columns: repeat(4, minmax(140px, 1fr)); }
    .pxd-dashboard__kpis { grid-template-columns: repeat(2, 1fr); }
    .pxd-dashboard__kpi:nth-child(2) { border-inline-end: 0; }
    .pxd-dashboard__kpi:nth-child(-n + 2) { border-bottom: 1px solid var(--pxd-border); }
    .pxd-dashboard__analysis-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 767px) {
    .pxd-dashboard { padding: 16px; }
    .pxd-dashboard__header { align-items: stretch; flex-direction: column; }
    .pxd-dashboard__header-actions { justify-content: flex-start; }
    .pxd-dashboard__filters { grid-template-columns: 1fr; }
    .pxd-dashboard__kpis, .pxd-dashboard__secondary-grid { grid-template-columns: 1fr; }
    .pxd-dashboard__kpi { border-bottom: 1px solid var(--pxd-border); border-inline-end: 0; }
    .pxd-dashboard__kpi:last-child { border-bottom: 0; }
    .pxd-dashboard__context { flex-direction: column; }
    .pxd-dashboard__context-meta { justify-items: start; }
    .pxd-dashboard__active-filters { justify-content: flex-start; }
    .pxd-dashboard__as-of { white-space: normal; }
  }
`;
