import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

import {
  PASHX_COMMAND_ERROR_DEFINITIONS,
  PASHX_COMMAND_EXCEPTION_CODES,
  PASHX_COMMAND_NAMES,
  PASHX_MAB_CAPABILITIES,
  PASHX_MAB_APPLICATION_UNIVERSAL_IDENTIFIER,
  PASHX_MAB_CAPABILITY_NAMES,
  PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_CONTRACT_VERSION,
  PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_OBJECT_NAMES,
  PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_ROLE_CAPABILITY_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_ROLE_CAPABILITIES,
  PASHX_MAB_ROLE_KEYS,
  PASHX_MAB_ROLE_UNIVERSAL_IDENTIFIERS,
  getPashxCommandErrorMessage,
  isIsoCurrencyCode,
  isPashxCommandName,
  isPashxMabCapability,
  isSafeAmountMicros,
  isValidExpectedVersion,
  validateCreateVendorPurchaseOrderRequest,
} from '../dist/index.js';

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const leafValues = (value) =>
  typeof value === 'object' && value !== null
    ? Object.values(value).flatMap(leafValues)
    : [value];

test('object and capability identifiers are valid and unique', () => {
  const identifiers = [
    PASHX_MAB_APPLICATION_UNIVERSAL_IDENTIFIER,
    ...Object.values(PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS),
    ...Object.values(PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS),
    ...leafValues(PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS),
    ...leafValues(PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS),
    ...leafValues(PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS),
    ...leafValues(PASHX_MAB_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS),
    ...Object.values(PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS),
    ...Object.values(PASHX_MAB_ROLE_UNIVERSAL_IDENTIFIERS),
  ];

  assert.equal(
    identifiers.every((identifier) => UUID_V4_PATTERN.test(identifier)),
    true,
  );
  assert.equal(new Set(identifiers).size, identifiers.length);
  assert.deepEqual(PASHX_MAB_OBJECT_NAMES, [
    'procurementCase',
    'commercialDocument',
    'documentLine',
    'expense',
  ]);
});

test('the Twenty app consumes contract identifiers without duplicating UUIDs', () => {
  const appSourceUrl = new URL(
    '../../twenty-apps/pashx-mab/src/',
    import.meta.url,
  );
  const objectSourceUrl = new URL('objects/', appSourceUrl);
  const objectFiles = readdirSync(objectSourceUrl).filter((file) =>
    file.endsWith('.object.ts'),
  );
  const appFiles = readdirSync(appSourceUrl, { recursive: true }).filter(
    (file) =>
      typeof file === 'string' &&
      (file.endsWith('.ts') || file.endsWith('.tsx')),
  );
  const source = appFiles
    .map((file) => readFileSync(new URL(file, appSourceUrl), 'utf8'))
    .join('\n');
  const roleFiles = appFiles.filter((file) => file.endsWith('.role.ts'));
  const permissionFlagFiles = appFiles.filter((file) =>
    file.endsWith('.permission-flag.ts'),
  );

  assert.equal(objectFiles.length, PASHX_MAB_OBJECT_NAMES.length);
  assert.equal(roleFiles.length, PASHX_MAB_ROLE_KEYS.length);
  assert.equal(permissionFlagFiles.length, PASHX_MAB_CAPABILITY_NAMES.length);
  assert.equal(UUID_V4_PATTERN.test(source), false);
  assert.match(source, /PASHX_MAB_APPLICATION_UNIVERSAL_IDENTIFIER/);
  assert.match(source, /PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS/);
  assert.match(source, /PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS/);
  assert.match(source, /PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS/);
  assert.match(source, /PASHX_MAB_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS/);
  assert.match(source, /PASHX_MAB_ROLE_UNIVERSAL_IDENTIFIERS\.viewer/);

  for (const objectName of PASHX_MAB_OBJECT_NAMES) {
    assert.match(
      source,
      new RegExp(`PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS\\.${objectName}`),
    );
    assert.match(
      source,
      new RegExp(`PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS\\.${objectName}`),
    );
  }

  for (const role of PASHX_MAB_ROLE_KEYS) {
    assert.match(
      source,
      new RegExp(`PASHX_MAB_ROLE_UNIVERSAL_IDENTIFIERS\\.${role}`),
    );
    assert.match(
      source,
      new RegExp(`PASHX_MAB_ROLE_CAPABILITY_UNIVERSAL_IDENTIFIERS\\.${role}`),
    );
  }

  for (const capability of PASHX_MAB_CAPABILITY_NAMES) {
    assert.match(
      source,
      new RegExp(`PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS\\.${capability}`),
    );
  }
});

test('the server write adapter preserves the approved transaction boundary', () => {
  const serverModuleUrl = new URL(
    '../../twenty-server/src/modules/pashx-mab/',
    import.meta.url,
  );
  const serverSource = readdirSync(serverModuleUrl, { recursive: true })
    .filter((file) => typeof file === 'string' && file.endsWith('.ts'))
    .map((file) => readFileSync(new URL(file, serverModuleUrl), 'utf8'))
    .join('\n');

  assert.match(serverSource, /createQueryRunner\(\)/);
  assert.match(serverSource, /pg_advisory_xact_lock/);
  assert.match(serverSource, /pashx_command_receipt/);
  assert.match(serverSource, /pashx_number_counter/);
  assert.match(serverSource, /pashx_audit_event/);
  assert.match(serverSource, /pashx_support_schema_version/);
  assert.match(serverSource, /reconcileSupportTables/);
  assert.match(serverSource, /PASHX_SUPPORT_SCHEMA_VERSION/);
  assert.match(serverSource, /PashxFinancialCommandInternalDurationMs/);
  assert.match(serverSource, /recordHistogram/);
  assert.match(
    serverSource,
    /PASHX_FINANCIAL_COMMAND_DURATION_MS_BUCKET_BOUNDARIES/,
  );
  assert.doesNotMatch(serverSource, /coreDataSource/);
  assert.match(serverSource, /authContext\.workspace\.id/);
  assert.match(serverSource, /authContext\.user\.id/);
  assert.doesNotMatch(serverSource, /body\.workspaceId|body\.actorId/);
  assert.match(
    serverSource,
    /PASHX_COMMAND_EXCEPTION_CODES\.internalError[\s\S]*HttpStatus\.INTERNAL_SERVER_ERROR/,
  );
  assert.match(serverSource, /PermissionsExceptionCode\.PERMISSION_DENIED/);
  assert.match(serverSource, /installedVersion < PASHX_SUPPORT_SCHEMA_VERSION/);
  assert.match(serverSource, /POSTGRESQL_ERROR_CODES\.UNIQUE_VIOLATION/);
  assert.match(serverSource, /PASHX_COMMAND_EXCEPTION_CODES\.recordConflict/);
  assert.match(
    serverSource,
    /Record<keyof PashxCreateVendorPurchaseOrderPayload, unknown>/,
  );
  assert.match(serverSource, /PROVISIONAL_NUMBERING_YEAR_RANGE/);
});

test('role capability mappings are valid and least-privileged', () => {
  const knownCapabilities = new Set(Object.values(PASHX_MAB_CAPABILITIES));

  for (const role of PASHX_MAB_ROLE_KEYS) {
    assert.equal(
      PASHX_MAB_ROLE_CAPABILITIES[role].every((capability) =>
        knownCapabilities.has(capability),
      ),
      true,
    );
  }

  assert.equal(
    PASHX_MAB_ROLE_CAPABILITIES.admin.length,
    PASHX_MAB_CAPABILITY_NAMES.length,
  );
  assert.deepEqual(PASHX_MAB_ROLE_CAPABILITIES.viewer, []);
  assert.deepEqual(PASHX_MAB_ROLE_CAPABILITY_UNIVERSAL_IDENTIFIERS.viewer, []);
  assert.equal(
    PASHX_MAB_ROLE_CAPABILITY_UNIVERSAL_IDENTIFIERS.admin.length,
    PASHX_MAB_CAPABILITY_NAMES.length,
  );
  assert.equal(
    PASHX_MAB_ROLE_CAPABILITIES.operator.includes(
      PASHX_MAB_CAPABILITIES.financePost,
    ),
    false,
  );
  assert.equal(
    PASHX_MAB_ROLE_CAPABILITIES.finance.includes(
      PASHX_MAB_CAPABILITIES.procurementIssue,
    ),
    false,
  );
});

test('only registered commands and capabilities are recognized', () => {
  assert.equal(isPashxCommandName(PASHX_COMMAND_NAMES[0]), true);
  assert.equal(isPashxCommandName('document.delete'), false);
  assert.equal(isPashxMabCapability(PASHX_MAB_CAPABILITIES.caseEdit), true);
  assert.equal(isPashxMabCapability('pashx.unknown'), false);
});

test('English and Arabic error definitions are exhaustive and non-empty', () => {
  for (const code of Object.values(PASHX_COMMAND_EXCEPTION_CODES)) {
    assert.ok(PASHX_COMMAND_ERROR_DEFINITIONS[code].messages.en.length > 0);
    assert.ok(PASHX_COMMAND_ERROR_DEFINITIONS[code].messages.ar.length > 0);
    assert.equal(
      getPashxCommandErrorMessage(code, 'en'),
      PASHX_COMMAND_ERROR_DEFINITIONS[code].messages.en,
    );
    assert.equal(
      getPashxCommandErrorMessage(code, 'ar'),
      PASHX_COMMAND_ERROR_DEFINITIONS[code].messages.ar,
    );
  }
});

test('version, micros, and currency guards reject unsafe wire values', () => {
  assert.equal(isValidExpectedVersion(0), true);
  assert.equal(isValidExpectedVersion(Number.MAX_SAFE_INTEGER), true);
  assert.equal(isValidExpectedVersion(-1), false);
  assert.equal(isValidExpectedVersion(1.5), false);
  assert.equal(isValidExpectedVersion(Number.MAX_SAFE_INTEGER + 1), false);

  assert.equal(isSafeAmountMicros(Number.MIN_SAFE_INTEGER), true);
  assert.equal(isSafeAmountMicros(Number.MAX_SAFE_INTEGER), true);
  assert.equal(isSafeAmountMicros(Number.MAX_SAFE_INTEGER + 1), false);
  assert.equal(isSafeAmountMicros(0.1), false);

  assert.equal(isIsoCurrencyCode('SAR'), true);
  assert.equal(isIsoCurrencyCode('AED'), true);
  assert.equal(isIsoCurrencyCode('sar'), false);
  assert.equal(isIsoCurrencyCode('USDT'), false);
});

test('vendor PO request validation accepts the client-safe command shape', () => {
  const request = {
    contractVersion: PASHX_MAB_CONTRACT_VERSION,
    commercialDocumentRecordId: '112f1a44-2580-47dd-9f57-abaef5464202',
    idempotencyKey: 'mobile-client:8cbfce32',
    expectedVersion: 3,
    payload: {
      procurementCaseRecordId: '31a04eb5-c7b7-40f5-bae5-4a7b03d6443f',
      supplierRecordId: '8b7cc0df-ce36-43e8-9343-447bf3f4bd3c',
      issueDate: '2026-08-05',
      currency: 'SAR',
      vendorReference: 'MAB supplier quote 18',
    },
  };

  assert.deepEqual(validateCreateVendorPurchaseOrderRequest(request), {
    valid: true,
    value: request,
  });
  assert.equal('workspaceId' in request, false);
  assert.equal('actorId' in request, false);
});

test('vendor PO request validation reports every unsafe field without throwing', () => {
  assert.deepEqual(validateCreateVendorPurchaseOrderRequest(null), {
    valid: false,
    fieldPaths: ['$'],
  });
  assert.deepEqual(
    validateCreateVendorPurchaseOrderRequest({ payload: null }),
    { valid: false, fieldPaths: ['payload'] },
  );
  assert.deepEqual(validateCreateVendorPurchaseOrderRequest([]), {
    valid: false,
    fieldPaths: ['$'],
  });

  const invalid = validateCreateVendorPurchaseOrderRequest({
    contractVersion: '1',
    commercialDocumentRecordId: 'not-an-id',
    idempotencyKey: ' ',
    expectedVersion: -1,
    payload: {
      procurementCaseRecordId: 'wrong',
      supplierRecordId: 'wrong',
      issueDate: '2026-02-30',
      currency: 'sar',
      vendorReference: '',
    },
  });

  assert.deepEqual(invalid, {
    valid: false,
    fieldPaths: [
      'contractVersion',
      'commercialDocumentRecordId',
      'idempotencyKey',
      'expectedVersion',
      'payload.procurementCaseRecordId',
      'payload.supplierRecordId',
      'payload.issueDate',
      'payload.currency',
      'payload.vendorReference',
    ],
  });

  const validWithoutOptionalReference = {
    contractVersion: PASHX_MAB_CONTRACT_VERSION,
    commercialDocumentRecordId: '112f1a44-2580-47dd-9f57-abaef5464202',
    idempotencyKey: 'retry-key',
    expectedVersion: 0,
    payload: {
      procurementCaseRecordId: '31a04eb5-c7b7-40f5-bae5-4a7b03d6443f',
      supplierRecordId: '8b7cc0df-ce36-43e8-9343-447bf3f4bd3c',
      issueDate: '2026-08-05',
      currency: 'SAR',
    },
  };

  assert.equal(
    validateCreateVendorPurchaseOrderRequest(validWithoutOptionalReference)
      .valid,
    true,
  );

  const mutations = [
    { commercialDocumentRecordId: 42 },
    { idempotencyKey: 42 },
    { idempotencyKey: 'x'.repeat(201) },
    { expectedVersion: '0' },
    {
      payload: {
        ...validWithoutOptionalReference.payload,
        procurementCaseRecordId: 42,
      },
    },
    {
      payload: {
        ...validWithoutOptionalReference.payload,
        supplierRecordId: 42,
      },
    },
    { payload: { ...validWithoutOptionalReference.payload, issueDate: 42 } },
    {
      payload: {
        ...validWithoutOptionalReference.payload,
        issueDate: '05/08/2026',
      },
    },
    {
      payload: {
        ...validWithoutOptionalReference.payload,
        issueDate: '2026-13-01',
      },
    },
    { payload: { ...validWithoutOptionalReference.payload, currency: 42 } },
    {
      payload: {
        ...validWithoutOptionalReference.payload,
        vendorReference: 42,
      },
    },
  ];

  for (const mutation of mutations) {
    assert.equal(
      validateCreateVendorPurchaseOrderRequest({
        ...validWithoutOptionalReference,
        ...mutation,
      }).valid,
      false,
    );
  }
});
