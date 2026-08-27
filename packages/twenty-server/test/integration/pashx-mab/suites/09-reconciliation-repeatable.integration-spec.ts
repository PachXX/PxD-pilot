/**
 * CL2 scenario 9 — install/upgrade reconciliation is repeatable.
 *
 * Reconciliation runs on EVERY Vendor PO command, in its own transaction that commits before the
 * business transaction opens. That design is only safe if a second and third run are true no-ops:
 * otherwise every command would mutate schema state, and the support tables would drift under
 * normal traffic rather than only at install time.
 *
 * "No-op" is asserted structurally — same schema version, same single version row, same table set,
 * same column definitions — rather than by trusting the command's success. A reconciliation that
 * silently recreated or altered a table would still return 201.
 */
import { randomUUID } from 'node:crypto';

import {
  buildVendorPurchaseOrderRequest,
  postVendorPurchaseOrder,
} from 'test/integration/pashx-mab/utils/create-vendor-purchase-order.util';
import {
  assertPashxAppInstalled,
  CURRENT_PERIOD_ISSUE_DATE,
  cleanupPashxTestData,
  PASHX_TEST_WORKSPACE_ID,
  pashxQuery,
  readSupportSchemaVersionRows,
  seedProcurementCase,
  seedSupplierCompany,
} from 'test/integration/pashx-mab/utils/pashx-mab-test-context.util';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';

const EXPECTED_SUPPORT_TABLES = [
  'pashx_audit_event',
  'pashx_command_receipt',
  'pashx_number_counter',
  'pashx_support_schema_version',
];

const schema = () => getWorkspaceSchemaName(PASHX_TEST_WORKSPACE_ID);

const describeSupportSchema = async () =>
  pashxQuery<{
    table_name: string;
    column_name: string;
    data_type: string;
    is_nullable: string;
  }>(
    `SELECT table_name, column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = ANY($2::text[])
     ORDER BY table_name, column_name`,
    [schema(), EXPECTED_SUPPORT_TABLES],
  );

describe('CL2-9 PashX Vendor PO — support-table reconciliation is repeatable', () => {
  const supplierId = randomUUID();
  const caseIds: string[] = [];
  const documentIds: string[] = [];
  const idempotencyKeys: string[] = [];

  let schemaAfterFirstRun: Awaited<ReturnType<typeof describeSupportSchema>>;

  beforeAll(async () => {
    await assertPashxAppInstalled();
    await seedSupplierCompany(supplierId);
  });

  afterAll(async () => {
    await cleanupPashxTestData({
      procurementCaseIds: caseIds,
      commercialDocumentIds: documentIds,
      supplierIds: [supplierId],
      idempotencyKeys,
    });
  });

  const runCommand = async () => {
    const procurementCaseId = randomUUID();

    caseIds.push(procurementCaseId);
    await seedProcurementCase({ id: procurementCaseId, aggregateVersion: 0 });

    const body = buildVendorPurchaseOrderRequest({
      procurementCaseRecordId: procurementCaseId,
      supplierRecordId: supplierId,
      expectedVersion: 0,
      issueDate: CURRENT_PERIOD_ISSUE_DATE,
    });

    documentIds.push(body.commercialDocumentRecordId);
    idempotencyKeys.push(body.idempotencyKey);

    return postVendorPurchaseOrder({ body });
  };

  it('creates every support table and records schema version 1 on the first run', async () => {
    const response = await runCommand();

    expect(response.status).toBe(201);

    const versionRows = await readSupportSchemaVersionRows();

    expect(versionRows).toEqual([{ id: 1, version: 1 }]);

    schemaAfterFirstRun = await describeSupportSchema();

    const tables = [
      ...new Set(schemaAfterFirstRun.map((row) => row.table_name)),
    ].sort();

    expect(tables).toEqual(EXPECTED_SUPPORT_TABLES);
  });

  it('leaves the schema byte-identical on a second run', async () => {
    const response = await runCommand();

    expect(response.status).toBe(201);
    expect(await describeSupportSchema()).toEqual(schemaAfterFirstRun);
  });

  it('leaves the schema byte-identical on a third run', async () => {
    // Two runs can coincide by accident; three is enough to distinguish "idempotent" from
    // "alternates between two states".
    const response = await runCommand();

    expect(response.status).toBe(201);
    expect(await describeSupportSchema()).toEqual(schemaAfterFirstRun);
  });

  it('never adds a second version row', async () => {
    // The version table is pinned by `CHECK (id = 1)` plus `ON CONFLICT DO NOTHING`. If a second
    // row ever appears, the FOR UPDATE read becomes ambiguous and the upgrade gate stops working.
    expect(await readSupportSchemaVersionRows()).toEqual([
      { id: 1, version: 1 },
    ]);
  });

  it('does not rewrite the version row on repeat runs', async () => {
    // Production only issues the UPDATE when installedVersion < code version, so reconciled_at
    // should be stable across no-op runs. A moving timestamp would mean an unnecessary write on
    // every single command.
    const before = await pashxQuery<{ reconciled_at: string }>(
      `SELECT reconciled_at::text FROM ${`"${schema().replaceAll('"', '""')}"`}.pashx_support_schema_version WHERE id = 1`,
    );

    await runCommand();

    const after = await pashxQuery<{ reconciled_at: string }>(
      `SELECT reconciled_at::text FROM ${`"${schema().replaceAll('"', '""')}"`}.pashx_support_schema_version WHERE id = 1`,
    );

    expect(after[0].reconciled_at).toBe(before[0].reconciled_at);
  });

  it('preserves data written by earlier commands across reconciliation runs', async () => {
    // Reconciliation must be additive-only. If it ever dropped and recreated a table, receipts
    // and audit rows from earlier commands would vanish — silently destroying the audit trail
    // that the whole support-table design exists to guarantee.
    const receiptCount = await pashxQuery<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM ${`"${schema().replaceAll('"', '""')}"`}.pashx_command_receipt
       WHERE idempotency_key = ANY($1::text[])`,
      [idempotencyKeys],
    );

    expect(Number(receiptCount[0].count)).toBe(idempotencyKeys.length);
  });
});
