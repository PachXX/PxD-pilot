export const vendorDirectoryStyles = `
  .pxd-vendor {
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
  .pxd-vendor[dir="rtl"] { font-family: "IBM Plex Sans Arabic", "IBM Plex Sans", sans-serif; }
  .pxd-vendor[data-color-scheme="dark"] {
    --pxd-canvas: var(--t-background-secondary, #101713);
    --pxd-surface: var(--t-background-primary, #17201b);
    --pxd-muted-surface: var(--t-background-tertiary, #1d2822);
    --pxd-ink: var(--t-font-color-primary, #ebf2ee);
    --pxd-muted: var(--t-font-color-secondary, #aebbb4);
    --pxd-border: var(--t-border-color-light, #39483f);
  }
  .pxd-vendor *, .pxd-vendor *::before, .pxd-vendor *::after { box-sizing: border-box; }
  .pxd-vendor__header { align-items: flex-start; display: flex; gap: 32px; justify-content: space-between; margin: 0 auto 32px; max-width: 1440px; }
  .pxd-vendor__tenant-brand { align-items: center; display: flex; gap: 14px; margin: 0 0 22px; }
  .pxd-vendor__tenant-logo { background: #fff; border: 1px solid var(--pxd-border); display: block; flex: 0 0 auto; height: 60px; overflow: hidden; position: relative; width: 132px; }
  .pxd-vendor__tenant-logo img { height: auto; left: 50%; max-width: none; position: absolute; top: 50%; transform: translate(-50%, -50%); width: 142%; }
  .pxd-vendor__welcome { font-size: 16px; font-weight: 600; margin: 0; }
  .pxd-vendor__eyebrow { color: var(--pxd-muted); font-size: 14px; font-weight: 600; margin: 0 0 8px; }
  .pxd-vendor__title { font-size: clamp(32px, 4vw, 48px); letter-spacing: -.045em; line-height: 1.05; margin: 0; }
  .pxd-vendor__subtitle { color: var(--pxd-muted); font-size: 18px; margin: 10px 0 0; max-width: 760px; }
  .pxd-vendor__as-of { color: var(--pxd-muted); font-size: 14px; margin: 24px 0 0; }
  .pxd-vendor__actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .pxd-vendor__button { align-items: center; background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 8px; color: var(--pxd-ink); cursor: pointer; display: inline-flex; font: inherit; font-weight: 600; justify-content: center; min-height: 44px; padding: 9px 14px; }
  .pxd-vendor__button--primary { background: var(--pxd-green); border-color: var(--pxd-green); color: #fff; }
  .pxd-vendor__button:disabled { cursor: not-allowed; opacity: .55; }
  .pxd-vendor__button:focus-visible, .pxd-vendor__link:focus-visible, .pxd-vendor__select:focus-visible { outline: 3px solid #2d8cff; outline-offset: 3px; }
  .pxd-vendor__main { display: grid; gap: 24px; grid-template-columns: minmax(0, 1fr) 380px; margin: 0 auto; max-width: 1440px; }
  .pxd-vendor__state { background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 6px; padding: 24px; }
  .pxd-vendor__notice { background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 6px; grid-column: 1 / -1; padding: 12px 14px; }
  .pxd-vendor__notice--error { border-color: var(--pxd-red); }
  .pxd-vendor__notice--success { border-color: var(--pxd-green); }
  .pxd-vendor__panel { background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 6px; padding: 20px; }
  .pxd-vendor__panel h2 { font-size: 16px; font-weight: 600; margin: 0 0 6px; }
  .pxd-vendor__panel > p { color: var(--pxd-muted); font-size: 14px; margin: 0 0 16px; }
  .pxd-vendor__muted { color: var(--pxd-muted); font-size: 14px; }
  .pxd-vendor__isolate { unicode-bidi: isolate; }
  .pxd-vendor__link { color: var(--pxd-green); font-weight: 600; }
  .pxd-vendor__link:visited { color: #5f3b8c; }
  .pxd-vendor__table-scroll { overflow-x: auto; }
  .pxd-vendor__table { border-collapse: collapse; font-size: 14px; min-width: 640px; width: 100%; }
  .pxd-vendor__table th { border-block-end: 2px solid var(--pxd-border); color: var(--pxd-muted); font-size: 12px; font-weight: 600; padding: 8px 10px; text-align: start; }
  .pxd-vendor__table td { border-block-end: 1px solid var(--pxd-border); padding: 10px; vertical-align: baseline; }
  .pxd-vendor__table-num { font-variant-numeric: tabular-nums; text-align: end; }
  .pxd-vendor__form { display: grid; gap: 14px; }
  .pxd-vendor__field { display: grid; gap: 6px; }
  .pxd-vendor__field label { font-size: 13px; font-weight: 600; }
  .pxd-vendor__select { background: var(--pxd-surface); border: 1px solid var(--pxd-border); border-radius: 6px; color: var(--pxd-ink); font: inherit; min-height: 44px; padding: 8px 10px; width: 100%; }
  .pxd-vendor__check { align-items: flex-start; display: flex; gap: 10px; padding: 6px 0; }
  .pxd-vendor__check input { height: 20px; margin: 2px 0 0; width: 20px; }
  .pxd-vendor__check-name { display: block; font-weight: 600; }
  .pxd-vendor__check-meta { color: var(--pxd-muted); display: block; font-size: 13px; }
  .pxd-vendor__hint { color: var(--pxd-muted); font-size: 12px; }
  .pxd-vendor__status { border-block-start: 1px solid var(--pxd-border); font-size: 14px; margin-block-start: 4px; padding-block-start: 12px; }
  .pxd-vendor__status--error { color: var(--pxd-red); }
  .pxd-vendor__status--success { color: var(--pxd-green); }

  @media (max-width: 1023px) {
    .pxd-vendor__main { grid-template-columns: 1fr; }
    .pxd-vendor__header { flex-direction: column; gap: 16px; }
  }
`;
