/**
 * CL2 scenario 6 — parallel allocation is unique within a scope.
 *
 * Document numbers are an auditable financial sequence, so "unique" has to hold under genuine
 * concurrency, not just sequentially. Three layers are supposed to guarantee it:
 *
 *   1. `pg_advisory_xact_lock` on `number:{workspace}:{type}:{period}` — serialises allocation
 *   2. `INSERT … ON CONFLICT DO UPDATE … RETURNING` — atomic increment even without the lock
 *   3. `isUnique` on `commercialDocument.name` — the final guard if both above failed
 *
 * A test that only counted successes would pass even if layer 3 were doing all the work while 1
 * and 2 were broken. So this suite asserts the *shape* of the outcome too: every request succeeds,
 * every number is distinct, and the counter advances by exactly the number of commands — no gaps
 * (which would mean burned numbers) and no repeats.
 *
 * Each request targets a DIFFERENT procurement case on purpose. Same-case requests would serialise
 * on the aggregate lock and never actually contend for a number, which would make the test look
 * green while exercising nothing.
 */
import { randomUUID } from 'node:crypto';

import {
  buildVendorPurchaseOrderRequest,
  postVendorPurchaseOrder,
} from 'test/integration/pashx-mab/utils/create-vendor-purchase-order.util';
import {
  assertPashxAppInstalled,
  CURRENT_PERIOD,
  CURRENT_PERIOD_ISSUE_DATE,
  cleanupPashxTestData,
  countReceipts,
  readCounter,
  seedProcurementCase,
  seedSupplierCompany,
} from 'test/integration/pashx-mab/utils/pashx-mab-test-context.util';

const PARALLEL_COMMANDS = 8;

describe('CL2-6 PashX Vendor PO — parallel allocation stays unique within a scope', () => {
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

  describe('distinct commands contending for the same period', () => {
    let responses: Awaited<ReturnType<typeof postVendorPurchaseOrder>>[];
    let counterBefore: number;

    beforeAll(async () => {
      const bodies = await Promise.all(
        Array.from({ length: PARALLEL_COMMANDS }, async () => {
          const procurementCaseId = randomUUID();

          caseIds.push(procurementCaseId);
          await seedProcurementCase({
            id: procurementCaseId,
            aggregateVersion: 0,
          });

          const body = buildVendorPurchaseOrderRequest({
            procurementCaseRecordId: procurementCaseId,
            supplierRecordId: supplierId,
            expectedVersion: 0,
            issueDate: CURRENT_PERIOD_ISSUE_DATE,
          });

          documentIds.push(body.commercialDocumentRecordId);
          idempotencyKeys.push(body.idempotencyKey);

          return body;
        }),
      );

      counterBefore =
        (await readCounter('vendorPurchaseOrder', CURRENT_PERIOD)) ?? 0;

      // Fired together rather than awaited in sequence — this is the whole point of the scenario.
      responses = await Promise.all(
        bodies.map((body) => postVendorPurchaseOrder({ body })),
      );
    });

    it('succeeds for every concurrent command', () => {
      // No loser. Contention should serialise, not fail — a numberConflict here would mean the
      // advisory lock is not doing its job and the unique index is catching collisions instead.
      const statuses = responses.map((response) => response.status);

      expect(statuses).toEqual(Array(PARALLEL_COMMANDS).fill(201));
    });

    it('issues a distinct document number to every command', () => {
      const numbers = responses.map(
        (response) => response.body.result.documentNumber as string,
      );

      expect(new Set(numbers).size).toBe(PARALLEL_COMMANDS);
    });

    it('issues a contiguous block with no gaps, so no number is burned', () => {
      // Gaps would mean the counter advanced for a command that then rolled back. Contiguity is
      // the assertion that distinguishes "unique" from "unique but wasteful".
      const sequences = responses
        .map((response) => response.body.result.documentNumber as string)
        .map((number) => Number(number.split('-').at(-1)))
        .sort((a, b) => a - b);

      expect(sequences).toEqual(
        Array.from(
          { length: PARALLEL_COMMANDS },
          (_, index) => counterBefore + index + 1,
        ),
      );
    });

    it('advances the counter by exactly the number of commands', async () => {
      expect(await readCounter('vendorPurchaseOrder', CURRENT_PERIOD)).toBe(
        counterBefore + PARALLEL_COMMANDS,
      );
    });

    it('every number carries the correct period segment', () => {
      for (const response of responses) {
        expect(response.body.result.documentNumber).toMatch(
          new RegExp(`^MAB-VPO-${CURRENT_PERIOD}-\\d{4,}$`),
        );
      }
    });

    it('writes exactly one receipt per command', async () => {
      const counts = await Promise.all(
        idempotencyKeys.map((key) => countReceipts(key)),
      );

      expect(counts).toEqual(Array(idempotencyKeys.length).fill(1));
    });
  });

  describe('concurrent duplicates of the SAME command', () => {
    /**
     * The other half of contention: the same idempotency key arriving several times at once, as a
     * retrying client behind a load balancer would produce. Exactly one must do the work; the rest
     * must replay it. Two winners here would mean duplicate numbers and duplicate audit rows.
     */
    it('performs the work once and replays it for the rest', async () => {
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

      const counterBefore =
        (await readCounter('vendorPurchaseOrder', CURRENT_PERIOD)) ?? 0;

      const responses = await Promise.all(
        Array.from({ length: 5 }, () => postVendorPurchaseOrder({ body })),
      );

      expect(responses.map((response) => response.status)).toEqual(
        Array(5).fill(201),
      );

      const replayFlags = responses.map(
        (response) => response.body.replayed as boolean,
      );

      expect(replayFlags.filter((flag) => flag === false)).toHaveLength(1);
      expect(replayFlags.filter((flag) => flag === true)).toHaveLength(4);

      // All five must describe the same document — a second winner would show up as a second
      // number here even if both reported success.
      const numbers = new Set(
        responses.map(
          (response) => response.body.result.documentNumber as string,
        ),
      );

      expect(numbers.size).toBe(1);

      expect(await readCounter('vendorPurchaseOrder', CURRENT_PERIOD)).toBe(
        counterBefore + 1,
      );
      expect(await countReceipts(body.idempotencyKey)).toBe(1);
    });
  });
});
