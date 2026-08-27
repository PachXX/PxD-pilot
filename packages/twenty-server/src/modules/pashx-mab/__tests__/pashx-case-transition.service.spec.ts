import {
  PASHX_COMMAND_EXCEPTION_CODES,
  type PashxCommandSuccess,
  type PashxTransitionCaseRequest,
  type PashxTransitionCaseResult,
} from 'pashx-mab-contract';

import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceQueryRunner } from 'src/engine/twenty-orm/query-runner/workspace-query-runner';
import { PashxCaseTransitionService } from 'src/modules/pashx-mab/services/pashx-case-transition.service';
import { PashxCommandSupportService } from 'src/modules/pashx-mab/services/pashx-command-support.service';
import {
  PashxWorkflowPersistenceService,
  type PashxWorkflowRepositories,
} from 'src/modules/pashx-mab/services/pashx-workflow-persistence.service';
import { PashxWorkspaceSchemaService } from 'src/modules/pashx-mab/services/pashx-workspace-schema.service';
import { createCaseTransitionApprovalDigest } from 'src/modules/pashx-mab/utils/pashx-command-fingerprint.util';

const workspaceId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const roleId = '33333333-3333-4333-8333-333333333333';
const correlationId = '55555555-5555-4555-8555-555555555555';
const procurementCaseRecordId = '66666666-6666-4666-8666-666666666666';

const transitionRequest = (
  overrides: Partial<PashxTransitionCaseRequest['payload']> & {
    expectedVersion?: number;
    idempotencyKey?: string;
  } = {},
): PashxTransitionCaseRequest => ({
  contractVersion: 1,
  procurementCaseRecordId,
  idempotencyKey: overrides.idempotencyKey ?? 'transition-key-1',
  expectedVersion: overrides.expectedVersion ?? 0,
  payload: {
    fromStage: overrides.fromStage ?? 'intake',
    toStage: overrides.toStage ?? 'sourcing',
  },
});

const transitionResult: PashxTransitionCaseResult = {
  procurementCaseRecordId,
  fromStage: 'intake',
  toStage: 'sourcing',
  aggregateVersion: 1,
};

const buildHarness = () => {
  const procurementCaseRepository = {
    findOne: jest.fn().mockResolvedValue({
      id: procurementCaseRecordId,
      stage: 'INTAKE',
      aggregateVersion: 0,
    }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const repositories = {
    procurementCase: procurementCaseRepository,
    commercialDocument: { find: jest.fn() },
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
    loadProcurementCase: jest
      .fn()
      .mockImplementation(async (_repos, _queryRunner, _id) => ({
        id: procurementCaseRecordId,
        stage: 'intake',
        aggregateVersion: 0,
      })),
    assertCaseVersion: jest.fn(),
    findFinalizedDocumentTypes: jest
      .fn()
      .mockResolvedValue(new Set(['customerRfq'])),
    hasApprovedTransitionApproval: jest.fn().mockResolvedValue(false),
  };
  const workspaceSchema = {
    reconcileSupportTables: jest.fn().mockResolvedValue(1),
  };

  const service = new PashxCaseTransitionService(
    globalWorkspaceOrmManager,
    commandSupport as unknown as PashxCommandSupportService,
    persistence as unknown as PashxWorkflowPersistenceService,
    workspaceSchema as unknown as PashxWorkspaceSchemaService,
  );

  return {
    commandSupport,
    globalWorkspaceOrmManager,
    persistence,
    procurementCaseRepository,
    queryRunner,
    repositories,
    service,
  };
};

describe('PashxCaseTransitionService', () => {
  it('applies an evidence-complete forward transition with receipt and audit', async () => {
    const harness = buildHarness();

    const result = await harness.service.transition({
      workspaceId,
      actorId,
      roleId,
      correlationId,
      request: transitionRequest(),
    });

    expect(result).toMatchObject({
      ok: true,
      replayed: false,
      aggregateId: procurementCaseRecordId,
      aggregateVersion: 1,
      result: transitionResult,
    });
    expect(harness.procurementCaseRepository.update).toHaveBeenCalledWith(
      {
        id: procurementCaseRecordId,
        aggregateVersion: 0,
        stage: 'INTAKE',
      },
      { stage: 'SOURCING', aggregateVersion: 1 },
      undefined,
      expect.anything(),
    );
    expect(
      harness.commandSupport.persistCommandReceiptAndAudit,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        commandName: 'case.transition',
        aggregateId: procurementCaseRecordId,
        aggregateVersion: 1,
        actorId,
        correlationId,
      }),
    );
  });

  it('rejects a from-stage that does not match the live case stage', async () => {
    const harness = buildHarness();

    await expect(
      harness.service.transition({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: transitionRequest({ fromStage: 'sourcing' }),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.invalidTransition,
      fieldPaths: ['payload.fromStage'],
    });
    expect(harness.procurementCaseRepository.update).not.toHaveBeenCalled();
  });

  it('rejects skips and backward moves with an invalid transition', async () => {
    const harness = buildHarness();

    await expect(
      harness.service.transition({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: transitionRequest({ toStage: 'quoted' }),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.invalidTransition,
    });
  });

  it('rejects a forward transition whose required finalized evidence is missing', async () => {
    const harness = buildHarness();
    harness.persistence.findFinalizedDocumentTypes.mockResolvedValue(
      new Set([]),
    );

    await expect(
      harness.service.transition({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: transitionRequest(),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.transitionEvidenceMissing,
    });
  });

  it('requires an approved human decision for a gated transition', async () => {
    const harness = buildHarness();
    harness.persistence.loadProcurementCase.mockImplementation(async () => ({
      id: procurementCaseRecordId,
      stage: 'customer-order',
      aggregateVersion: 4,
    }));
    harness.persistence.findFinalizedDocumentTypes.mockResolvedValue(
      new Set(['vendorPurchaseOrder']),
    );
    const request = transitionRequest({
      fromStage: 'customer-order',
      toStage: 'vendor-order',
      expectedVersion: 4,
    });

    await expect(
      harness.service.transition({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request,
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.approvalGateUnsatisfied,
    });
    expect(
      harness.persistence.hasApprovedTransitionApproval,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        payloadDigest: createCaseTransitionApprovalDigest({
          procurementCaseRecordId,
          fromStage: 'customer-order',
          toStage: 'vendor-order',
          expectedVersion: 4,
        }),
      }),
    );
  });

  it('accepts a gated transition when a matching approval is approved', async () => {
    const harness = buildHarness();
    harness.persistence.loadProcurementCase.mockImplementation(async () => ({
      id: procurementCaseRecordId,
      stage: 'customer-order',
      aggregateVersion: 4,
    }));
    harness.persistence.hasApprovedTransitionApproval.mockResolvedValue(true);
    harness.persistence.findFinalizedDocumentTypes.mockResolvedValue(
      new Set(['vendorPurchaseOrder']),
    );

    const result = await harness.service.transition({
      workspaceId,
      actorId,
      roleId,
      correlationId,
      request: transitionRequest({
        fromStage: 'customer-order',
        toStage: 'vendor-order',
        expectedVersion: 4,
      }),
    });

    expect(result).toMatchObject({ ok: true, replayed: false });
    expect(harness.procurementCaseRepository.update).toHaveBeenCalledWith(
      {
        id: procurementCaseRecordId,
        aggregateVersion: 4,
        stage: 'CUSTOMER_ORDER',
      },
      { stage: 'VENDOR_ORDER', aggregateVersion: 5 },
      undefined,
      expect.anything(),
    );
  });

  it('cancels an active stage without evidence or approval', async () => {
    const harness = buildHarness();
    harness.persistence.loadProcurementCase.mockImplementation(async () => ({
      id: procurementCaseRecordId,
      stage: 'sourcing',
      aggregateVersion: 2,
    }));
    harness.persistence.findFinalizedDocumentTypes.mockResolvedValue(
      new Set([]),
    );

    const result = await harness.service.transition({
      workspaceId,
      actorId,
      roleId,
      correlationId,
      request: transitionRequest({
        fromStage: 'sourcing',
        toStage: 'cancelled',
        expectedVersion: 2,
      }),
    });

    expect(result).toMatchObject({
      ok: true,
      replayed: false,
      result: {
        fromStage: 'sourcing',
        toStage: 'cancelled',
        aggregateVersion: 3,
      },
    });
    expect(
      harness.persistence.findFinalizedDocumentTypes,
    ).not.toHaveBeenCalled();
  });

  it('rejects cancelling a closed case', async () => {
    const harness = buildHarness();
    harness.persistence.loadProcurementCase.mockImplementation(async () => ({
      id: procurementCaseRecordId,
      stage: 'closed',
      aggregateVersion: 9,
    }));

    await expect(
      harness.service.transition({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: transitionRequest({
          fromStage: 'closed',
          toStage: 'cancelled',
          expectedVersion: 9,
        }),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.invalidTransition,
    });
  });

  it('rejects a stale expected version with the current version attached', async () => {
    const harness = buildHarness();
    harness.persistence.loadProcurementCase.mockImplementation(async () => ({
      id: procurementCaseRecordId,
      stage: 'intake',
      aggregateVersion: 2,
    }));
    harness.persistence.assertCaseVersion.mockImplementation(
      (procurementCase: { aggregateVersion: number }, expected: number) => {
        if (procurementCase.aggregateVersion !== expected) {
          const error = new Error('stale') as Error & {
            code: string;
            currentVersion?: number;
          };
          error.code = PASHX_COMMAND_EXCEPTION_CODES.staleVersion;
          error.currentVersion = procurementCase.aggregateVersion;
          throw error;
        }
      },
    );

    await expect(
      harness.service.transition({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: transitionRequest(),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.staleVersion,
      currentVersion: 2,
    });
  });

  it('replays an identical request from the stored receipt without writes', async () => {
    const harness = buildHarness();
    harness.commandSupport.findCommandReplay.mockResolvedValue({
      aggregateId: procurementCaseRecordId,
      aggregateVersion: 1,
      result: transitionResult,
    });

    const result = await harness.service.transition({
      workspaceId,
      actorId,
      roleId,
      correlationId,
      request: transitionRequest(),
    });

    expect(result).toMatchObject({ ok: true, replayed: true });
    expect(harness.persistence.loadProcurementCase).not.toHaveBeenCalled();
    expect(harness.procurementCaseRepository.update).not.toHaveBeenCalled();
    expect(
      harness.commandSupport.persistCommandReceiptAndAudit,
    ).not.toHaveBeenCalled();
  });

  it('rejects a replayed receipt with a non-transition result shape', async () => {
    const harness = buildHarness();
    harness.commandSupport.findCommandReplay.mockResolvedValue({
      aggregateId: procurementCaseRecordId,
      aggregateVersion: 1,
      result: { something: 'else' },
    });

    await expect(
      harness.service.transition({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: transitionRequest(),
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
      harness.service.transition({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: transitionRequest(),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.staleVersion,
    });
    expect(
      harness.commandSupport.persistCommandReceiptAndAudit,
    ).not.toHaveBeenCalled();
  });

  it('returns a typed success envelope shape', async () => {
    const harness = buildHarness();

    const result = (await harness.service.transition({
      workspaceId,
      actorId,
      roleId,
      correlationId,
      request: transitionRequest(),
    })) satisfies PashxCommandSuccess<PashxTransitionCaseResult>;

    expect(result.correlationId).toBe(correlationId);
  });
});
