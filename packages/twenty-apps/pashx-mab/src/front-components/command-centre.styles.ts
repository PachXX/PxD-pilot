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
    background: var(--pxd-canvas);
    box-sizing: border-box;
    color: var(--pxd-ink);
    font-family: "IBM Plex Sans", var(--t-font-family, sans-serif);
    font-size: 16px;
    line-height: 1.5;
    min-height: 100%;
    overflow-x: clip;
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
  .pxd-command__header { align-items: flex-start; display: flex; gap: 32px; justify-content: space-between; margin: 0 auto 32px; max-width: 1600px; }
  .pxd-command__tenant-brand { align-items: center; display: flex; gap: 14px; margin-block-end: 20px; }
  .pxd-command__tenant-brand p { font-weight: 600; margin: 0; }
  .pxd-command__tenant-logo { background: #fff; border: 1px solid var(--pxd-border); display: block; flex: 0 0 auto; height: 60px; overflow: hidden; position: relative; width: 132px; }
  .pxd-command__tenant-logo img { height: auto; inset-block-start: 50%; inset-inline-start: 50%; max-width: none; position: absolute; transform: translate(-50%, -50%); width: 142%; }
  .pxd-command[dir="rtl"] .pxd-command__tenant-logo img { transform: translate(50%, -50%); }
  .pxd-command__eyebrow, .pxd-command__as-of { color: var(--pxd-muted); font-size: 14px; margin: 0; }
  .pxd-command h1 { font-size: clamp(32px, 4vw, 48px); letter-spacing: -.045em; line-height: 1.05; margin: 8px 0 0; }
  .pxd-command__subtitle { color: var(--pxd-muted); font-size: 18px; margin: 10px 0 0; max-width: 820px; }
  .pxd-command__as-of { margin-block-start: 22px; }
  .pxd-command__actions { align-items: end; display: flex; flex-wrap: wrap; gap: 8px; }
  .pxd-command__case-selector { display: grid; font-size: 12px; font-weight: 600; gap: 4px; }
  .pxd-command__case-selector select, .pxd-command__button { background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 6px; color: var(--pxd-ink); font: inherit; min-height: 44px; padding: 9px 14px; }
  .pxd-command__button { align-items: center; cursor: pointer; display: inline-flex; font-weight: 600; justify-content: center; }
  .pxd-command__button--primary { background: var(--pxd-green); border-color: var(--pxd-green); color: #fff; }
  .pxd-command__button:focus-visible, .pxd-command__link:focus-visible, .pxd-command select:focus-visible { outline: 3px solid #2d8cff; outline-offset: 3px; }
  .pxd-command__main { margin: 0 auto; max-width: 1600px; }
  .pxd-command__notice, .pxd-command__state { background: var(--pxd-surface); border: 1px solid var(--pxd-border); margin: 0 0 18px; padding: 18px 20px; }
  .pxd-command__state { min-height: 160px; text-align: center; }
  .pxd-command__skeleton { background: linear-gradient(90deg, var(--pxd-muted-surface), var(--pxd-border), var(--pxd-muted-surface)); height: 64px; margin: 18px auto 0; max-width: 760px; width: 80%; }
  .pxd-command__summary { background: var(--pxd-border); border: 1px solid var(--pxd-border); display: grid; gap: 1px; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-block-end: 24px; }
  .pxd-command__summary-item { background: var(--pxd-surface); display: grid; min-height: 126px; padding: 20px; }
  .pxd-command__summary-label { color: var(--pxd-muted); font-size: 14px; font-weight: 600; }
  .pxd-command__summary-item strong { font-size: 38px; line-height: 1; margin-block: 7px; }
  .pxd-command__summary-item > span:last-child { color: var(--pxd-muted); font-size: 12px; }
  .pxd-command__pipeline, .pxd-command__ledger, .pxd-command__panel { background: var(--pxd-surface); border: 1px solid var(--pxd-border); }
  .pxd-command__pipeline { margin-block-end: 24px; }
  .pxd-command__section-header { align-items: start; border-block-end: 1px solid var(--pxd-border); display: flex; gap: 20px; justify-content: space-between; padding: 18px 20px; }
  .pxd-command__section-header h2, .pxd-command__panel h2 { font-size: 20px; margin: 0; }
  .pxd-command__section-header p, .pxd-command__panel > p { color: var(--pxd-muted); margin: 4px 0 0; }
  .pxd-command__section-header > span { color: var(--pxd-muted); font-size: 13px; white-space: nowrap; }
  .pxd-command__pipeline ol { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); list-style: none; margin: 0; padding: 0; }
  .pxd-command__pipeline li { align-items: center; border-inline-end: 1px solid var(--pxd-border); display: grid; gap: 8px; min-height: 92px; padding: 14px; }
  .pxd-command__pipeline li:last-child { border-inline-end: 0; }
  .pxd-command__pipeline li span { color: var(--pxd-muted); font-size: 12px; }
  .pxd-command__pipeline li strong { font-size: 24px; }
  .pxd-command__stage-unrecorded { border-block-start: 3px solid var(--pxd-amber); }
  .pxd-command__workspace { align-items: start; display: grid; gap: 24px; grid-template-columns: minmax(0, 3fr) minmax(260px, 1fr); }
  .pxd-command__table-scroll { max-width: 100%; overflow-x: auto; }
  .pxd-command__table { border-collapse: collapse; min-width: 1180px; table-layout: fixed; width: 100%; }
  .pxd-command__table th { color: var(--pxd-muted); font-size: 12px; font-weight: 600; padding: 11px 12px; text-align: start; }
  .pxd-command__table th[scope="row"] { color: var(--pxd-ink); width: 15%; }
  .pxd-command__table td, .pxd-command__table th[scope="row"] { border-block-start: 1px solid var(--pxd-border); font-size: 12px; overflow-wrap: anywhere; padding: 14px 12px; vertical-align: top; }
  .pxd-command__table td { width: 14%; }
  .pxd-command__table td > strong, .pxd-command__table td > span, .pxd-command__table th[scope="row"] > span { display: block; margin-block-end: 5px; }
  .pxd-command__link { color: var(--pxd-green); display: inline-flex; font-weight: 600; min-height: 44px; align-items: center; overflow-wrap: anywhere; }
  .pxd-command__muted { color: var(--pxd-muted); }
  .pxd-command__inline-links, .pxd-command__source-list { list-style: none; margin: 4px 0 0; padding: 0; }
  .pxd-command__inline-links li + li { border-block-start: 1px solid var(--pxd-border); }
  .pxd-command__identity { display: grid; gap: 1px; }
  .pxd-command__identity small { color: var(--pxd-muted); }
  .pxd-command__cash > strong { display: block; }
  .pxd-command__compact-list { margin: 8px 0; }
  .pxd-command__compact-list > div { display: flex; gap: 10px; justify-content: space-between; }
  .pxd-command__compact-list dt { color: var(--pxd-muted); }
  .pxd-command__compact-list dd { margin: 0; text-align: end; }
  .pxd-command__side { align-content: start; display: grid; gap: 24px; }
  .pxd-command__panel { padding: 18px 20px; }
  .pxd-command__panel--gaps { border-block-start: 4px solid var(--pxd-amber); }
  .pxd-command__zero { background: var(--pxd-muted-surface); display: grid; gap: 4px; margin: 14px 0 0; padding: 14px; }
  .pxd-command__evidence-list { list-style: none; margin: 14px 0 0; padding: 0; }
  .pxd-command__evidence-list > li { border-block-start: 1px solid var(--pxd-border); display: grid; gap: 5px; padding-block: 14px; }
  .pxd-command__tag { color: var(--pxd-green); font-size: 12px; font-weight: 600; text-transform: uppercase; }
  .pxd-command__capabilities { margin: 14px 0 0; }
  .pxd-command__capabilities > div { border-block-start: 1px solid var(--pxd-border); display: flex; gap: 12px; justify-content: space-between; padding-block: 11px; }
  .pxd-command__capabilities dd { color: var(--pxd-amber); font-weight: 600; margin: 0; text-align: end; }
  .pxd-command__email-candidates { list-style: none; margin: 14px 0 0; padding: 0; }
  .pxd-command__email-candidate { border-block-start: 1px solid var(--pxd-border); display: grid; gap: 5px; padding-block: 14px; }
  .pxd-command__review-badge { color: var(--pxd-muted); font-size: 11px; font-weight: 600; margin-inline-start: 8px; text-transform: uppercase; }
  .pxd-command__tag--task-prepare_quotation { color: #185f9d; }
  .pxd-command__tag--task-capture_purchase_order { color: var(--pxd-green); }
  .pxd-command__tag--task-capture_delivery_note { color: #8a5700; }
  .pxd-command__tag--task-capture_invoice { color: #b42318; }
  .pxd-command__email-subject { font-size: 14px; font-weight: 600; margin: 0; overflow-wrap: anywhere; }
  .pxd-command__email-meta { margin: 4px 0 0; }
  .pxd-command__email-meta > div { display: flex; font-size: 12px; gap: 12px; justify-content: space-between; padding-block: 3px; }
  .pxd-command__email-meta dt { color: var(--pxd-muted); }
  .pxd-command__email-meta dd { margin: 0; overflow-wrap: anywhere; text-align: end; }
  .pxd-command__email-candidate .pxd-command__link { font-size: 12px; margin-block-start: 4px; }
  .pxd-command bdi, .pxd-command [dir="ltr"] { unicode-bidi: isolate; }
  @media (prefers-reduced-motion: reduce) {
    .pxd-command *, .pxd-command *::before, .pxd-command *::after { animation: none !important; scroll-behavior: auto !important; transition: none !important; }
  }
  @media (max-width: 1100px) {
    .pxd-command__workspace { grid-template-columns: 1fr; }
    .pxd-command__pipeline ol { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .pxd-command__pipeline li:nth-child(4n) { border-inline-end: 0; }
  }
  @media (max-width: 760px) {
    .pxd-command { padding: 16px; }
    .pxd-command__header { display: block; }
    .pxd-command__actions { margin-block-start: 16px; }
    .pxd-command__summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .pxd-command__pipeline ol { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .pxd-command__pipeline li:nth-child(2n) { border-inline-end: 0; }
    .pxd-command__section-header { display: block; }
    .pxd-command__section-header > span { display: block; margin-block-start: 6px; }
    .pxd-command__table { min-width: 0; }
    .pxd-command__table thead { display: none; }
    .pxd-command__table tbody, .pxd-command__table tr, .pxd-command__table td, .pxd-command__table th[scope="row"] { display: block; width: auto; }
    .pxd-command__table tr { border-block-start: 1px solid var(--pxd-border); padding: 12px 16px; }
    .pxd-command__table td, .pxd-command__table th[scope="row"] { border: 0; display: grid; grid-template-columns: minmax(110px, .8fr) minmax(0, 1.2fr); padding: 8px 0; }
    .pxd-command__table td::before, .pxd-command__table th[scope="row"]::before { color: var(--pxd-muted); content: attr(data-label); font-size: 12px; font-weight: 600; }
  }
  @media (max-width: 480px) {
    .pxd-command__tenant-brand { align-items: flex-start; flex-direction: column; }
    .pxd-command__summary, .pxd-command__pipeline ol { grid-template-columns: 1fr; }
    .pxd-command__pipeline li { border-inline-end: 0; }
    .pxd-command__table td, .pxd-command__table th[scope="row"] { grid-template-columns: 1fr; }
  }
`;
