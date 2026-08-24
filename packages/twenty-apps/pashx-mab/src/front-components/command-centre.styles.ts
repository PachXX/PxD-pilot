export const commandCentreStyles = `
  .pxd-command {
    --pxd-canvas: var(--t-background-secondary, #f6f8f5);
    --pxd-surface: var(--t-background-primary, #ffffff);
    --pxd-muted-surface: var(--t-background-tertiary, #f0f3f0);
    --pxd-ink: var(--t-font-color-primary, #142019);
    --pxd-muted: var(--t-font-color-secondary, #647069);
    --pxd-border: var(--t-border-color-light, #dce3df);
    --pxd-green: #167a43;
    --pxd-red: #b42318;
    --pxd-amber: #8a5700;
    --pxd-blue: #185f9d;
    background: var(--pxd-canvas);
    box-sizing: border-box;
    color: var(--pxd-ink);
    font-family: "IBM Plex Sans", var(--t-font-family, sans-serif);
    font-size: 16px;
    line-height: 1.5;
    min-height: 100%;
    padding: 32px clamp(20px, 4vw, 56px) 48px;
  }
  .pxd-command[dir="rtl"] { font-family: "IBM Plex Sans Arabic", "IBM Plex Sans", sans-serif; }
  .pxd-command[data-color-scheme="dark"] {
    --pxd-canvas: var(--t-background-secondary, #101713);
    --pxd-surface: var(--t-background-primary, #17201b);
    --pxd-muted-surface: var(--t-background-tertiary, #1d2822);
    --pxd-ink: var(--t-font-color-primary, #ebf2ee);
    --pxd-muted: var(--t-font-color-secondary, #aebbb4);
    --pxd-border: var(--t-border-color-light, #39483f);
  }
  .pxd-command *, .pxd-command *::before, .pxd-command *::after { box-sizing: border-box; }
  .pxd-command__header { align-items: flex-start; display: flex; gap: 32px; justify-content: space-between; margin: 0 auto 40px; max-width: 1440px; }
  .pxd-command__tenant-brand { align-items: center; display: flex; gap: 14px; margin: 0 0 22px; }
  .pxd-command__tenant-logo { background: #fff; border: 1px solid var(--pxd-border); display: block; flex: 0 0 auto; height: 60px; overflow: hidden; position: relative; width: 132px; }
  .pxd-command__tenant-logo img { height: auto; left: 50%; max-width: none; position: absolute; top: 50%; transform: translate(-50%, -50%); width: 142%; }
  .pxd-command__welcome { font-size: 16px; font-weight: 600; margin: 0; }
  .pxd-command__eyebrow { color: var(--pxd-muted); font-size: 14px; font-weight: 600; margin: 0 0 8px; }
  .pxd-command__title { font-size: clamp(32px, 4vw, 48px); letter-spacing: -.045em; line-height: 1.05; margin: 0; }
  .pxd-command__subtitle { color: var(--pxd-muted); font-size: 18px; margin: 10px 0 0; max-width: 760px; }
  .pxd-command__as-of { color: var(--pxd-muted); font-size: 14px; margin: 24px 0 0; }
  .pxd-command__actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .pxd-command__button { align-items: center; background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 8px; color: var(--pxd-ink); cursor: pointer; display: inline-flex; font: inherit; font-weight: 600; justify-content: center; min-height: 44px; padding: 9px 14px; }
  .pxd-command__button--primary { background: var(--pxd-green); border-color: var(--pxd-green); color: #fff; }
  .pxd-command__button:focus-visible, .pxd-command__link:focus-visible { outline: 3px solid #2d8cff; outline-offset: 3px; }
  .pxd-command__main { margin: 0 auto; max-width: 1440px; }
  .pxd-command__notice { background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 6px; margin: 0 0 16px; padding: 12px 14px; }
  .pxd-command__summary { background: var(--pxd-border); border: 1px solid var(--pxd-border); display: grid; gap: 1px; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-bottom: 24px; }
  .pxd-command__summary-item { align-items: center; background: var(--pxd-surface); display: grid; grid-template-columns: auto 1fr; min-height: 132px; padding: 24px; }
  .pxd-command__summary-label { color: var(--pxd-muted); font-size: 14px; font-weight: 600; }
  .pxd-command__summary-count { display: block; font-size: 42px; grid-column: 2; letter-spacing: -.04em; line-height: 1.05; margin-top: 8px; }
  .pxd-command__summary-description { color: var(--pxd-muted); display: block; font-size: 12px; grid-column: 2; margin-top: 8px; }
  .pxd-command__signal-dot { background: currentColor; border-radius: 50%; display: inline-block; height: 8px; margin-inline-end: 9px; width: 8px; }
  .pxd-command__signal-dot--compliance_exception, .pxd-command__signal--compliance_exception { color: var(--pxd-red); }
  .pxd-command__signal-dot--approval_required, .pxd-command__signal--approval_required { color: var(--pxd-blue); }
  .pxd-command__signal-dot--blocked_data, .pxd-command__signal--blocked_data { color: var(--pxd-amber); }
  .pxd-command__signal-dot--action_required, .pxd-command__signal--action_required { color: var(--pxd-green); }
  .pxd-command__workspace { align-items: start; display: grid; gap: 24px; grid-template-columns: minmax(0, 3fr) minmax(240px, 1fr); }
  .pxd-command__ledger { background: var(--pxd-surface); border: 1px solid var(--pxd-border); }
  .pxd-command__section-header { align-items: start; border-bottom: 1px solid var(--pxd-border); display: flex; gap: 20px; justify-content: space-between; padding: 20px 24px; }
  .pxd-command__section-header h2 { font-size: 20px; margin: 0; }
  .pxd-command__section-header p { color: var(--pxd-muted); margin: 4px 0 0; }
  .pxd-command__section-header > span { color: var(--pxd-muted); font-size: 13px; white-space: nowrap; }
  .pxd-command__table-scroll { overflow-x: auto; }
  .pxd-command__table { border-collapse: collapse; min-width: 820px; table-layout: fixed; width: 100%; }
  .pxd-command__table th { color: var(--pxd-muted); font-size: 12px; font-weight: 600; letter-spacing: .02em; padding: 11px 14px; text-align: start; }
  .pxd-command__table td { border-top: 1px solid var(--pxd-border); font-size: 13px; min-width: 0; overflow-wrap: anywhere; padding: 13px 14px; vertical-align: middle; }
  .pxd-command__table th:nth-child(1) { width: 18%; }
  .pxd-command__table th:nth-child(2) { width: 27%; }
  .pxd-command__table th:nth-child(3) { width: 12%; }
  .pxd-command__table th:nth-child(4) { width: 16%; }
  .pxd-command__table th:nth-child(5) { width: 13%; }
  .pxd-command__table th:nth-child(6) { width: 14%; }
  .pxd-command__signal { align-items: center; display: inline-flex; font-size: 12px; font-weight: 600; }
  .pxd-command__case { color: var(--pxd-muted); display: block; font-size: 12px; margin-top: 3px; }
  .pxd-command__side { align-content: start; display: grid; gap: 24px; }
  .pxd-command__panel { background: var(--pxd-surface); border: 1px solid var(--pxd-border); padding: 20px 22px; }
  .pxd-command__panel--unavailable { border-top: 4px solid var(--pxd-amber); }
  .pxd-command__panel h2 { font-size: 20px; margin: 0; }
  .pxd-command__panel-body { color: var(--pxd-muted); font-size: 14px; margin: 6px 0 0; }
  .pxd-command__panel-state { border-top: 1px solid var(--pxd-border); margin-top: 16px; padding-top: 14px; }
  .pxd-command__panel-state-title { font-weight: 600; margin: 0; }
  .pxd-command__insights { list-style: none; margin: 16px 0 0; padding: 0; }
  .pxd-command__insight { border-top: 1px solid var(--pxd-border); padding: 16px 0 0; }
  .pxd-command__insight:first-child { border-top: 0; padding-top: 0; }
  .pxd-command__tag { background: var(--pxd-muted-surface); border-radius: 4px; display: inline-block; font-size: 12px; font-weight: 600; padding: 3px 8px; }
  .pxd-command__tag--observation { color: var(--pxd-amber); }
  .pxd-command__tag--suggestion { color: var(--pxd-green); }
  .pxd-command__tag--data_quality { color: var(--pxd-red); }
  .pxd-command__insight-narrative { font-size: 14px; margin: 10px 0 0; overflow-wrap: anywhere; }
  .pxd-command__insight-meta { margin: 12px 0 0; }
  .pxd-command__insight-meta > div { display: flex; font-size: 12px; gap: 12px; justify-content: space-between; padding: 4px 0; }
  .pxd-command__insight-meta dt { color: var(--pxd-muted); }
  .pxd-command__insight-meta dd { margin: 0; overflow-wrap: anywhere; text-align: end; }
  .pxd-command__sources { margin: 12px 0 0; }
  .pxd-command__sources-label { color: var(--pxd-muted); display: block; font-size: 12px; font-weight: 600; }
  .pxd-command__sources-list { list-style: none; margin: 4px 0 0; padding: 0; }
  .pxd-command__sources-list .pxd-command__link { font-size: 12px; }
  .pxd-command__source-plain { color: var(--pxd-muted); direction: ltr; font-family: "IBM Plex Mono", monospace; font-size: 12px; overflow-wrap: anywhere; padding: 10px 0; unicode-bidi: isolate; }
  .pxd-command__source-note { font-size: 11px; margin: 4px 0 0; }
  .pxd-command__unavailable-list { margin: 16px 0 0; }
  .pxd-command__unavailable-list > div { border-top: 1px solid var(--pxd-border); padding: 13px 0; }
  .pxd-command__unavailable-list dt { font-size: 14px; font-weight: 600; }
  .pxd-command__unavailable-list dd { display: flex; flex-direction: column; font-size: 13px; gap: 4px; margin: 6px 0 0; }
  .pxd-command__unavailable-state { color: var(--pxd-amber); font-size: 12px; letter-spacing: .04em; }
  .pxd-command__link { align-items: center; color: var(--pxd-green); display: inline-flex; font-weight: 600; min-height: 44px; }
  .pxd-command__empty, .pxd-command__state { background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 6px; padding: 28px; text-align: center; }
  .pxd-command__empty h2, .pxd-command__state h2 { margin-top: 0; }
  .pxd-command__muted { color: var(--pxd-muted); }
  .pxd-command__isolate { direction: ltr; font-family: "IBM Plex Mono", monospace; font-size: 12px; unicode-bidi: isolate; }
  @media (prefers-reduced-motion: reduce) {
    .pxd-command *, .pxd-command *::before, .pxd-command *::after { scroll-behavior: auto !important; }
  }
  @media (max-width: 900px) {
    .pxd-command { padding: 16px; }
    .pxd-command__header { display: block; }
    .pxd-command__actions { margin-top: 14px; }
    .pxd-command__workspace { grid-template-columns: 1fr; }
    .pxd-command__summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .pxd-command__summary-item { min-height: 108px; }
  }
  @media (max-width: 560px) {
    .pxd-command__tenant-brand { align-items: flex-start; flex-direction: column; }
    .pxd-command__summary { grid-template-columns: 1fr; }
    .pxd-command__summary-item { min-height: 96px; padding: 18px; }
    .pxd-command__section-header { display: block; }
    .pxd-command__section-header > span { display: block; margin-top: 8px; }
    .pxd-command__table { min-width: 0; }
    .pxd-command__table thead { display: none; }
    .pxd-command__table tbody, .pxd-command__table tr, .pxd-command__table td { display: block; }
    .pxd-command__table tr { border-top: 1px solid var(--pxd-border); padding: 12px 16px; }
    .pxd-command__table td { border: 0; display: grid; gap: 12px; grid-template-columns: minmax(92px, .7fr) 1.3fr; padding: 7px 0; }
    .pxd-command__table td::before { color: var(--pxd-muted); content: attr(data-label); font-size: 12px; font-weight: 600; }
  }
`;
