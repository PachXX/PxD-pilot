/**
 * CL2 scenario 7 — workspace, document-type, and period scopes remain isolated.
 *
 * Coverage is deliberately uneven, and that is worth stating plainly rather than hiding behind
 * green checkmarks:
 *
 *   period        — fully exercised. Two commands in different years must draw from independent
 *                   sequences, both starting at 0001.
 *   document type — structurally asserted. `vendorPurchaseOrder` is the only type in the T3 slice,
 *                   so there is no second type to collide with yet. The counter's primary key is
 *                   asserted instead, since that is the mechanism that will keep them apart.
 *   workspace     — structurally asserted. Isolation comes from the counter table living inside
 *                   the per-workspace schema, not from a workspace column. Spinning up a second
 *                   workspace is disproportionate here, so the test proves the table is genuinely
 *                   schema-local and that no workspace column is being relied on.
 *
 * A behavioural multi-workspace test belongs with CX2's cross-workspace QA, where a second
 * workspace already exists.
 *
 * PERIOD CHOICE: CX1 accepted CL1 finding P2-3 and now bounds the issue year to the current UTC
 * year ±1. Periods are therefore derived from the clock rather than hardcoded — an earlier draft
 * of this suite used 2031-2034 and would have started failing with PASHX_INVALID_INPUT the moment
 * that rule landed. Deriving them also means the suite does not rot on 1 January.
 */
import { randomUUID } from 'node:crypto';

import {
  buildVendorPurchaseOrderRequest,
  postVendorPurchaseOrder,
} from 'test/integration/pashx-mab/utils/create-vendor-purchase-order.util';
import {
  assertPashxAppInstalled,
  cleanupPashxTestData,
  pashxQuery,
  pashxQueryOne,
  PASHX_TEST_WORKSPACE_ID,
  readCounter,
  seedProcurementCase,
  seedSupplierCompany,
} from 'test/integration/pashx-mab/utils/pashx-mab-test-context.util';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';

const CURRENT_UTC_YEAR = new Date().getUTCFullYear();
// The only two periods inside the provisional window that the other suites do not touch;
// suites 2, 3, 5, 8 and 9 all issue in the current year.
const PAST_PERIOD = String(CURRENT_UTC_YEAR - 1);
const FUTURE_PERIOD = String(CURRENT_UTC_YEAR + 1);

describe('CL2-7 PashX Vendor PO — numbering scopes stay isolated', () => {
  const supplierId = randomUUID();
  const caseIds: string[] = [];
  const documentIds: string[] = [];
  const idempotencyKeys: string[] = [];

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

  const createInPeriod = async (issueDate: string) => {
    const procurementCaseId = randomUUID();

    caseIds.push(procurementCaseId);
    await seedProcurementCase({ id: procurementCaseId, aggregateVersion: 0 });

    const body = buildVendorPurchaseOrderRequest({
      procurementCaseRecordId: procurementCaseId,
      supplierRecordId: supplierId,
      expectedVersion: 0,
      issueDate,
    });

    documentIds.push(body.commercialDocumentRecordId);
    idempotencyKeys.push(body.idempotencyKey);

    const response = await postVendorPurchaseOrder({ body });

    return { response, procurementCaseId };
  };

  describe('period scope', () => {
    it('keeps sequences independent across years and encodes the period in the number', async () => {
      const periodA = PAST_PERIOD;
      const periodB = FUTURE_PERIOD;

      const beforeA = (await readCounter('vendorPurchaseOrder', periodA)) ?? 0;
      const beforeB = (await readCounter('vendorPurchaseOrder', periodB)) ?? 0;

      const first = await createInPeriod(`${periodA}-03-01`);
      const second = await createInPeriod(`${periodB}-03-01`);

      expect(first.response.status).toBe(201);
      expect(second.response.status).toBe(201);

      expect(await readCounter('vendorPurchaseOrder', periodA)).toBe(
        beforeA + 1,
      );
      expect(await readCounter('vendorPurchaseOrder', periodB)).toBe(
        beforeB + 1,
      );

      expect(first.response.body.result.documentNumber).toContain(
        `MAB-VPO-${periodA}-`,
      );
      expect(second.response.body.result.documentNumber).toContain(
        `MAB-VPO-${periodB}-`,
      );
    });

    it('advancing one period does not advance another', async () => {
      const periodA = PAST_PERIOD;
      const periodB = FUTURE_PERIOD;

      const advancingBefore =
        (await readCounter('vendorPurchaseOrder', periodA)) ?? 0;
      const untouchedBefore = await readCounter('vendorPurchaseOrder', periodB);

      await createInPeriod(`${periodA}-06-01`);

      expect(await readCounter('vendorPurchaseOrder', periodB)).toBe(
        untouchedBefore,
      );
      expect(await readCounter('vendorPurchaseOrder', periodA)).toBe(
        advancingBefore + 1,
      );
    });
  });

  describe('document-type scope', () => {
    it('keys the counter on document type and period together', async () => {
      // The T3 slice only issues vendorPurchaseOrder, so type collision is not yet reachable
      // behaviourally. Asserting the composite primary key proves the isolation mechanism exists
      // before a second document type is added, rather than discovering it is missing then.
      const schema = getWorkspaceSchemaName(PASHX_TEST_WORKSPACE_ID);

      const keyColumns = await pashxQuery<{ column_name: string }>(
        `SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON kcu.constraint_name = tc.constraint_name
          AND kcu.table_schema = tc.table_schema
         WHERE tc.table_schema = $1
           AND tc.table_name = 'pashx_number_counter'
           AND tc.constraint_type = 'PRIMARY KEY'
         ORDER BY kcu.ordinal_position`,
        [schema],
      );

      expect(keyColumns.map((row) => row.column_name)).toEqual([
        'document_type',
        'period',
      ]);
    });
  });

  describe('workspace scope', () => {
    it('stores the counter inside the workspace schema, not a shared table', async () => {
      const schema = getWorkspaceSchemaName(PASHX_TEST_WORKSPACE_ID);

      const row = await pashxQueryOne<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM information_schema.tables
         WHERE table_schema = $1 AND table_name = 'pashx_number_counter'`,
        [schema],
      );

      expect(Number(row?.count ?? '0')).toBe(1);
    });

    it('does not carry a workspace column, confirming isolation is schema-based', async () => {
      // If a workspace_id column ever appears here it means the isolation model changed, and the
      // advisory lock scope plus this test's assumptions would both need revisiting.
      const schema = getWorkspaceSchemaName(PASHX_TEST_WORKSPACE_ID);

      const columns = await pashxQuery<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = 'pashx_number_counter'
         ORDER BY column_name`,
        [schema],
      );

      expect(columns.map((row) => row.column_name)).toEqual([
        'current_value',
        'document_type',
        'period',
      ]);
    });
  });
});
