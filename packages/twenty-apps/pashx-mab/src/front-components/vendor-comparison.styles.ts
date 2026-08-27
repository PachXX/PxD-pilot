export const vendorComparisonStyles = `
  .pxd-vc {
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
  .pxd-vc[dir="rtl"] { font-family: "IBM Plex Sans Arabic", "IBM Plex Sans", sans-serif; }
  .pxd-vc[data-color-scheme="dark"] {
    --pxd-canvas: var(--t-background-secondary, #101713);
    --pxd-surface: var(--t-background-primary, #17201b);
    --pxd-muted-surface: var(--t-background-tertiary, #1d2822);
    --pxd-ink: var(--t-font-color-primary, #ebf2ee);
    --pxd-muted: var(--t-font-color-secondary, #aebbb4);
    --pxd-border: var(--t-border-color-light, #39483f);
  }
  .pxd-vc *, .pxd-vc *::before, .pxd-vc *::after { box-sizing: border-box; }
  .pxd-vc__header { align-items: flex-start; display: flex; gap: 32px; justify-content: space-between; margin: 0 auto 32px; max-width: 1440px; }
  .pxd-vc__tenant-brand { align-items: center; display: flex; gap: 14px; margin: 0 0 22px; }
  .pxd-vc__tenant-logo { background: #fff; border: 1px solid var(--pxd-border); display: block; flex: 0 0 auto; height: 60px; overflow: hidden; position: relative; width: 132px; }
  .pxd-vc__tenant-logo img { height: auto; left: 50%; max-width: none; position: absolute; top: 50%; transform: translate(-50%, -50%); width: 142%; }
  .pxd-vc__welcome { font-size: 16px; font-weight: 600; margin: 0; }
  .pxd-vc__eyebrow { color: var(--pxd-muted); font-size: 14px; font-weight: 600; margin: 0 0 8px; }
  .pxd-vc__title { font-size: clamp(32px, 4vw, 48px); letter-spacing: -.045em; line-height: 1.05; margin: 0; }
  .pxd-vc__subtitle { color: var(--pxd-muted); font-size: 18px; margin: 10px 0 0; max-width: 760px; }
  .pxd-vc__as-of { color: var(--pxd-muted); font-size: 14px; margin: 24px 0 0; }
  .pxd-vc__actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .pxd-vc__button { align-items: center; background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 8px; color: var(--pxd-ink); cursor: pointer; display: inline-flex; font: inherit; font-weight: 600; justify-content: center; min-height: 44px; padding: 9px 14px; }
  .pxd-vc__button--primary { background: var(--pxd-green); border-color: var(--pxd-green); color: #fff; }
  .pxd-vc__button:focus-visible, .pxd-vc__link:focus-visible { outline: 3px solid #2d8cff; outline-offset: 3px; }
  .pxd-vc__main { display: grid; gap: 24px; margin: 0 auto; max-width: 1440px; }
  .pxd-vc__state { background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 6px; padding: 24px; }
  .pxd-vc__notice { background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 6px; padding: 12px 14px; }
  .pxd-vc__notice[role="alert"] { border-color: var(--pxd-red); }
  .pxd-vc__panel { background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 6px; padding: 20px; }
  .pxd-vc__panel h2 { font-size: 16px; font-weight: 600; margin: 0 0 6px; }
  .pxd-vc__panel h3 { font-size: 14px; font-weight: 600; margin: 18px 0 8px; }
  .pxd-vc__panel-row { align-items: baseline; display: flex; gap: 8px; justify-content: space-between; }
  .pxd-vc__panel > p { color: var(--pxd-muted); font-size: 14px; margin: 0 0 16px; }
  .pxd-vc__muted { color: var(--pxd-muted); font-size: 14px; }
  .pxd-vc__isolate { unicode-bidi: isolate; }
  .pxd-vc__mono { direction: ltr; font-family: "IBM Plex Mono", var(--t-font-family-monospace, monospace); unicode-bidi: isolate; }
  .pxd-vc__sr-only { clip: rect(0 0 0 0); clip-path: inset(50%); height: 1px; overflow: hidden; position: absolute; white-space: nowrap; width: 1px; }
  .pxd-vc__link { color: var(--pxd-green); font-weight: 600; }
  .pxd-vc__link:visited { color: #5f3b8c; }

  .pxd-vc__detail { display: grid; gap: 6px 24px; grid-template-columns: max-content minmax(0, 1fr); margin: 0; }
  .pxd-vc__detail dt { color: var(--pxd-muted); font-size: 13px; }
  .pxd-vc__detail dd { font-size: 14px; margin: 0; }

  .pxd-vc__signals { display: grid; gap: 1px; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0; overflow: hidden; }
  .pxd-vc__signal { background: var(--pxd-muted-surface); display: grid; gap: 6px; min-width: 0; padding: 14px; }
  .pxd-vc__signal-label { color: var(--pxd-muted); font-size: 12px; font-weight: 600; }
  .pxd-vc__signal-value { font-size: 18px; font-variant-numeric: tabular-nums; font-weight: 600; margin: 0; }
  .pxd-vc__signal-formula { color: var(--pxd-muted); font-size: 11px; margin: 0; }

  .pxd-vc__table-scroll { overflow-x: auto; }
  .pxd-vc__table { border-collapse: collapse; font-size: 14px; min-width: 720px; width: 100%; }
  .pxd-vc__table th { border-block-end: 2px solid var(--pxd-border); color: var(--pxd-muted); font-size: 12px; font-weight: 600; padding: 8px 10px; text-align: start; }
  .pxd-vc__table td { border-block-end: 1px solid var(--pxd-border); padding: 10px; vertical-align: baseline; }
  .pxd-vc__table-num { font-variant-numeric: tabular-nums; }
  .pxd-vc__table td[data-numeric], .pxd-vc__table th[data-numeric] { direction: ltr; text-align: end; unicode-bidi: isolate; }
  .pxd-vc[dir="rtl"] .pxd-vc__table td[data-numeric], .pxd-vc[dir="rtl"] .pxd-vc__table th[data-numeric] { text-align: left; }

  .pxd-vc__tag { border-radius: 4px; display: inline-block; font-size: 12px; font-weight: 600; padding: 2px 8px; }
  .pxd-vc__tag--finalized { background: var(--pxd-green); color: #fff; }
  .pxd-vc__tag--draft { background: var(--pxd-muted-surface); color: var(--pxd-ink); }
  .pxd-vc__tag--expired { background: var(--pxd-amber); color: #fff; }
  .pxd-vc__tag--missing { background: var(--pxd-muted-surface); color: var(--pxd-muted); }

  .pxd-vc__ranking { counter-reset: none; list-style: none; margin: 0; padding: 0; }
  .pxd-vc__ranking-item { align-items: center; border-block-end: 1px solid var(--pxd-border); display: flex; gap: 12px; justify-content: space-between; padding: 10px 0; }
  .pxd-vc__ranking-item:last-child { border-block-end: 0; }
  .pxd-vc__rank { background: var(--pxd-green); border-radius: 4px; color: #fff; display: inline-block; font-size: 12px; font-weight: 600; min-width: 24px; padding: 2px 8px; text-align: center; }

  .pxd-vc__formula { list-style: decimal; margin: 0 0 0 20px; padding: 0; }
  .pxd-vc__formula li { color: var(--pxd-ink); font-size: 14px; margin: 4px 0; }
  .pxd-vc__exclusions { list-style: none; margin: 0; padding: 0; }
  .pxd-vc__exclusion { border-block-end: 1px solid var(--pxd-border); font-size: 14px; padding: 8px 0; }
  .pxd-vc__exclusion:last-child { border-block-end: 0; }

  .pxd-vc__quotes { list-style: none; margin: 0; padding: 0; }
  .pxd-vc__quote { align-items: center; border-block-end: 1px solid var(--pxd-border); display: flex; gap: 12px; justify-content: space-between; padding: 10px 0; }
  .pxd-vc__quote:last-child { border-block-end: 0; }

  .pxd-vc__split { display: grid; gap: 24px; grid-template-columns: minmax(0, 1fr) minmax(280px, 0.6fr); }
  .pxd-vc__stack { display: grid; gap: 24px; }

  @media (max-width: 899px) {
    .pxd-vc__header { flex-direction: column; gap: 16px; }
    .pxd-vc__signals { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .pxd-vc__split { grid-template-columns: 1fr; }
  }
  @media (max-width: 560px) {
    .pxd-vc__signals { grid-template-columns: 1fr; }
  }

  @media (prefers-reduced-motion: reduce) {
    .pxd-vc * { animation: none !important; transition: none !important; }
  }
`;
