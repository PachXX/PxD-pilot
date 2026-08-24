import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  toVendorComparisonLocale,
  vendorComparisonCopy,
} from '../src/front-components/vendor-comparison.copy';
import { vendorComparisonStyles } from '../src/front-components/vendor-comparison.styles';
import { getOperationalProfitabilityDashboardFontStyles } from '../src/front-components/operational-profitability-dashboard.styles';

const componentSource = readFileSync(
  new URL(
    '../src/front-components/vendor-comparison.front-component.tsx',
    import.meta.url,
  ),
  'utf8',
);
const bundledFontPaths = [
  '../public/fonts/ibm-plex/IBMPlexSans-Regular.woff2',
  '../public/fonts/ibm-plex/IBMPlexSans-SemiBold.woff2',
  '../public/fonts/ibm-plex/IBMPlexSansArabic-Regular.woff2',
  '../public/fonts/ibm-plex/IBMPlexSansArabic-SemiBold.woff2',
  '../public/fonts/ibm-plex/IBMPlexMono-Regular.woff2',
] as const;

const relativeLuminance = (hex: string): number => {
  const channels = [0, 2, 4].map(
    (offset) =>
      Number.parseInt(hex.slice(1).slice(offset, offset + 2), 16) / 255,
  );
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
};

const contrastRatio = (foreground: string, background: string): number => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
};

const assertCopyValueComplete = (value: unknown, path: string): void => {
  if (typeof value === 'string') {
    assert.notEqual(value.trim(), '', `${path} must not be empty`);
    return;
  }

  if (typeof value === 'function') {
    const rendered = (value as (...args: string[]) => string)('value', '2');
    assert.notEqual(rendered.trim(), '', `${path} must render non-empty copy`);
    return;
  }

  if (Array.isArray(value)) {
    assert.ok(value.length > 0, `${path} must not be empty`);
    value.forEach((entry, index) =>
      assertCopyValueComplete(entry, `${path}[${index}]`),
    );
    return;
  }

  assert.ok(
    value !== null && typeof value === 'object',
    `${path} has an unsupported value`,
  );
  const entries = Object.entries(value);
  assert.ok(entries.length > 0, `${path} must have entries`);
  entries.forEach(([key, entry]) =>
    assertCopyValueComplete(entry, `${path}.${key}`),
  );
};

test('English and Arabic copy are exhaustive, meaningful and structurally equal', () => {
  assert.deepEqual(
    Object.keys(vendorComparisonCopy.en).sort(),
    Object.keys(vendorComparisonCopy.ar).sort(),
  );

  for (const locale of ['en', 'ar'] as const) {
    const copy = vendorComparisonCopy[locale];
    assertCopyValueComplete(copy, locale);
    assert.equal(copy.formulaSteps.length, 5);
    assert.equal(new Set(copy.formulaSteps).size, copy.formulaSteps.length);
    assert.deepEqual(
      Object.keys(copy.stages).sort(),
      Object.keys(vendorComparisonCopy.en.stages).sort(),
    );
  }

  assert.match(vendorComparisonCopy.ar.title, /\p{Script=Arabic}/u);
  assert.doesNotMatch(vendorComparisonCopy.en.title, /\p{Script=Arabic}/u);
  assert.equal(toVendorComparisonLocale('ar-SA'), 'ar');
  assert.equal(toVendorComparisonLocale('en-US'), 'en');
  assert.equal(toVendorComparisonLocale('de-DE'), 'en');
});

test('component source preserves bilingual, live-region and table-semantics foundations', () => {
  const requiredSourcePatterns = [
    /lang=\{locale\}/,
    /dir=\{locale === 'ar' \? 'rtl' : 'ltr'\}/,
    /data-color-scheme=\{colorScheme\}/,
    /aria-busy=\{loading\}/,
    /aria-live="polite"/,
    /role="alert"/,
    /role="status"/,
    /<table className="pxd-vc__table">/,
    /th scope="col"/,
    /<bdi className=/,
    /aria-label=\{copy\.dashboardLabel\}/,
    /getPublicAssetUrl\('fonts\/ibm-plex\//,
    /target="_top"/,
  ];
  requiredSourcePatterns.forEach((pattern) =>
    assert.match(componentSource, pattern),
  );
  assert.doesNotMatch(componentSource, /tabIndex=\{?[1-9]/);
  assert.doesNotMatch(componentSource, /fetch\(/);
  assert.doesNotMatch(componentSource, /mutat/);
});

test('styles preserve WCAG keyboard, target, RTL, dark and reduced-motion foundations', () => {
  const requiredStylePatterns = [
    /:focus-visible/,
    /min-height: 44px/,
    /prefers-reduced-motion: reduce/,
    /\.pxd-vc\[dir="rtl"\]/,
    /\.pxd-vc\[data-color-scheme="dark"\]/,
    /font-size: 16px/,
    /@media \(max-width: 899px\)/,
    /@media \(max-width: 560px\)/,
    /\.pxd-vc__link:visited/,
    /\.pxd-vc__table/,
  ];
  requiredStylePatterns.forEach((pattern) =>
    assert.match(vendorComparisonStyles, pattern),
  );
  assert.doesNotMatch(vendorComparisonStyles, /outline:\s*none/);
});

test('approved IBM Plex fonts are local public assets with runtime-safe URLs', () => {
  bundledFontPaths.forEach((path) =>
    assert.ok(
      readFileSync(new URL(path, import.meta.url)).byteLength > 10_000,
      `${path} is empty`,
    ),
  );

  const fontStyles = getOperationalProfitabilityDashboardFontStyles({
    sansRegular: '/assets/sans-regular.woff2',
    sansSemiBold: '/assets/sans-semibold.woff2',
    sansArabicRegular: '/assets/arabic-regular.woff2',
    sansArabicSemiBold: '/assets/arabic-semibold.woff2',
    monoRegular: '/assets/mono-regular.woff2',
  });
  assert.match(fontStyles, /font-family: "IBM Plex Sans"/);
  assert.match(fontStyles, /font-family: "IBM Plex Sans Arabic"/);
  assert.match(fontStyles, /font-family: "IBM Plex Mono"/);
  assert.match(fontStyles, /font-display: swap/);
});

test('text and tag colors meet WCAG AA contrast floors in both schemes', () => {
  const normalTextPairs = [
    ['#142019', '#ffffff'],
    ['#647069', '#ffffff'],
    ['#167a43', '#ffffff'],
    ['#b42318', '#ffffff'],
    ['#8a5700', '#ffffff'],
    ['#5f3b8c', '#ffffff'],
    ['#ebf2ee', '#17201b'],
    ['#aebbb4', '#17201b'],
    ['#ffffff', '#167a43'],
    ['#ffffff', '#8a5700'],
  ] as const;
  normalTextPairs.forEach(([foreground, background]) =>
    assert.ok(
      contrastRatio(foreground, background) >= 4.5,
      `${foreground} on ${background} must meet 4.5:1`,
    ),
  );
});
