import {
  PASHX_COMMAND_EXCEPTION_CODES,
  type PashxCommandSuccess,
  type PashxFinalizeDocumentRequest,
  type PashxFinalizeDocumentResult,
} from 'pashx-mab-contract';

import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceQueryRunner } from 'src/engine/twenty-orm/query-runner/workspace-query-runner';
import { PashxCommandSupportService } from 'src/modules/pashx-mab/services/pashx-command-support.service';
import { PashxDocumentLifecycleService } from 'src/modules/pashx-mab/services/pashx-document-lifecycle.service';
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
const commercialDocumentRecordId = '77777777-7777-4777-8777-777777777777';

const finalizeRequest = (
  overrides: { expectedVersion?: number; idempotencyKey?: string } = {},
): PashxFinalizeDocumentRequest => ({
  contractVersion: 1,
  commercialDocumentRecordId,
  idempotencyKey: overrides.idempotencyKey ?? 'finalize-key-1',
  expectedVersion: overrides.expectedVersion ?? 1,
});

const documentRecord = (
  overrides: Partial<PashxWorkflowDocumentRecord> = {},
): PashxWorkflowDocumentRecord => ({
  id: commercialDocumentRecordId,
  procurementCaseRecordId,
  documentType: 'vendorQuote',
  lifecycleStatus: 'draft',
  aggregateVersion: 1,
  supplierRecordId: '99999999-9999-4999-8999-999999999999',
  totalAmountMicros: 150000000000,
  ...overrides,
});

const buildHarness = () => {
  const commercialDocumentRepository = {
    findOne: jest.fn().mockResolvedValue(documentRecord()),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const repositories = {
    procurementCase: { findOne: jest.fn(), update: jest.fn() },
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
    loadCommercialDocument: jest.fn().mockResolvedValue(documentRecord()),
  };
  const workspaceSchema = {
    reconcileSupportTables: jest.fn().mockResolvedValue(1),
  };

  const service = new PashxDocumentLifecycleService(
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
    queryRunner,
    service,
  };
};

describe('PashxDocumentLifecycleService', () => {
  it('finalizes a draft with receipt and a document.finalize audit event', async () => {
    const harness = buildHarness();

    const result = (await harness.service.finalize({
      workspaceId,
      actorId,
      roleId,
      correlationId,
      request: finalizeRequest(),
    })) satisfies PashxCommandSuccess<PashxFinalizeDocumentResult>;

    expect(result).toMatchObject({
      ok: true,
      replayed: false,
      aggregateId: commercialDocumentRecordId,
      aggregateVersion: 2,
      result: {
        commercialDocumentRecordId,
        procurementCaseRecordId,
        documentType: 'vendorQuote',
        lifecycleStatus: 'finalized',
        aggregateVersion: 2,
      },
    });
    expect(harness.commercialDocumentRepository.update).toHaveBeenCalledWith(
      {
        id: commercialDocumentRecordId,
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
        commandName: 'document.finalize',
        aggregateId: commercialDocumentRecordId,
      }),
    );
  });

  it('cancels a draft without workflow-rule checks', async () => {
    const harness = buildHarness();
    harness.persistence.loadCommercialDocument.mockResolvedValue(
      documentRecord({
        documentType: 'customerRfq',
        supplierRecordId: null,
        totalAmountMicros: null,
      }),
    );

    const result = await harness.service.cancel({
      workspaceId,
      actorId,
      roleId,
      correlationId,
      request: finalizeRequest(),
    });

    expect(result).toMatchObject({
      ok: true,
      result: {
        lifecycleStatus: 'cancelled',
        aggregateVersion: 2,
      },
    });
    expect(
      harness.commandSupport.persistCommandReceiptAndAudit,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ commandName: 'document.cancel' }),
    );
  });

  it('rejects finalizing a document without an owning case', async () => {
    const harness = buildHarness();
    harness.persistence.loadCommercialDocument.mockResolvedValue(
      documentRecord({ procurementCaseRecordId: null }),
    );

    await expect(
      harness.service.finalize({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: finalizeRequest(),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.documentEvidenceMissing,
    });
  });

  it('rejects finalizing a supplier-bound document without a supplier', async () => {
    const harness = buildHarness();
    harness.persistence.loadCommercialDocument.mockResolvedValue(
      documentRecord({ supplierRecordId: null }),
    );

    await expect(
      harness.service.finalize({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: finalizeRequest(),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.documentEvidenceMissing,
    });
  });

  it('rejects finalizing a total-bound document without a total', async () => {
    const harness = buildHarness();
    harness.persistence.loadCommercialDocument.mockResolvedValue(
      documentRecord({ totalAmountMicros: null }),
    );

    await expect(
      harness.service.finalize({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: finalizeRequest(),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.documentEvidenceMissing,
    });
  });

  it('finalizes a legacy document type with no workflow rule', async () => {
    const harness = buildHarness();
    harness.persistence.loadCommercialDocument.mockResolvedValue(
      documentRecord({
        documentType: 'creditNote',
        supplierRecordId: null,
        totalAmountMicros: null,
      }),
    );

    const result = await harness.service.finalize({
      workspaceId,
      actorId,
      roleId,
      correlationId,
      request: finalizeRequest(),
    });

    expect(result).toMatchObject({ ok: true, replayed: false });
  });

  it('rejects any lifecycle move on an already finalized document', async () => {
    const harness = buildHarness();
    harness.persistence.loadCommercialDocument.mockResolvedValue(
      documentRecord({ lifecycleStatus: 'finalized', aggregateVersion: 2 }),
    );

    await expect(
      harness.service.finalize({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: finalizeRequest({ expectedVersion: 2 }),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.finalizedDocumentImmutable,
    });
    await expect(
      harness.service.cancel({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: finalizeRequest({ expectedVersion: 2 }),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.finalizedDocumentImmutable,
    });
  });

  it('rejects a lifecycle move on a cancelled document', async () => {
    const harness = buildHarness();
    harness.persistence.loadCommercialDocument.mockResolvedValue(
      documentRecord({ lifecycleStatus: 'cancelled', aggregateVersion: 2 }),
    );

    await expect(
      harness.service.finalize({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: finalizeRequest({ expectedVersion: 2 }),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.recordConflict,
    });
  });

  it('rejects a stale expected version with the current version attached', async () => {
    const harness = buildHarness();
    harness.persistence.loadCommercialDocument.mockResolvedValue(
      documentRecord({ aggregateVersion: 3 }),
    );

    await expect(
      harness.service.finalize({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: finalizeRequest({ expectedVersion: 1 }),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.staleVersion,
      currentVersion: 3,
    });
  });

  it('replays an identical request from the stored receipt without writes', async () => {
    const harness = buildHarness();
    harness.commandSupport.findCommandReplay.mockResolvedValue({
      aggregateId: commercialDocumentRecordId,
      aggregateVersion: 2,
      result: {
        commercialDocumentRecordId,
        procurementCaseRecordId,
        documentType: 'vendorQuote',
        lifecycleStatus: 'finalized',
        aggregateVersion: 2,
      },
    });

    const result = await harness.service.finalize({
      workspaceId,
      actorId,
      roleId,
      correlationId,
      request: finalizeRequest(),
    });

    expect(result).toMatchObject({ ok: true, replayed: true });
    expect(harness.persistence.loadCommercialDocument).not.toHaveBeenCalled();
    expect(harness.commercialDocumentRepository.update).not.toHaveBeenCalled();
  });

  it('rejects a replayed receipt with a non-document result shape', async () => {
    const harness = buildHarness();
    harness.commandSupport.findCommandReplay.mockResolvedValue({
      aggregateId: commercialDocumentRecordId,
      aggregateVersion: 2,
      result: { not: 'a document result' },
    });

    await expect(
      harness.service.finalize({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: finalizeRequest(),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.internalError,
    });
  });

  it('does not write when the document update affects zero rows', async () => {
    const harness = buildHarness();
    harness.commercialDocumentRepository.update.mockResolvedValue({
      affected: 0,
    });

    await expect(
      harness.service.finalize({
        workspaceId,
        actorId,
        roleId,
        correlationId,
        request: finalizeRequest(),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.staleVersion,
    });
    expect(
      harness.commandSupport.persistCommandReceiptAndAudit,
    ).not.toHaveBeenCalled();
  });
});
