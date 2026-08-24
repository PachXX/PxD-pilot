export const caseWorkflowStyles = `
  .pxd-case {
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
  .pxd-case[dir="rtl"] { font-family: "IBM Plex Sans Arabic", "IBM Plex Sans", sans-serif; }
  .pxd-case[data-color-scheme="dark"] {
    --pxd-canvas: var(--t-background-secondary, #101713);
    --pxd-surface: var(--t-background-primary, #17201b);
    --pxd-muted-surface: var(--t-background-tertiary, #1d2822);
    --pxd-ink: var(--t-font-color-primary, #ebf2ee);
    --pxd-muted: var(--t-font-color-secondary, #aebbb4);
    --pxd-border: var(--t-border-color-light, #39483f);
  }
  .pxd-case *, .pxd-case *::before, .pxd-case *::after { box-sizing: border-box; }
  .pxd-case__header { align-items: flex-start; display: flex; gap: 32px; justify-content: space-between; margin: 0 auto 32px; max-width: 1440px; }
  .pxd-case__tenant-brand { align-items: center; display: flex; gap: 14px; margin: 0 0 22px; }
  .pxd-case__tenant-logo { background: #fff; border: 1px solid var(--pxd-border); display: block; flex: 0 0 auto; height: 60px; overflow: hidden; position: relative; width: 132px; }
  .pxd-case__tenant-logo img { height: auto; left: 50%; max-width: none; position: absolute; top: 50%; transform: translate(-50%, -50%); width: 142%; }
  .pxd-case__welcome { font-size: 16px; font-weight: 600; margin: 0; }
  .pxd-case__eyebrow { color: var(--pxd-muted); font-size: 14px; font-weight: 600; margin: 0 0 8px; }
  .pxd-case__title { font-size: clamp(32px, 4vw, 48px); letter-spacing: -.045em; line-height: 1.05; margin: 0; }
  .pxd-case__subtitle { color: var(--pxd-muted); font-size: 18px; margin: 10px 0 0; max-width: 760px; }
  .pxd-case__as-of { color: var(--pxd-muted); font-size: 14px; margin: 24px 0 0; }
  .pxd-case__actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .pxd-case__button { align-items: center; background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 8px; color: var(--pxd-ink); cursor: pointer; display: inline-flex; font: inherit; font-weight: 600; justify-content: center; min-height: 44px; padding: 9px 14px; }
  .pxd-case__button--primary { background: var(--pxd-green); border-color: var(--pxd-green); color: #fff; }
  .pxd-case__button:focus-visible, .pxd-case__link:focus-visible { outline: 3px solid #2d8cff; outline-offset: 3px; }
  .pxd-case__main { display: grid; gap: 24px; grid-template-columns: 320px minmax(0, 1fr); margin: 0 auto; max-width: 1440px; }
  .pxd-case__state { background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 6px; padding: 24px; }
  .pxd-case__notice { background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 6px; grid-column: 1 / -1; padding: 12px 14px; }
  .pxd-case__notice[role="alert"] { border-color: var(--pxd-red); }
  .pxd-case__panel { background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 6px; padding: 20px; }
  .pxd-case__panel h2 { font-size: 16px; font-weight: 600; margin: 0 0 6px; }
  .pxd-case__panel > p { color: var(--pxd-muted); font-size: 14px; margin: 0 0 16px; }
  .pxd-case__muted { color: var(--pxd-muted); font-size: 14px; }
  .pxd-case__isolate { unicode-bidi: isolate; }
  .pxd-case__sr-only { clip: rect(0 0 0 0); clip-path: inset(50%); height: 1px; overflow: hidden; position: absolute; white-space: nowrap; width: 1px; }
  .pxd-case__link { color: var(--pxd-green); font-weight: 600; }
  .pxd-case__link:visited { color: #5f3b8c; }

  .pxd-case__case-list { list-style: none; margin: 0; padding: 0; }
  .pxd-case__case-item { border-block-end: 1px solid var(--pxd-border); padding: 12px 4px; }
  .pxd-case__case-item:first-child { padding-block-start: 4px; }
  .pxd-case__case-item:last-child { border-block-end: 0; padding-block-end: 4px; }
  .pxd-case__case-button { background: none; border: 0; color: inherit; cursor: pointer; font: inherit; padding: 0; text-align: start; width: 100%; }
  .pxd-case__case-button:hover .pxd-case__case-name { color: var(--pxd-green); }
  .pxd-case__case-name { display: block; font-weight: 600; }
  .pxd-case__case-meta { color: var(--pxd-muted); display: block; font-size: 13px; margin-block-start: 4px; }
  .pxd-case__case-row { display: flex; gap: 8px; justify-content: space-between; align-items: baseline; }
  .pxd-case__tag { background: var(--pxd-muted-surface); border-radius: 4px; display: inline-block; font-size: 12px; font-weight: 600; padding: 2px 8px; }
  .pxd-case__tag--current { background: var(--pxd-green); color: #fff; }

  .pxd-case__rail { align-items: stretch; display: flex; gap: 6px; list-style: none; margin: 0; overflow-x: auto; padding: 0 0 8px; }
  .pxd-case__rail-item { border-block-start: 4px solid var(--pxd-border); flex: 1 0 96px; padding: 10px 6px 0; }
  .pxd-case__rail-item--complete { border-block-start-color: var(--pxd-green); }
  .pxd-case__rail-item--current { border-block-start-color: var(--pxd-blue); }
  .pxd-case__rail-item--cancelled { border-block-start-color: var(--pxd-red); }
  .pxd-case__rail-stage { display: block; font-size: 13px; font-weight: 600; }
  .pxd-case__rail-state { color: var(--pxd-muted); display: block; font-size: 12px; }

  .pxd-case__table-scroll { overflow-x: auto; }
  .pxd-case__table { border-collapse: collapse; font-size: 14px; min-width: 640px; width: 100%; }
  .pxd-case__table th { border-block-end: 2px solid var(--pxd-border); color: var(--pxd-muted); font-size: 12px; font-weight: 600; padding: 8px 10px; text-align: start; }
  .pxd-case__table td { border-block-end: 1px solid var(--pxd-border); padding: 10px; vertical-align: baseline; }
  .pxd-case__table td:last-child, .pxd-case__table th:last-child { text-align: end; }
  .pxd-case__table-num { font-variant-numeric: tabular-nums; }

  .pxd-case__gates { list-style: none; margin: 0; padding: 0; }
  .pxd-case__gate { align-items: center; border-block-end: 1px solid var(--pxd-border); display: flex; gap: 10px; justify-content: space-between; padding: 10px 0; }
  .pxd-case__gate:last-child { border-block-end: 0; }
  .pxd-case__gate-state { border-radius: 4px; font-size: 12px; font-weight: 600; padding: 3px 10px; }
  .pxd-case__gate-state--ok { background: var(--pxd-green); color: #fff; }
  .pxd-case__gate-state--missing { background: var(--pxd-amber); color: #fff; }

  .pxd-case__detail { display: grid; gap: 6px 24px; grid-template-columns: max-content max-content; margin: 0; }
  .pxd-case__detail dt { color: var(--pxd-muted); font-size: 13px; }
  .pxd-case__detail dd { font-size: 14px; margin: 0; }

  @media (max-width: 899px) {
    .pxd-case__main { grid-template-columns: 1fr; }
    .pxd-case__header { flex-direction: column; gap: 16px; }
    .pxd-case__rail-item { flex: 1 0 132px; }
  }
`;
