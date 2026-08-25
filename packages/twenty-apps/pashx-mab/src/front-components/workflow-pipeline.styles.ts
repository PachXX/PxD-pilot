export const workflowPipelineStyles = `
  .pxd-pipeline {
    --pxd-canvas: var(--t-background-secondary, #f6f8f5);
    --pxd-surface: var(--t-background-primary, #ffffff);
    --pxd-muted-surface: var(--t-background-tertiary, #f0f3f0);
    --pxd-ink: var(--t-font-color-primary, #142019);
    --pxd-muted: var(--t-font-color-secondary, #647069);
    --pxd-border: var(--t-border-color-light, #dce3df);
    --pxd-green: #167a43;
    --pxd-blue: #246bce;
    --pxd-amber: #9a620e;
    --pxd-red: #b42318;
    background: var(--pxd-canvas);
    box-sizing: border-box;
    color: var(--pxd-ink);
    font-family: "IBM Plex Sans", var(--t-font-family, sans-serif);
    font-size: 16px;
    line-height: 1.5;
    min-height: 100%;
    padding: 28px clamp(16px, 3vw, 44px) 44px;
  }
  .pxd-pipeline[dir="rtl"] { font-family: "IBM Plex Sans Arabic", "IBM Plex Sans", sans-serif; }
  .pxd-pipeline[data-color-scheme="dark"] {
    --pxd-canvas: var(--t-background-secondary, #101713);
    --pxd-surface: var(--t-background-primary, #17201b);
    --pxd-muted-surface: var(--t-background-tertiary, #1d2822);
    --pxd-ink: var(--t-font-color-primary, #ebf2ee);
    --pxd-muted: var(--t-font-color-secondary, #a6b2ac);
    --pxd-border: var(--t-border-color-light, #2e3c34);
  }
  .pxd-pipeline *, .pxd-pipeline *::before, .pxd-pipeline *::after { box-sizing: border-box; }
  .pxd-pipeline__header { align-items: flex-start; display: flex; gap: 28px; justify-content: space-between; margin: 0 auto 24px; max-width: 1600px; }
  .pxd-pipeline__tenant-brand { align-items: center; display: flex; gap: 12px; margin-block-end: 18px; }
  .pxd-pipeline__tenant-logo { background: #fff; border: 1px solid var(--pxd-border); display: block; flex: 0 0 auto; height: 52px; overflow: hidden; position: relative; width: 116px; }
  .pxd-pipeline__tenant-logo img { height: auto; inset-block-start: 50%; left: 50%; max-width: none; position: absolute; transform: translate(-50%, -50%); width: 142%; }
  .pxd-pipeline__welcome { font-weight: 600; margin: 0; }
  .pxd-pipeline__eyebrow { color: var(--pxd-muted); font-size: 14px; font-weight: 600; margin: 0 0 6px; }
  .pxd-pipeline__title { font-size: clamp(30px, 4vw, 44px); letter-spacing: -.04em; line-height: 1.08; margin: 0; }
  .pxd-pipeline[dir="rtl"] .pxd-pipeline__title { letter-spacing: normal; }
  .pxd-pipeline__subtitle { color: var(--pxd-muted); font-size: 17px; margin: 10px 0 0; max-width: 820px; }
  .pxd-pipeline__as-of { color: var(--pxd-muted); font-size: 13px; margin: 18px 0 0; }
  .pxd-pipeline__actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .pxd-pipeline__button { align-items: center; background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 4px; color: var(--pxd-ink); cursor: pointer; display: inline-flex; font: inherit; font-weight: 600; justify-content: center; min-height: 44px; padding: 9px 14px; }
  .pxd-pipeline__button--primary { background: var(--pxd-green); border-color: var(--pxd-green); color: #fff; }
  .pxd-pipeline__button[aria-pressed="true"] { border-color: var(--pxd-green); color: var(--pxd-green); }
  .pxd-pipeline__button:disabled { cursor: default; opacity: .68; }
  .pxd-pipeline__button:focus-visible, .pxd-pipeline__input:focus-visible, .pxd-pipeline__link:focus-visible { outline: 3px solid #2d8cff; outline-offset: 3px; }
  .pxd-pipeline__main { display: grid; gap: 20px; margin: 0 auto; max-width: 1600px; }
  .pxd-pipeline__notice, .pxd-pipeline__state { background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 6px; padding: 16px; }
  .pxd-pipeline__notice[role="alert"] { border-color: var(--pxd-red); }
  .pxd-pipeline__notice h2, .pxd-pipeline__state h2 { font-size: 18px; margin: 0 0 6px; }
  .pxd-pipeline__notice p, .pxd-pipeline__state p { color: var(--pxd-muted); margin: 0; }
  .pxd-pipeline__toolbar { align-items: end; display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; }
  .pxd-pipeline__search { display: grid; flex: 1 1 360px; gap: 5px; max-width: 640px; }
  .pxd-pipeline__search label { color: var(--pxd-muted); font-size: 13px; font-weight: 600; }
  .pxd-pipeline__input { background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 4px; color: var(--pxd-ink); font: inherit; min-height: 44px; padding: 9px 12px; width: 100%; }
  .pxd-pipeline__summary { background: var(--pxd-surface); border: 1px solid var(--pxd-border); display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .pxd-pipeline__summary-item { border-inline-end: 1px solid var(--pxd-border); min-height: 86px; padding: 14px 16px; }
  .pxd-pipeline__summary-item:last-child { border-inline-end: 0; }
  .pxd-pipeline__summary-label { color: var(--pxd-muted); display: block; font-size: 12px; font-weight: 600; }
  .pxd-pipeline__summary-value { display: block; font-size: 24px; font-variant-numeric: tabular-nums; font-weight: 600; margin-block-start: 5px; }
  .pxd-pipeline__summary-value--warning { color: var(--pxd-amber); }
  .pxd-pipeline__board-wrap { overflow-x: auto; padding-block-end: 8px; }
  .pxd-pipeline__board { display: grid; gap: 10px; grid-auto-columns: minmax(288px, 320px); grid-auto-flow: column; min-width: max-content; }
  .pxd-pipeline__column { background: color-mix(in srgb, var(--pxd-muted-surface) 75%, transparent); border: 1px solid var(--pxd-border); border-block-start: 4px solid var(--pxd-border); border-radius: 4px; display: flex; flex-direction: column; min-height: 420px; padding: 12px; }
  .pxd-pipeline__column[data-stage="intake"] { border-block-start-color: #647069; }
  .pxd-pipeline__column[data-stage="sourcing"] { border-block-start-color: #246bce; }
  .pxd-pipeline__column[data-stage="quoted"] { border-block-start-color: #087e8b; }
  .pxd-pipeline__column[data-stage="customer-order"] { border-block-start-color: #6f4aa8; }
  .pxd-pipeline__column[data-stage="vendor-order"] { border-block-start-color: #b65f18; }
  .pxd-pipeline__column[data-stage="delivery"] { border-block-start-color: #9a620e; }
  .pxd-pipeline__column[data-stage="invoicing"] { border-block-start-color: #a23b72; }
  .pxd-pipeline__column[data-stage="closed"] { border-block-start-color: var(--pxd-green); }
  .pxd-pipeline__column[data-stage="cancelled"] { border-block-start-color: var(--pxd-red); }
  .pxd-pipeline__column-header { border-block-end: 1px solid var(--pxd-border); margin-block-end: 12px; padding: 2px 2px 10px; }
  .pxd-pipeline__column-title-row { align-items: baseline; display: flex; gap: 8px; justify-content: space-between; }
  .pxd-pipeline__column h2 { font-size: 14px; margin: 0; }
  .pxd-pipeline__column-count { background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 999px; font-size: 11px; font-variant-numeric: tabular-nums; min-width: 25px; padding: 1px 7px; text-align: center; }
  .pxd-pipeline__column-description { color: var(--pxd-muted); font-size: 12px; margin: 4px 0 0; }
  .pxd-pipeline__card-list { display: grid; gap: 10px; list-style: none; margin: 0; padding: 0; }
  .pxd-pipeline__empty-column { color: var(--pxd-muted); font-size: 13px; margin: 8px 2px; }
  .pxd-pipeline__card { background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 4px; padding: 13px; }
  .pxd-pipeline__card--overdue { border-inline-start: 4px solid var(--pxd-red); }
  .pxd-pipeline__card-top { align-items: flex-start; display: flex; gap: 8px; justify-content: space-between; }
  .pxd-pipeline__card-title { font-size: 15px; line-height: 1.3; margin: 0; }
  .pxd-pipeline__link { color: var(--pxd-green); font-weight: 600; text-decoration-thickness: 1px; text-underline-offset: 2px; }
  .pxd-pipeline__link:visited { color: #5f3b8c; }
  .pxd-pipeline__tag { background: var(--pxd-muted-surface); border-radius: 4px; display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 6px; }
  .pxd-pipeline__tag--danger { background: color-mix(in srgb, var(--pxd-red) 12%, var(--pxd-surface)); color: var(--pxd-red); }
  .pxd-pipeline__tag--warning { background: color-mix(in srgb, var(--pxd-amber) 13%, var(--pxd-surface)); color: var(--pxd-amber); }
  .pxd-pipeline__badges { display: flex; flex-wrap: wrap; gap: 5px; margin-block: 9px; }
  .pxd-pipeline__card-project { color: var(--pxd-muted); font-size: 12px; margin: 4px 0 0; }
  .pxd-pipeline__detail { display: grid; gap: 5px 10px; grid-template-columns: minmax(84px, auto) minmax(0, 1fr); margin: 10px 0 0; }
  .pxd-pipeline__detail dt { color: var(--pxd-muted); font-size: 11px; }
  .pxd-pipeline__detail dd { font-size: 12px; margin: 0; overflow-wrap: anywhere; }
  .pxd-pipeline__evidence { border-block-start: 1px solid var(--pxd-border); margin-block-start: 11px; padding-block-start: 10px; }
  .pxd-pipeline__evidence-label { color: var(--pxd-muted); display: block; font-size: 11px; }
  .pxd-pipeline__amount { display: block; font-size: 16px; font-variant-numeric: tabular-nums; font-weight: 600; margin-block: 2px; }
  .pxd-pipeline__evidence-meta { color: var(--pxd-muted); font-size: 11px; }
  .pxd-pipeline__card-footer { align-items: center; display: flex; gap: 10px; justify-content: space-between; margin-block-start: 12px; }
  .pxd-pipeline__docs { color: var(--pxd-muted); font-size: 11px; }
  .pxd-pipeline__skeleton { animation: pxd-pipeline-pulse 1.4s ease-in-out infinite; background: var(--pxd-border); border-radius: 4px; height: 112px; opacity: .62; }
  .pxd-pipeline__isolate { unicode-bidi: isolate; }
  @keyframes pxd-pipeline-pulse { 50% { opacity: .32; } }
  @media (max-width: 1099px) {
    .pxd-pipeline__header { flex-direction: column; gap: 14px; }
    .pxd-pipeline__board-wrap { overflow-x: visible; }
    .pxd-pipeline__board { grid-auto-flow: row; grid-template-columns: 1fr; min-width: 0; }
    .pxd-pipeline__column { min-height: 0; }
    .pxd-pipeline__summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .pxd-pipeline__summary-item:nth-child(2) { border-inline-end: 0; }
    .pxd-pipeline__summary-item:nth-child(-n+2) { border-block-end: 1px solid var(--pxd-border); }
  }
  @media (max-width: 560px) {
    .pxd-pipeline { padding-inline: 12px; }
    .pxd-pipeline__tenant-brand { align-items: flex-start; flex-direction: column; }
    .pxd-pipeline__summary { grid-template-columns: 1fr; }
    .pxd-pipeline__summary-item, .pxd-pipeline__summary-item:nth-child(2) { border-block-end: 1px solid var(--pxd-border); border-inline-end: 0; }
    .pxd-pipeline__summary-item:last-child { border-block-end: 0; }
  }
  @media (prefers-reduced-motion: reduce) { .pxd-pipeline__skeleton { animation: none; } }
`;
