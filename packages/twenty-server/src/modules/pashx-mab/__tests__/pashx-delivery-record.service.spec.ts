import {
  PASHX_COMMAND_EXCEPTION_CODES,
  type PashxCommandSuccess,
  type PashxRecordDeliveryRequest,
  type PashxRecordDeliveryResult,
} from 'pashx-mab-contract';

import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceQueryRunner } from 'src/engine/twenty-orm/query-runner/workspace-query-runner';
import { PashxCommandSupportService } from 'src/modules/pashx-mab/services/pashx-command-support.service';
import { PashxDeliveryRecordService } from 'src/modules/pashx-mab/services/pashx-delivery-record.service';
import {
  PashxWorkflowPersistenceService,
  type PashxWorkflowDocumentRecord,
  type PashxWorkflowRepositories,
} from 'src/modules/pashx-mab/services/pashx-workflow-persistence.service';
import { PashxWorkspaceSchemaService } from 'src/modules/pashx-mab/services/pashx-workspace-schema.service';

const workspaceId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const roleId = '33333333-3333-4333-8333-333333333333';
const correlationId = '55555555-5555-4555-8555-555555555555';
const procurementCaseRecordId = '66666666-6666-4666-8666-666666666666';
const deliveryNoteRecordId = '77777777-7777-4777-8777-777777777777';

const deliveryRequest = (
  overrides: {
    expectedVersion?: number;
    idempotencyKey?: string;
    deliveryStatus?: 'partial' | 'full';
  } = {},
): PashxRecordDeliveryRequest => ({
  contractVersion: 1,
  procurementCaseRecordId,
  idempotencyKey: overrides.idempotencyKey ?? 'delivery-key-1',
  expectedVersion: overrides.expectedVersion ?? 6,
  payload: {
    deliveryNoteRecordId,
    deliveryStatus: overrides.deliveryStatus ?? 'full',
    dueAt: '2026-08-30T14:00:00.000Z',
  },
});

const deliveryNote = (
  overrides: Partial<PashxWorkflowDocumentRecord> = {},
): PashxWorkflowDocumentRecord => ({
  id: deliveryNoteRecordId,
  procurementCaseRecordId,
  documentType: 'deliveryNote',
  lifecycleStatus: 'draft',
  aggregateVersion: 1,
  supplierRecordId: null,
  totalAmountMicros: null,
  ...overrides,
});

const buildHarness = () => {
  const procurementCaseRepository = {
    findOne: jest.fn().mockResolvedValue({
      id: procurementCaseRecordId,
      stage: 'DELIVERY',
      aggregateVersion: 6,
    }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const commercialDocumentRepository = {
    findOne: jest.fn().mockResolvedValue(deliveryNote()),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const repositories = {
    procurementCase: procurementCaseRepository,
    commercialDocument: commercialDocumentRepository,
    approvalRequest: { find: jest.fn() },
  } as unknown as PashxWorkflowRepositories;

  const queryRunner = {
    manager: {},
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
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
  };
  const persistence = {
    getRepositories: jest.fn().mockResolvedValue(repositories),
    loadProcurementCase: jest.fn().mockImplementation(async () => ({
      id: procurementCaseRecordId,
      stage: 'delivery',
      aggregateVersion: 6,
    })),
    assertCaseVersion: jest.fn(),
    loadCommercialDocument: jest.fn().mockResolvedValue(deliveryNote()),
  };
  const workspaceSchema = {
    reconcileSupportTables: jest.fn().mockResolvedValue(1),
  };

  const service = new PashxDeliveryRecordService(
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

describe('PashxDeliveryRecordService', () => {
  it('records delivery, finalizes the note and writes one audited receipt', async () => {
    const harness = buildHarness();

    const result = (await harness.service.record({
      workspaceId,
      actorId,
      roleId,
      correlationId,
      request: deliveryRequest(),
    })) satisfies PashxCommandSuccess<PashxRecordDeliveryResult>;

    expect(result).toMatchObject({
      ok: true,
      replayed: false,
      aggregateId: procurementCaseRecordId,
      aggregateVersion: 7,
      result: {
        procurementCaseRecordId,
        deliveryNoteRecordId,
        deliveryStatus: 'full',
        deliveryDueAt: '2026-08-30T14:00:00.000Z',
        aggregateVersion: 7,
      },
    });
    expect(harness.procurementCaseRepository.update).toHaveBeenCalledWith(
      { id: procurementCaseRecordId, aggregateVersion: 6 },
      {
        deliveryStatus: 'FULL',
        deliveryDueAt: '2026-08-30T14:00:00.000Z',
        aggregateVersion: 7,
      },
      undefined,
      expect.anything(),
    );
    expect(harness.commercialDocumentRepository.update).toHaveBeenCalledWith(
      {
        id: deliveryNoteRecordId,
        aggregateVersion: 1,
        lifecycleStatus: 'DRAFT',
      },
      { lifecycleStatus: 'FINALIZED', aggregateVersion: 2 },
      undefined,
      expect.anything(),
    );
    expect(
      harness.commandSupport.persistCommandReceiptAndAudit,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        commandName: 'delivery.record',
        aggregateId: procurementCaseRecordId,
        aggregateVersion: 7,
      }),
    );
  });

  it('maps a partial delivery status to its manifest value', async () => {
    const harness = buildHarness();

    await harness.service.record({
      workspaceId,
      actorId,
      roleId,
      correlationId,
      request: deliveryRequest({ deliveryStatus: 'partial' }),
    });

    expect(harness.procurementCaseRepository.update).toHaveBeenCalledWith(
      { id: procurementCaseRecordId, aggregateVersion: 6 },
      expect.objectContaining({ deliveryStatus: 'PARTIAL' }),
      undefined,
      expect.anything(),
    );
  });

  it('rejects recording delivery outside the delivery stage', async () => {
    const harness = buildHarness();
    harness.persistence.loadProcurementCase.mockImplementation(async () => ({
      id: procurementCaseRecordId,
      stage: 'vendor-order',
      aggregateVersion: 6,
    }));

    await expect(
      harness.service.record({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: deliveryRequest(),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.invalidTransition,
    });
  });

  it('rejects a delivery note owned by another case', async () => {
    const harness = buildHarness();
    harness.persistence.loadCommercialDocument.mockResolvedValue(
      deliveryNote({
        procurementCaseRecordId: '88888888-8888-4888-8888-888888888888',
      }),
    );

    await expect(
      harness.service.record({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: deliveryRequest(),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.recordNotFound,
      fieldPaths: ['payload.deliveryNoteRecordId'],
    });
  });

  it('rejects a non-delivery-note document as delivery evidence', async () => {
    const harness = buildHarness();
    harness.persistence.loadCommercialDocument.mockResolvedValue(
      deliveryNote({ documentType: 'vendorQuote' }),
    );

    await expect(
      harness.service.record({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: deliveryRequest(),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.invalidInput,
      fieldPaths: ['payload.deliveryNoteRecordId'],
    });
  });

  it('rejects recording against an already finalized delivery note', async () => {
    const harness = buildHarness();
    harness.persistence.loadCommercialDocument.mockResolvedValue(
      deliveryNote({ lifecycleStatus: 'finalized', aggregateVersion: 2 }),
    );

    await expect(
      harness.service.record({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: deliveryRequest(),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.finalizedDocumentImmutable,
    });
  });

  it('rejects recording against a cancelled delivery note', async () => {
    const harness = buildHarness();
    harness.persistence.loadCommercialDocument.mockResolvedValue(
      deliveryNote({ lifecycleStatus: 'cancelled', aggregateVersion: 2 }),
    );

    await expect(
      harness.service.record({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: deliveryRequest(),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.recordConflict,
    });
  });

  it('replays an identical request from the stored receipt without writes', async () => {
    const harness = buildHarness();
    harness.commandSupport.findCommandReplay.mockResolvedValue({
      aggregateId: procurementCaseRecordId,
      aggregateVersion: 7,
      result: {
        procurementCaseRecordId,
        deliveryNoteRecordId,
        deliveryStatus: 'full',
        deliveryDueAt: '2026-08-30T14:00:00.000Z',
        aggregateVersion: 7,
      },
    });

    const result = await harness.service.record({
      workspaceId,
      actorId,
      roleId,
      correlationId,
      request: deliveryRequest(),
    });

    expect(result).toMatchObject({ ok: true, replayed: true });
    expect(harness.persistence.loadProcurementCase).not.toHaveBeenCalled();
    expect(harness.procurementCaseRepository.update).not.toHaveBeenCalled();
  });

  it('rejects a replayed receipt with a non-delivery result shape', async () => {
    const harness = buildHarness();
    harness.commandSupport.findCommandReplay.mockResolvedValue({
      aggregateId: procurementCaseRecordId,
      aggregateVersion: 7,
      result: { wrong: 'shape' },
    });

    await expect(
      harness.service.record({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: deliveryRequest(),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.internalError,
    });
  });

  it('does not write when the case update affects zero rows', async () => {
    const harness = buildHarness();
    harness.procurementCaseRepository.update.mockResolvedValue({
      affected: 0,
    });

    await expect(
      harness.service.record({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: deliveryRequest(),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.staleVersion,
    });
    expect(
      harness.commandSupport.persistCommandReceiptAndAudit,
    ).not.toHaveBeenCalled();
  });

  it('does not write when the note update affects zero rows', async () => {
    const harness = buildHarness();
    harness.commercialDocumentRepository.update.mockResolvedValue({
      affected: 0,
    });

    await expect(
      harness.service.record({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: deliveryRequest(),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.recordConflict,
    });
    expect(
      harness.commandSupport.persistCommandReceiptAndAudit,
    ).not.toHaveBeenCalled();
  });
});
