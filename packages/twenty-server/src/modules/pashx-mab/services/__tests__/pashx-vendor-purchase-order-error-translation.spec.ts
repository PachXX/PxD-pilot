import { PASHX_COMMAND_EXCEPTION_CODES } from 'pashx-mab-contract';

import { withWorkspaceAuthContext } from 'src/engine/core-modules/auth/storage/workspace-auth-context.storage';
import {
  TwentyORMException,
  TwentyORMExceptionCode,
} from 'src/engine/twenty-orm/exceptions/twenty-orm.exception';
import { PashxVendorPurchaseOrderPersistenceService } from 'src/modules/pashx-mab/services/pashx-vendor-purchase-order-persistence.service';
import { PashxVendorPurchaseOrderService } from 'src/modules/pashx-mab/services/pashx-vendor-purchase-order.service';

const request = {
  commercialDocumentRecordId: '20202020-2020-4020-8020-202020202020',
  idempotencyKey: 'pashx-test-idempotency-key',
  expectedVersion: 0,
  payload: {
    procurementCaseRecordId: '10101010-1010-4010-8010-101010101010',
    supplierRecordId: '30303030-3030-4030-8030-303030303030',
    issueDate: '2026-08-11',
    currency: 'SAR',
  },
};

const result = {
  commercialDocumentRecordId: request.commercialDocumentRecordId,
  procurementCaseRecordId: request.payload.procurementCaseRecordId,
  documentType: 'vendorPurchaseOrder',
  documentNumber: 'MAB-PO-2026-0001',
  lifecycleStatus: 'draft',
  aggregateVersion: 1,
};

describe('PashX vendor purchase order error translation', () => {
  it('maps a wrapped duplicate name to numberConflict', async () => {
    const persistence = new PashxVendorPurchaseOrderPersistenceService(
      {} as never,
    );
    const duplicate = new TwentyORMException(
      'A duplicate entry was detected',
      TwentyORMExceptionCode.DUPLICATE_ENTRY_DETECTED,
      { conflictingFieldName: 'name' },
    );
    const repositories = {
      commercialDocument: { insert: jest.fn().mockRejectedValue(duplicate) },
    } as never;

    await expect(
      withWorkspaceAuthContext({ type: 'system' } as never, () =>
        persistence.persistWorkspaceRecords(
          repositories,
          { manager: {} } as never,
          request as never,
          result as never,
        ),
      ),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.numberConflict,
    });
  });

  it('keeps a wrapped duplicate without field metadata as a typed conflict', async () => {
    const persistence = new PashxVendorPurchaseOrderPersistenceService(
      {} as never,
    );
    const duplicate = new TwentyORMException(
      'A duplicate entry was detected',
      TwentyORMExceptionCode.DUPLICATE_ENTRY_DETECTED,
    );
    const repositories = {
      commercialDocument: { insert: jest.fn().mockRejectedValue(duplicate) },
    } as never;

    await expect(
      withWorkspaceAuthContext({ type: 'system' } as never, () =>
        persistence.persistWorkspaceRecords(
          repositories,
          { manager: {} } as never,
          request as never,
          result as never,
        ),
      ),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.recordConflict,
    });
  });

  it('maps a Twenty ORM query timeout to retryable storage failure', async () => {
    const timeout = new TwentyORMException(
      'Query read timeout',
      TwentyORMExceptionCode.QUERY_READ_TIMEOUT,
    );
    const metricsService = { recordHistogram: jest.fn() };
    const service = new PashxVendorPurchaseOrderService(
      {
        executeInWorkspaceContext: jest.fn().mockRejectedValue(timeout),
      } as never,
      metricsService as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.create({
        workspaceId: 'workspace-id',
        actorId: 'actor-id',
        roleId: 'role-id',
        correlationId: 'correlation-id',
        request: request as never,
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.storageFailure,
    });
    expect(metricsService.recordHistogram).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({ outcome: 'failed' }),
      }),
    );
  });
});
