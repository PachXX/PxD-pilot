import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PASHX_MINIMUM_TEXT_LAYER_CHARACTERS_PER_PAGE,
  routeDocumentExtraction,
} from '../dist/index.js';

test('routes complete text layers without OCR', () => {
  assert.deepEqual(
    routeDocumentExtraction([
      PASHX_MINIMUM_TEXT_LAYER_CHARACTERS_PER_PAGE,
      500,
    ]),
    { valid: true, path: 'TEXT_LAYER' },
  );
});

test('routes image-only documents to OCR', () => {
  assert.deepEqual(routeDocumentExtraction([0, 12]), {
    valid: true,
    path: 'OCR_ONLY',
  });
});

test('routes mixed PDFs through text extraction plus page OCR', () => {
  assert.deepEqual(routeDocumentExtraction([600, 0, 900]), {
    valid: true,
    path: 'HYBRID_OCR',
  });
});

test('rejects empty, negative, fractional and unsafe page counts', () => {
  for (const counts of [[], [-1], [1.5], [Number.MAX_VALUE]]) {
    assert.deepEqual(routeDocumentExtraction(counts), {
      valid: false,
      fieldPaths: ['pageTextCharacters'],
    });
  }
});
