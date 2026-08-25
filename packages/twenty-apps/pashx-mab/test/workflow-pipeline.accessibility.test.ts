import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { workflowPipelineStyles } from '../src/front-components/workflow-pipeline.styles';

const componentSource = readFileSync(
  new URL(
    '../src/front-components/workflow-pipeline.front-component.tsx',
    import.meta.url,
  ),
  'utf8',
);

test('preserves headings, ordered cards, live states and native keyboard order', () => {
  const requiredPatterns = [
    /<h1 className="pxd-pipeline__title">/,
    /<h2 id=\{`pxd-pipeline-stage-/,
    /<h3 className="pxd-pipeline__card-title">/,
    /<ol className="pxd-pipeline__card-list">/,
    /aria-busy=\{loading\}/,
    /aria-live="polite"/,
    /role="status"/,
    /<bdi/,
  ];
  requiredPatterns.forEach((pattern) => assert.match(componentSource, pattern));
  assert.doesNotMatch(componentSource, /tabIndex=\{?[1-9]/);
});

test('styles support visible focus, 44px targets, RTL, dark mode and exact 200% reflow', () => {
  const requiredPatterns = [
    /:focus-visible/,
    /min-height: 44px/,
    /\.pxd-pipeline\[dir="rtl"\]/,
    /\.pxd-pipeline\[data-color-scheme="dark"\]/,
    /font-size: 16px/,
    /@media \(max-width: 1099px\)/,
    /\.pxd-pipeline__board-wrap \{ overflow-x: visible; \}/,
    /grid-template-columns: 1fr/,
    /@media \(max-width: 560px\)/,
    /prefers-reduced-motion: reduce/,
    /\.pxd-pipeline__link:visited/,
  ];
  requiredPatterns.forEach((pattern) =>
    assert.match(workflowPipelineStyles, pattern),
  );
  assert.doesNotMatch(workflowPipelineStyles, /outline:\s*none/);
});
