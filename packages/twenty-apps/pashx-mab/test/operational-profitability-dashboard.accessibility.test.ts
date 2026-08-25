import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  DASHBOARD_LOCALES,
  formatDashboardCount,
  formatDashboardDate,
  formatDashboardDateTime,
  operationalProfitabilityDashboardCopy,
  toDashboardLocale,
} from '../src/front-components/operational-profitability-dashboard.copy';
import {
  getOperationalProfitabilityDashboardFontStyles,
  operationalProfitabilityDashboardStyles,
} from '../src/front-components/operational-profitability-dashboard.styles';
import {
  PROFITABILITY_EXCLUSION_REASONS,
  type ProfitabilityContributionKind,
} from '../src/profitability/operational-profitability.types';

const componentSource = readFileSync(
  new URL(
    '../src/front-components/operational-profitability-dashboard.front-component.tsx',
    import.meta.url,
  ),
  'utf8',
);
const pageLayoutSource = readFileSync(
  new URL(
    '../src/page-layouts/operational-profitability.page-layout.ts',
    import.meta.url,
  ),
  'utf8',
);
const navigationMenuItemSource = readFileSync(
  new URL(
    '../src/navigation-menu-items/operational-profitability.navigation-menu-item.ts',
    import.meta.url,
  ),
  'utf8',
);
const applicationConfigSource = readFileSync(
  new URL('../src/application.config.ts', import.meta.url),
  'utf8',
);
const englishManifestCatalog = JSON.parse(
  readFileSync(new URL('../locales/en.json', import.meta.url), 'utf8'),
) as Record<string, string>;
const arabicManifestCatalog = JSON.parse(
  readFileSync(new URL('../locales/ar-SA.json', import.meta.url), 'utf8'),
) as Record<string, string>;
const bundledFontPaths = [
  '../public/fonts/ibm-plex/IBMPlexSans-Regular.woff2',
  '../public/fonts/ibm-plex/IBMPlexSans-SemiBold.woff2',
  '../public/fonts/ibm-plex/IBMPlexSansArabic-Regular.woff2',
  '../public/fonts/ibm-plex/IBMPlexSansArabic-SemiBold.woff2',
  '../public/fonts/ibm-plex/IBMPlexMono-Regular.woff2',
] as const;

const CONTRIBUTION_KINDS: readonly ProfitabilityContributionKind[] = [
  'REVENUE',
  'DIRECT_COST_DOCUMENT',
  'DIRECT_COST_EXPENSE',
];

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

test('English and Arabic dashboard copy are exhaustive, meaningful, and structurally equal', () => {
  assert.deepEqual(DASHBOARD_LOCALES, ['en', 'ar']);
  assert.deepEqual(
    Object.keys(operationalProfitabilityDashboardCopy.en).sort(),
    Object.keys(operationalProfitabilityDashboardCopy.ar).sort(),
  );

  for (const locale of DASHBOARD_LOCALES) {
    const copy = operationalProfitabilityDashboardCopy[locale];
    assertCopyValueComplete(copy, locale);
    assert.deepEqual(
      Object.keys(copy.exclusions).sort(),
      [...PROFITABILITY_EXCLUSION_REASONS].sort(),
    );
    assert.deepEqual(
      Object.keys(copy.contributionKinds).sort(),
      [...CONTRIBUTION_KINDS].sort(),
    );
    assert.equal(copy.inclusionRules.length, 6);
    assert.equal(new Set(copy.inclusionRules).size, copy.inclusionRules.length);
  }

  assert.match(
    operationalProfitabilityDashboardCopy.ar.title,
    /\p{Script=Arabic}/u,
  );
  assert.doesNotMatch(
    operationalProfitabilityDashboardCopy.en.title,
    /\p{Script=Arabic}/u,
  );
  assert.equal(toDashboardLocale('ar-SA'), 'ar');
  assert.equal(toDashboardLocale('en-US'), 'en');
  assert.equal(toDashboardLocale('de-DE'), 'en');
});

test('dashboard date formatting keeps invalid native-input states render-safe', () => {
  assert.equal(formatDashboardDate('', 'en'), '—');
  assert.equal(formatDashboardDate('bad-date', 'en'), '—');
  assert.equal(formatDashboardDate('2026-02-31', 'ar'), '—');
  assert.equal(formatDashboardDate('2026-08-20', 'en'), '20 Aug 2026');
});

test('manifest navigation and page-layout catalogs have complete Arabic translations', () => {
  assert.deepEqual(
    Object.keys(arabicManifestCatalog).sort(),
    Object.keys(englishManifestCatalog).sort(),
  );
  assert.equal(Object.keys(arabicManifestCatalog).length, 18);

  for (const [source, translation] of Object.entries(arabicManifestCatalog)) {
    assert.notEqual(
      translation.trim(),
      '',
      `${source} must have an Arabic translation`,
    );
    assert.match(
      translation,
      /\p{Script=Arabic}/u,
      `${source} must contain Arabic copy`,
    );
  }

  assert.equal(
    arabicManifestCatalog['Operational profitability'],
    'الربحية التشغيلية',
  );
  assert.equal(arabicManifestCatalog.Overview, 'نظرة عامة');
  assert.equal(arabicManifestCatalog['Command centre'], 'مركز القيادة');
  assert.equal(arabicManifestCatalog['Work queue'], 'قائمة العمل');
});

test('navigation item targets a standalone page layout accepted by Twenty', () => {
  assert.match(navigationMenuItemSource, /NavigationMenuItemType\.PAGE_LAYOUT/);
  assert.match(pageLayoutSource, /PageLayoutType\.STANDALONE_PAGE/);
  assert.doesNotMatch(pageLayoutSource, /PageLayoutType\.DASHBOARD/);
});

test('application branding is PxD and uses the bundled MAB tenant logo', () => {
  assert.match(applicationConfigSource, /displayName: 'PxD'/);
  assert.match(
    applicationConfigSource,
    /logo: 'public\/brand\/mab-indus-solutions-logo\.jpg'/,
  );
  assert.ok(
    readFileSync(
      new URL('../public/brand/mab-indus-solutions-logo.jpg', import.meta.url),
    ).byteLength > 10_000,
  );
});

test('locale formatting is explicit and keeps Riyadh as-of time deterministic', () => {
  assert.equal(formatDashboardCount(1234, 'en'), '1,234');
  assert.notEqual(
    formatDashboardCount(1234, 'ar'),
    formatDashboardCount(1234, 'en'),
  );
  assert.match(
    formatDashboardDateTime('2026-08-14T12:00:00.000Z', 'en'),
    /14 Aug 2026.*15:00/,
  );
  assert.match(
    formatDashboardDateTime('2026-08-14T12:00:00.000Z', 'ar'),
    /\p{Script=Arabic}/u,
  );
  assert.match(formatDashboardDate('2026-08-14', 'en'), /14 Aug 2026/);
  assert.match(formatDashboardDate('2026-08-14', 'ar'), /\p{Script=Arabic}/u);
});

test('approved IBM Plex fonts are local public assets with runtime-safe URLs', () => {
  bundledFontPaths.forEach((path) =>
    assert.ok(
      readFileSync(new URL(path, import.meta.url)).byteLength > 10_000,
      `${path} is empty`,
    ),
  );
  assert.match(
    readFileSync(
      new URL('../public/fonts/ibm-plex/LICENSE.txt', import.meta.url),
      'utf8',
    ),
    /SIL OPEN FONT LICENSE Version 1\.1/,
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
  assert.match(componentSource, /getPublicAssetUrl\('fonts\/ibm-plex\//);
});

test('source and styles preserve WCAG keyboard, target, state, and RTL foundations', () => {
  const requiredSourcePatterns = [
    /lang=\{locale\}/,
    /dir=\{locale === 'ar' \? 'rtl' : 'ltr'\}/,
    /data-color-scheme=\{colorScheme\}/,
    /aria-busy=\{loading\}/,
    /aria-live="polite"/,
    /role="alert"/,
    /role="status"/,
    /<label htmlFor=/,
    /role="img"/,
    /<table className="pxd-dashboard__table">/,
    /aria-hidden="true"/,
    /<DashboardSkeleton copy=\{copy\} \/>/,
    /aria-label=\{copy\.activeFiltersLabel\}/,
    /<bdi\s+className=/,
  ];
  requiredSourcePatterns.forEach((pattern) =>
    assert.match(componentSource, pattern),
  );
  assert.doesNotMatch(componentSource, /tabIndex=\{?[1-9]/);

  const requiredStylePatterns = [
    /:focus-visible/,
    /min-height: 44px/,
    /min-width: 88px/,
    /prefers-reduced-motion: reduce/,
    /\.pxd-dashboard\[dir="rtl"\]/,
    /\.pxd-dashboard\[data-color-scheme="dark"\]/,
    /stroke-dasharray:/,
    /font-size: 16px/,
    /@media \(max-width: 1199px\)/,
    /@media \(max-width: 767px\)/,
    /\.pxd-dashboard__evidence-link:visited/,
    /\.pxd-dashboard__record-link:visited/,
    /pxd-dashboard__skeleton-ledger/,
  ];
  requiredStylePatterns.forEach((pattern) =>
    assert.match(operationalProfitabilityDashboardStyles, pattern),
  );
  assert.doesNotMatch(
    operationalProfitabilityDashboardStyles,
    /outline:\s*none/,
  );
  assert.doesNotMatch(
    operationalProfitabilityDashboardStyles,
    /@media \(max-width: 1100px\)/,
  );
  assert.doesNotMatch(
    operationalProfitabilityDashboardStyles,
    /@media \(max-width: 720px\)/,
  );
});

test('fallback text, focus, chart, control, and dark-theme colors meet contrast floors', () => {
  const normalTextPairs = [
    ['#142019', '#ffffff'],
    ['#647069', '#ffffff'],
    ['#647069', '#f0f3f0'],
    ['#167a43', '#ffffff'],
    ['#9a620e', '#ffffff'],
    ['#b42318', '#ffffff'],
    ['#ebf2ee', '#17201b'],
    ['#a6b2ac', '#17201b'],
    ['#42b874', '#17201b'],
    ['#e8b354', '#17201b'],
    ['#ff8178', '#17201b'],
    ['#5f3b8c', '#ffffff'],
    ['#d0a9f5', '#17201b'],
  ] as const;
  normalTextPairs.forEach(([foreground, background]) =>
    assert.ok(
      contrastRatio(foreground, background) >= 4.5,
      `${foreground} on ${background} must meet 4.5:1`,
    ),
  );

  const nonTextPairs = [
    ['#78857e', '#ffffff'],
    ['#78857e', '#17201b'],
    ['#246bce', '#ffffff'],
    ['#83b4ff', '#17201b'],
    ['#2f7f53', '#17201b'],
  ] as const;
  nonTextPairs.forEach(([foreground, background]) =>
    assert.ok(
      contrastRatio(foreground, background) >= 3,
      `${foreground} on ${background} must meet 3:1`,
    ),
  );

  assert.ok(contrastRatio('#ffffff', '#167a43') >= 4.5);
  assert.ok(contrastRatio('#ffffff', '#2f7f53') >= 4.5);
});
