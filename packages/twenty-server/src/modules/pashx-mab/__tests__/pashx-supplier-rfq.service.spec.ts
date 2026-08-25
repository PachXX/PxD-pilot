import {
  PASHX_COMMAND_EXCEPTION_CODES,
  type PashxCommandSuccess,
  type PashxRequestSupplierRfqsRequest,
  type PashxRequestSupplierRfqsResult,
} from 'pashx-mab-contract';

import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceQueryRunner } from 'src/engine/twenty-orm/query-runner/workspace-query-runner';
import { withWorkspaceAuthContext } from 'src/engine/core-modules/auth/storage/workspace-auth-context.storage';
import {
  TwentyORMException,
  TwentyORMExceptionCode,
} from 'src/engine/twenty-orm/exceptions/twenty-orm.exception';
import { PashxCommandSupportService } from 'src/modules/pashx-mab/services/pashx-command-support.service';
import { PashxSupplierRfqService } from 'src/modules/pashx-mab/services/pashx-supplier-rfq.service';
import {
  PashxWorkflowPersistenceService,
  type PashxWorkflowRepositories,
} from 'src/modules/pashx-mab/services/pashx-workflow-persistence.service';
import { PashxWorkspaceSchemaService } from 'src/modules/pashx-mab/services/pashx-workspace-schema.service';

const workspaceId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const roleId = '33333333-3333-4333-8333-333333333333';
const correlationId = '55555555-5555-4555-8555-555555555555';
const procurementCaseRecordId = '66666666-6666-4666-8666-666666666666';
const supplierA = 'aaaa0000-0000-4000-8000-000000000001';
const supplierB = 'aaaa0000-0000-4000-8000-000000000002';
const rfqA = 'bbbb0000-0000-4000-8000-000000000001';
const rfqB = 'bbbb0000-0000-4000-8000-000000000002';

const supplierRfqsRequest = (
  overrides: { expectedVersion?: number; idempotencyKey?: string } = {},
): PashxRequestSupplierRfqsRequest => ({
  contractVersion: 1,
  procurementCaseRecordId,
  idempotencyKey: overrides.idempotencyKey ?? 'supplier-rfq-key-1',
  expectedVersion: overrides.expectedVersion ?? 2,
  payload: {
    dueAt: '2026-09-05T12:00:00.000Z',
    vendorRows: [
      { supplierRfqRecordId: rfqA, supplierRecordId: supplierA },
      {
        supplierRfqRecordId: rfqB,
        supplierRecordId: supplierB,
        vendorReference: 'MAB-SO-001',
      },
    ],
  },
});

const supplierRfqsResult: PashxRequestSupplierRfqsResult = {
  procurementCaseRecordId,
  dueAt: '2026-09-05T12:00:00.000Z',
  supplierRfqRecordIds: [rfqA, rfqB],
  supplierRecordIds: [supplierA, supplierB],
  aggregateVersion: 3,
};

const buildHarness = () => {
  const procurementCaseRepository = {
    findOne: jest.fn().mockResolvedValue({
      id: procurementCaseRecordId,
      stage: 'INTAKE',
      aggregateVersion: 2,
    }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const commercialDocumentRepository = {
    find: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockResolvedValue(undefined),
  };
  const companyRepository = {
    findOne: jest.fn().mockResolvedValue({ id: supplierA }),
  };
  const repositories = {
    procurementCase: procurementCaseRepository,
    commercialDocument: commercialDocumentRepository,
    approvalRequest: { find: jest.fn() },
    company: companyRepository,
  } as unknown as PashxWorkflowRepositories;

  const queryRunner = {
    manager: {},
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue([{ current_value: '1' }]),
    get isTransactionActive() {
      return false;
    },
  } as unknown as WorkspaceQueryRunner;

  const globalWorkspaceOrmManager = {
    executeInWorkspaceContext: jest.fn((callback: () => unknown) => callback()),
    getGlobalWorkspaceDataSource: jest.fn().mockResolvedValue({
      createQueryRunner: () => queryRunner,
    }),
  } as unknown as GlobalWorkspaceOrmManager;

  const commandSupport = {
    takeTransactionLock: jest.fn().mockResolvedValue(undefined),
    findCommandReplay: jest.fn().mockResolvedValue(undefined),
    persistCommandReceiptAndAudit: jest.fn().mockResolvedValue(undefined),
    allocateSupplierRfqNumber: jest
      .fn()
      .mockResolvedValue('MAB-SRFQ-2026-0001'),
  };
  const persistence = {
    getRepositories: jest.fn().mockResolvedValue(repositories),
    loadProcurementCase: jest.fn().mockImplementation(async () => ({
      id: procurementCaseRecordId,
      stage: 'intake',
      aggregateVersion: 2,
    })),
    assertCaseVersion: jest.fn(),
    countCaseDocumentsByType: jest.fn().mockResolvedValue(1),
    loadCompany: jest.fn().mockResolvedValue(undefined),
  };
  const workspaceSchema = {
    reconcileSupportTables: jest.fn().mockResolvedValue(1),
  };

  const service = new PashxSupplierRfqService(
    globalWorkspaceOrmManager,
    commandSupport as unknown as PashxCommandSupportService,
    persistence as unknown as PashxWorkflowPersistenceService,
    workspaceSchema as unknown as PashxWorkspaceSchemaService,
  );

  return {
    commandSupport,
    commercialDocumentRepository,
    globalWorkspaceOrmManager,
    persistence,
    procurementCaseRepository,
    queryRunner,
    service,
  };
};

const AUTH_CONTEXT = {
  type: 'user',
  user: { id: actorId, email: 'operator@mab.test' },
  userWorkspaceId: roleId,
  workspace: { id: workspaceId },
  workspaceMemberId: '44444444-4444-4444-8444-444444444444',
  workspaceMember: { name: { firstName: 'PashX', lastName: 'Operator' } },
} as never;

const request = (
  harness: ReturnType<typeof buildHarness>,
  overrides: Parameters<typeof supplierRfqsRequest>[0] = {},
) =>
  withWorkspaceAuthContext(AUTH_CONTEXT, () =>
    harness.service.request({
      workspaceId,
      actorId,
      roleId,
      correlationId,
      request: supplierRfqsRequest(overrides),
    }),
  );

describe('PashxSupplierRfqService', () => {
  it('creates one supplier RFQ per vendor with receipt, audit and a case version bump', async () => {
    const harness = buildHarness();

    const result = (await request(
      harness,
    )) satisfies PashxCommandSuccess<PashxRequestSupplierRfqsResult>;

    expect(result).toMatchObject({
      ok: true,
      replayed: false,
      aggregateId: procurementCaseRecordId,
      aggregateVersion: 3,
      result: supplierRfqsResult,
    });
    expect(harness.commercialDocumentRepository.insert).toHaveBeenCalledTimes(
      2,
    );
    expect(harness.commercialDocumentRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: rfqA,
        documentType: 'SUPPLIER_RFQ',
        lifecycleStatus: 'DRAFT',
        aggregateVersion: 1,
        procurementCaseRecordId,
        supplierRecordId: supplierA,
      }),
      expect.anything(),
    );
    expect(
      harness.commandSupport.allocateSupplierRfqNumber,
    ).toHaveBeenCalledTimes(2);
    expect(harness.procurementCaseRepository.update).toHaveBeenCalledWith(
      { id: procurementCaseRecordId, aggregateVersion: 2 },
      { aggregateVersion: 3 },
      undefined,
      expect.anything(),
    );
    expect(
      harness.commandSupport.persistCommandReceiptAndAudit,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        commandName: 'document.create',
        aggregateId: procurementCaseRecordId,
        aggregateVersion: 3,
      }),
    );
  });

  it('rejects a request outside intake or sourcing', async () => {
    const harness = buildHarness();
    harness.persistence.loadProcurementCase.mockImplementation(async () => ({
      id: procurementCaseRecordId,
      stage: 'quoted',
      aggregateVersion: 2,
    }));

    await expect(request(harness)).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.invalidTransition,
    });
    expect(harness.commercialDocumentRepository.insert).not.toHaveBeenCalled();
  });

  it('requires a recorded client RFQ before requesting quotations', async () => {
    const harness = buildHarness();
    harness.persistence.countCaseDocumentsByType.mockResolvedValue(0);

    await expect(request(harness)).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.clientRequirementMissing,
    });
  });

  it('rejects a supplier that does not exist as a company record', async () => {
    const harness = buildHarness();
    harness.persistence.loadCompany.mockImplementation(() => {
      const error = new Error('missing') as Error & { code: string };
      error.code = PASHX_COMMAND_EXCEPTION_CODES.recordNotFound;
      throw error;
    });

    await expect(request(harness)).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.recordNotFound,
    });
  });

  it('maps a duplicate document id to a record conflict', async () => {
    const harness = buildHarness();
    harness.commercialDocumentRepository.insert.mockRejectedValue(
      new TwentyORMException(
        'duplicate',
        TwentyORMExceptionCode.DUPLICATE_ENTRY_DETECTED,
        {
          conflictingFieldName: 'id',
        },
      ),
    );

    await expect(request(harness)).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.recordConflict,
    });
  });

  it('maps a duplicate document number to a number conflict', async () => {
    const harness = buildHarness();
    harness.commercialDocumentRepository.insert.mockRejectedValue(
      new TwentyORMException(
        'duplicate',
        TwentyORMExceptionCode.DUPLICATE_ENTRY_DETECTED,
        {
          conflictingFieldName: 'name',
        },
      ),
    );

    await expect(request(harness)).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.numberConflict,
    });
  });

  it('does not write when the case version update affects zero rows', async () => {
    const harness = buildHarness();
    harness.procurementCaseRepository.update.mockResolvedValue({
      affected: 0,
    });

    await expect(request(harness)).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.staleVersion,
    });
    expect(
      harness.commandSupport.persistCommandReceiptAndAudit,
    ).not.toHaveBeenCalled();
  });

  it('replays an identical request from the stored receipt without writes', async () => {
    const harness = buildHarness();
    harness.commandSupport.findCommandReplay.mockResolvedValue({
      aggregateId: procurementCaseRecordId,
      aggregateVersion: 3,
      result: supplierRfqsResult,
    });

    const result = await harness.service.request({
      workspaceId,
      actorId,
      roleId,
      correlationId,
      request: supplierRfqsRequest(),
    });

    expect(result).toMatchObject({ ok: true, replayed: true });
    expect(harness.persistence.loadProcurementCase).not.toHaveBeenCalled();
    expect(harness.commercialDocumentRepository.insert).not.toHaveBeenCalled();
  });

  it('rejects a replayed receipt with a non-supplier-rfq result shape', async () => {
    const harness = buildHarness();
    harness.commandSupport.findCommandReplay.mockResolvedValue({
      aggregateId: procurementCaseRecordId,
      aggregateVersion: 3,
      result: { not: 'a supplier rfq result' },
    });

    await expect(request(harness)).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.internalError,
    });
  });
});
