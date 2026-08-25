/**
 * CL2 harness — shared context for the PashX MAB Cloud SQL invariant tests.
 *
 * These tests exercise the REAL service boundary against a REAL PostgreSQL transaction, per the
 * CL2 acceptance contract: "tests use real Cloud SQL transactions through the actual service
 * boundary, not mocks". Nothing here stubs the command path — every assertion is made by driving
 * `POST /rest/pashx-mab/vendor-purchase-orders` and then reading the resulting rows directly.
 *
 * Support tables (`pashx_command_receipt`, `pashx_number_counter`, `pashx_audit_event`,
 * `pashx_support_schema_version`) live inside the workspace schema, so they are read with raw SQL
 * against `global.testDataSource` rather than through the ORM.
 */
import { SEED_APPLE_WORKSPACE_ID } from 'src/engine/workspace-manager/dev-seeder/core/constants/seeder-workspaces.constant';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';

/**
 * Defaults to the dev-seeded Apple workspace, which is what exists on a local
 * `test:integration:with-db-reset` run. Against the real Cloud SQL pilot database that workspace
 * does NOT exist — CL3 installs the PashX app into a disposable workspace with its own id — so the
 * id is overridable.
 *
 * This was a genuine portability bug: hardcoding the seed id meant the suite could only ever run
 * against a dev-seeded database, while the CL2 acceptance contract requires it to run against real
 * Cloud SQL. Every scenario resolves the schema from this value, so overriding it is sufficient to
 * retarget the whole suite.
 */
export const PASHX_TEST_WORKSPACE_ID =
  process.env.PASHX_TEST_WORKSPACE_ID ?? SEED_APPLE_WORKSPACE_ID;

/**
 * Quoted so it is safe to interpolate into raw SQL. Mirrors `quotePashxIdentifier` in the
 * production service — deliberately duplicated rather than imported, so a regression in the
 * production quoting helper cannot silently make these tests pass by using the same broken logic.
 */
export const pashxTestSchema = (): string =>
  `"${getWorkspaceSchemaName(PASHX_TEST_WORKSPACE_ID).replaceAll('"', '""')}"`;

/**
 * Fully-qualified physical table for an APPLICATION-OWNED object.
 *
 * The underscore prefix marks objects owned by an installed application, NOT every workspace
 * object. Verified directly against the CL2 workspace schema:
 *
 *   _commercialDocument   BASE TABLE   <- app object (PashX)
 *   _procurementCase      BASE TABLE   <- app object (PashX)
 *   company               BASE TABLE   <- standard object
 *   workspaceMember       BASE TABLE   <- standard object
 *
 * Use this for PashX objects only. Standard objects are schema-qualified without a prefix; see
 * `pashxStandardTable`.
 *
 * Two mistakes were made here in sequence, both worth remembering. First the guard probed the
 * un-prefixed name and reported "app is not installed" for a workspace where it WAS installed.
 * Then, over-correcting, the prefix was applied to every table including `company`, which failed
 * with `relation "…._company" does not exist`. There is no view involved in either case — an
 * earlier version of this comment speculated about views and that was wrong.
 */
export const pashxTable = (appObjectNameSingular: string): string =>
  `${pashxTestSchema()}."_${appObjectNameSingular.replaceAll('"', '""')}"`;

/** Standard (non-application) workspace object: schema-qualified, no underscore prefix. */
export const pashxStandardTable = (objectNameSingular: string): string =>
  `${pashxTestSchema()}."${objectNameSingular.replaceAll('"', '""')}"`;

export const PASHX_VENDOR_PO_PATH = '/pashx-mab/vendor-purchase-orders';

/**
 * CX1 accepted CL1 finding P2-3: the issue year must fall within the current UTC year ±1, checked
 * before number allocation. Every suite therefore derives its dates from the clock instead of
 * hardcoding a year — a literal '2026-08-07' would silently start failing with
 * PASHX_INVALID_INPUT once the calendar moved past 2027.
 */
export const CURRENT_PERIOD = String(new Date().getUTCFullYear());
export const CURRENT_PERIOD_ISSUE_DATE = `${CURRENT_PERIOD}-06-15`;

type SqlParams = readonly unknown[];

export const pashxQuery = async <T = Record<string, unknown>>(
  sql: string,
  params: SqlParams = [],
): Promise<T[]> => (await global.testDataSource.query(sql, [...params])) as T[];

export const pashxQueryOne = async <T = Record<string, unknown>>(
  sql: string,
  params: SqlParams = [],
): Promise<T | undefined> => (await pashxQuery<T>(sql, params))[0];

// --- Support-table readers ----------------------------------------------------

/**
 * The four PashX support tables are created LAZILY by `reconcileSupportTables`, which runs inside
 * the first command transaction rather than at app install. On a freshly prepared workspace they do
 * not exist until a command has succeeded, so a reader that runs first (several scenarios read a
 * counter to establish a delta baseline) hit:
 *   QueryFailedError: relation "workspace_….pashx_number_counter" does not exist
 *
 * "Table absent" and "table present but empty" are the same state for these readers — no rows —
 * so both return the empty result. This is checked with `to_regclass` rather than by catching the
 * error, so a genuine failure (wrong schema, missing grant) still surfaces instead of being
 * flattened into "no data".
 */
const supportTablePresent = async (table: string): Promise<boolean> => {
  const row = await pashxQueryOne<{ exists: boolean }>(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [`${pashxTestSchema()}.${table}`],
  );

  return row?.exists === true;
};

export const readSupportSchemaVersionRows = async (): Promise<
  { id: number; version: number }[]
> =>
  (await supportTablePresent('pashx_support_schema_version'))
    ? pashxQuery(
        `SELECT id, version FROM ${pashxTestSchema()}.pashx_support_schema_version ORDER BY id`,
      )
    : [];

export const readReceipt = async (idempotencyKey: string) =>
  !(await supportTablePresent('pashx_command_receipt'))
    ? undefined
    : pashxQueryOne<{
        idempotency_key: string;
        request_hash: string;
        aggregate_id: string;
        aggregate_version: number;
        result_json: Record<string, unknown>;
      }>(
        `SELECT idempotency_key, request_hash, aggregate_id, aggregate_version, result_json
     FROM ${pashxTestSchema()}.pashx_command_receipt WHERE idempotency_key = $1`,
        [idempotencyKey],
      );

export const countReceipts = async (
  idempotencyKey: string,
): Promise<number> => {
  if (!(await supportTablePresent('pashx_command_receipt'))) return 0;
  const row = await pashxQueryOne<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM ${pashxTestSchema()}.pashx_command_receipt WHERE idempotency_key = $1`,
    [idempotencyKey],
  );

  return Number(row?.count ?? '0');
};

export const readCounter = async (
  documentType: string,
  period: string,
): Promise<number | undefined> => {
  if (!(await supportTablePresent('pashx_number_counter'))) return undefined;
  const row = await pashxQueryOne<{ current_value: string }>(
    `SELECT current_value::text AS current_value
     FROM ${pashxTestSchema()}.pashx_number_counter
     WHERE document_type = $1 AND period = $2`,
    [documentType, period],
  );

  return row === undefined ? undefined : Number(row.current_value);
};

export const readAuditEvents = async (aggregateId: string) =>
  !(await supportTablePresent('pashx_audit_event'))
    ? []
    : pashxQuery<{
        id: string;
        correlation_id: string;
        actor_id: string;
        command_name: string;
        aggregate_id: string;
        aggregate_version: number;
        payload: Record<string, unknown>;
      }>(
        `SELECT id, correlation_id, actor_id, command_name, aggregate_id, aggregate_version, payload
     FROM ${pashxTestSchema()}.pashx_audit_event
     WHERE aggregate_id = $1 ORDER BY occurred_at`,
        [aggregateId],
      );

export const readCommercialDocument = async (id: string) =>
  pashxQueryOne<{
    id: string;
    name: string;
    documentType: string;
    lifecycleStatus: string;
    aggregateVersion: number;
  }>(
    `SELECT id, name, "documentType", "lifecycleStatus", "aggregateVersion"
     FROM ${pashxTable('commercialDocument')} WHERE id = $1`,
    [id],
  );

export const readProcurementCaseVersion = async (
  id: string,
): Promise<number | undefined> => {
  const row = await pashxQueryOne<{ aggregateVersion: number }>(
    `SELECT "aggregateVersion" FROM ${pashxTable('procurementCase')} WHERE id = $1`,
    [id],
  );

  return row?.aggregateVersion;
};

export const readProcurementCaseStage = async (
  id: string,
): Promise<string | undefined> => {
  const row = await pashxQueryOne<{ stage: string }>(
    `SELECT "stage" FROM ${pashxTable('procurementCase')} WHERE id = $1`,
    [id],
  );

  return row?.stage;
};

export const readProcurementCaseDelivery = async (
  id: string,
): Promise<
  { deliveryStatus: string | null; deliveryDueAt: Date | null } | undefined
> =>
  pashxQueryOne(
    `SELECT "deliveryStatus", "deliveryDueAt" FROM ${pashxTable('procurementCase')} WHERE id = $1`,
    [id],
  );

export const readCommercialDocumentState = async (
  id: string,
): Promise<
  | {
      id: string;
      documentType: string;
      lifecycleStatus: string;
      aggregateVersion: number;
      procurementCaseRecordId: string | null;
      supplierRecordId: string | null;
      totalAmountMicros: string | null;
    }
  | undefined
> =>
  pashxQueryOne(
    `SELECT id, name, "documentType", "lifecycleStatus", "aggregateVersion",
            "procurementCaseRecordId", "supplierRecordId",
            "totalAmountAmountMicros"::text AS "totalAmountMicros"
     FROM ${pashxTable('commercialDocument')} WHERE id = $1`,
    [id],
  );

// --- Preconditions ------------------------------------------------------------

/**
 * The PashX app must be installed in the seeded test workspace before any of this runs — the
 * custom objects and the `procurementIssue` capability come from the app manifest, not from
 * Twenty core. Without this check the suite fails deep inside a request with an opaque 500, and
 * the real cause (app not installed) is several layers away from the symptom.
 */
export const assertPashxAppInstalled = async (): Promise<void> => {
  const missing: string[] = [];

  // Physical workspace record tables are UNDERSCORE-PREFIXED: `_commercialDocument`, not
  // `commercialDocument`. This guard originally probed the un-prefixed names and produced a false
  // negative — it reported "app is not installed" against a workspace where the app WAS installed
  // and both tables existed, which is the worst possible failure for a precondition check: it
  // blames the environment for a defect in the check.
  //
  // Verified directly against the CL2 database: the workspace schema contains `_procurementCase`
  // and `_commercialDocument` and no un-prefixed counterparts. Twenty creates un-prefixed VIEWS
  // for some standard objects, which is what made the wrong name look plausible.
  for (const objectName of ['procurementCase', 'commercialDocument']) {
    const row = await pashxQueryOne<{ exists: boolean }>(
      `SELECT to_regclass($1) IS NOT NULL AS exists`,
      [pashxTable(objectName)],
    );

    if (row?.exists !== true) {
      missing.push(objectName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      [
        `PashX MAB app is not installed in the test workspace ${PASHX_TEST_WORKSPACE_ID}.`,
        `Missing workspace tables: ${missing.join(', ')}.`,
        'Install the app into the disposable workspace before running the CL2 suite',
        '(see docs/operations/pashx-mab-gcp/runbook-deploy.md, Phase 6 step 3).',
      ].join(' '),
    );
  }
};

/**
 * The WF2 workflow columns (`deliveryStatus`, `deliveryDueAt`) arrive through the application
 * manifest, so a stale installed app fails these suites deep inside a command with an opaque 500.
 * This guard names the refresh step directly instead.
 */
export const assertPashxWorkflowColumnsInstalled = async (): Promise<void> => {
  const schema = getWorkspaceSchemaName(PASHX_TEST_WORKSPACE_ID);
  const row = await pashxQueryOne<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM information_schema.columns
     WHERE table_schema = $1
       AND table_name = '_procurementCase'
       AND column_name IN ('deliveryStatus', 'deliveryDueAt')`,
    [schema],
  );

  if (Number(row?.count ?? '0') !== 2) {
    throw new Error(
      [
        `PashX MAB workflow columns are missing in workspace ${PASHX_TEST_WORKSPACE_ID}.`,
        'Sync the application source into this workspace (twenty dev . -r cl2-local)',
        'and retry before running the WF2 suites.',
      ].join(' '),
    );
  }
};

// --- Seeding ------------------------------------------------------------------

/**
 * Inserted with raw SQL rather than through the REST API because these are fixtures, not the
 * behaviour under test. Going through the API would make a seeding failure look like a command
 * failure.
 */
export const seedProcurementCase = async ({
  id,
  aggregateVersion = 0,
  stage,
}: {
  id: string;
  aggregateVersion?: number;
  stage?: string;
}): Promise<void> => {
  // `createdByName` and `updatedByName` are NOT NULL with no database default on every workspace
  // record table. A raw INSERT bypasses the pipeline that normally fills the ACTOR composite, so
  // omitting them fails with
  //   null value in column "createdByName" of relation "_procurementCase"
  // This is the same defect class as finding 29 in the production persistence service — the fix
  // there was to set both actors explicitly, and a test fixture needs to do exactly the same.
  const stageColumn = stage === undefined ? '' : ', "stage"';
  const stageValue = stage === undefined ? '' : ', $4';

  await pashxQuery(
    `INSERT INTO ${pashxTable('procurementCase')}
       (id, name, "aggregateVersion", "createdBySource", "createdByName", "updatedBySource", "updatedByName"${stageColumn})
     VALUES ($1, $2, $3, 'API', 'CL2 harness', 'API', 'CL2 harness'${stageValue})
     ON CONFLICT (id) DO UPDATE SET "aggregateVersion" = EXCLUDED."aggregateVersion"${
       stage === undefined ? '' : ', "stage" = EXCLUDED."stage"'
     }`,
    stage === undefined
      ? [id, `CL2 case ${id.slice(0, 8)}`, aggregateVersion]
      : [id, `CL2 case ${id.slice(0, 8)}`, aggregateVersion, stage],
  );
};

export const seedCommercialDocument = async ({
  id,
  name,
  documentType,
  lifecycleStatus,
  aggregateVersion,
  procurementCaseRecordId,
  supplierRecordId,
  totalAmountMicros,
  issueDate,
  currencyCode,
}: {
  id: string;
  name: string;
  documentType: string;
  lifecycleStatus: string;
  aggregateVersion: number;
  procurementCaseRecordId?: string;
  supplierRecordId?: string;
  totalAmountMicros?: string;
  issueDate?: string;
  currencyCode?: string;
}): Promise<void> => {
  await pashxQuery(
    `INSERT INTO ${pashxTable('commercialDocument')}
       (id, name, "documentType", "lifecycleStatus", "aggregateVersion",
        "procurementCaseRecordId", "supplierRecordId",
        "totalAmountAmountMicros", "totalAmountCurrencyCode",
        "issueDate", "currencyCode",
        "createdBySource", "createdByName", "updatedBySource", "updatedByName")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::bigint, $10, $9, $10,
             'API', 'CL2 harness', 'API', 'CL2 harness')
     ON CONFLICT (id) DO UPDATE SET
       "documentType" = EXCLUDED."documentType",
       "lifecycleStatus" = EXCLUDED."lifecycleStatus",
       "aggregateVersion" = EXCLUDED."aggregateVersion",
       "procurementCaseRecordId" = EXCLUDED."procurementCaseRecordId",
       "supplierRecordId" = EXCLUDED."supplierRecordId",
       "totalAmountAmountMicros" = EXCLUDED."totalAmountAmountMicros",
       "totalAmountCurrencyCode" = EXCLUDED."totalAmountCurrencyCode"`,
    [
      id,
      name,
      documentType,
      lifecycleStatus,
      aggregateVersion,
      procurementCaseRecordId ?? null,
      supplierRecordId ?? null,
      totalAmountMicros ?? null,
      issueDate ?? null,
      currencyCode ?? null,
    ],
  );
};

export const seedSupplierCompany = async (id: string): Promise<void> => {
  await pashxQuery(
    `INSERT INTO ${pashxStandardTable('company')}
       (id, name, "createdBySource", "createdByName", "updatedBySource", "updatedByName")
     VALUES ($1, $2, 'API', 'CL2 harness', 'API', 'CL2 harness')
     ON CONFLICT (id) DO NOTHING`,
    [id, `CL2 supplier ${id.slice(0, 8)}`],
  );
};

// --- Cleanup ------------------------------------------------------------------

/**
 * Deliberately does NOT truncate `pashx_number_counter`. Several scenarios assert that a counter
 * did or did not advance, and those assertions are written as deltas around a command rather than
 * against an assumed starting value — resetting it here would hide an ordering bug in the tests
 * themselves.
 */
export const cleanupPashxTestData = async ({
  procurementCaseIds = [],
  commercialDocumentIds = [],
  supplierIds = [],
  approvalRequestIds = [],
  idempotencyKeys = [],
}: {
  procurementCaseIds?: string[];
  commercialDocumentIds?: string[];
  supplierIds?: string[];
  approvalRequestIds?: string[];
  idempotencyKeys?: string[];
}): Promise<void> => {
  const schema = pashxTestSchema();

  // The PashX support tables are created LAZILY by `reconcileSupportTables`, which runs inside the
  // first command transaction — not at app install. On a freshly prepared workspace they therefore
  // do not exist until a command has succeeded, and cleanup in the first scenario's `beforeAll` ran
  // before that ever happened:
  //   QueryFailedError: relation "workspace_….pashx_audit_event" does not exist
  //
  // Skipping a delete against a table that cannot contain rows yet is correct, not a workaround: if
  // the table is absent, there is by definition nothing to clean. Guarding on existence rather than
  // swallowing the error keeps a genuine failure (permissions, wrong schema) visible.
  const supportTableExists = async (table: string): Promise<boolean> => {
    const row = await pashxQueryOne<{ exists: boolean }>(
      `SELECT to_regclass($1) IS NOT NULL AS exists`,
      [`${schema}.${table}`],
    );

    return row?.exists === true;
  };

  if (
    idempotencyKeys.length > 0 &&
    (await supportTableExists('pashx_command_receipt'))
  ) {
    await pashxQuery(
      `DELETE FROM ${schema}.pashx_command_receipt WHERE idempotency_key = ANY($1::text[])`,
      [idempotencyKeys],
    );
  }
  if (
    [...procurementCaseIds, ...approvalRequestIds].length > 0 &&
    (await supportTableExists('pashx_audit_event'))
  ) {
    await pashxQuery(
      `DELETE FROM ${schema}.pashx_audit_event WHERE aggregate_id = ANY($1::uuid[])`,
      [[...procurementCaseIds, ...approvalRequestIds]],
    );
  }
  if (commercialDocumentIds.length > 0) {
    await pashxQuery(
      `DELETE FROM ${pashxTable('commercialDocument')} WHERE id = ANY($1::uuid[])`,
      [commercialDocumentIds],
    );
  }
  if (approvalRequestIds.length > 0) {
    await pashxQuery(
      `DELETE FROM ${pashxTable('approvalRequest')} WHERE id = ANY($1::uuid[])`,
      [approvalRequestIds],
    );
  }
  if (procurementCaseIds.length > 0) {
    await pashxQuery(
      `DELETE FROM ${pashxTable('procurementCase')} WHERE id = ANY($1::uuid[])`,
      [procurementCaseIds],
    );
  }
  if (supplierIds.length > 0) {
    await pashxQuery(
      `DELETE FROM ${schema}."company" WHERE id = ANY($1::uuid[])`,
      [supplierIds],
    );
  }
};
