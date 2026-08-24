import { Injectable } from '@nestjs/common';

import {
  PASHX_COMMAND_EXCEPTION_CODES,
  type PashxCommandSuccess,
  type PashxRecordDeliveryRequest,
  type PashxRecordDeliveryResult,
} from 'pashx-mab-contract';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceQueryRunner } from 'src/engine/twenty-orm/query-runner/workspace-query-runner';
import { PashxMabException } from 'src/modules/pashx-mab/pashx-mab.exception';
import { PashxCommandSupportService } from 'src/modules/pashx-mab/services/pashx-command-support.service';
import {
  PashxWorkflowPersistenceService,
  type PashxWorkflowRepositories,
} from 'src/modules/pashx-mab/services/pashx-workflow-persistence.service';
import {
  getPashxWorkspaceSchema,
  PashxWorkspaceSchemaService,
} from 'src/modules/pashx-mab/services/pashx-workspace-schema.service';
import { createRecordDeliveryFingerprint } from 'src/modules/pashx-mab/utils/pashx-command-fingerprint.util';
import {
  toManifestDeliveryStatus,
  toManifestLifecycleStatus,
} from 'src/modules/pashx-mab/utils/pashx-manifest-value.util';

const isRecordDeliveryResult = (
  value: unknown,
): value is PashxRecordDeliveryResult => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const result = value as Readonly<Record<string, unknown>>;

  return (
    typeof result.procurementCaseRecordId === 'string' &&
    typeof result.deliveryNoteRecordId === 'string' &&
    (result.deliveryStatus === 'partial' || result.deliveryStatus === 'full') &&
    typeof result.deliveryDueAt === 'string' &&
    typeof result.aggregateVersion === 'number'
  );
};

@Injectable()
export class PashxDeliveryRecordService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly commandSupport: PashxCommandSupportService,
    private readonly persistence: PashxWorkflowPersistenceService,
    private readonly workspaceSchema: PashxWorkspaceSchemaService,
  ) {}

  async record({
    workspaceId,
    actorId,
    roleId,
    correlationId,
    request,
  }: {
    workspaceId: string;
    actorId: string;
    roleId: string;
    correlationId: string;
    request: PashxRecordDeliveryRequest;
  }): Promise<PashxCommandSuccess<PashxRecordDeliveryResult>> {
    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const dataSource =
          await this.globalWorkspaceOrmManager.getGlobalWorkspaceDataSource();
        const repositories = await this.persistence.getRepositories(
          workspaceId,
          roleId,
        );
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        try {
          await queryRunner.startTransaction();
          await this.workspaceSchema.reconcileSupportTables(
            queryRunner,
            workspaceId,
          );
          await queryRunner.commitTransaction();
          await queryRunner.startTransaction();
          const result = await this.recordInTransaction({
            workspaceId,
            actorId,
            correlationId,
            request,
            queryRunner,
            repositories,
          });
          await queryRunner.commitTransaction();
          return result;
        } catch (error) {
          if (queryRunner.isTransactionActive) {
            await queryRunner.rollbackTransaction();
          }

          throw error;
        } finally {
          await queryRunner.release();
        }
      },
    );
  }

  private async recordInTransaction({
    workspaceId,
    actorId,
    correlationId,
    request,
    queryRunner,
    repositories,
  }: {
    workspaceId: string;
    actorId: string;
    correlationId: string;
    request: PashxRecordDeliveryRequest;
    queryRunner: WorkspaceQueryRunner;
    repositories: PashxWorkflowRepositories;
  }): Promise<PashxCommandSuccess<PashxRecordDeliveryResult>> {
    const schema = getPashxWorkspaceSchema(workspaceId);
    const requestHash = createRecordDeliveryFingerprint(request);

    await this.commandSupport.takeTransactionLock(
      queryRunner,
      `idempotency:${workspaceId}:${request.idempotencyKey}`,
    );
    await this.commandSupport.takeTransactionLock(
      queryRunner,
      `aggregate:${workspaceId}:${request.procurementCaseRecordId}`,
    );
    await this.commandSupport.takeTransactionLock(
      queryRunner,
      `aggregate:${workspaceId}:${request.payload.deliveryNoteRecordId}`,
    );

    const replay = await this.commandSupport.findCommandReplay({
      queryRunner,
      schema,
      idempotencyKey: request.idempotencyKey,
      requestHash,
    });
    if (replay !== undefined) {
      if (!isRecordDeliveryResult(replay.result)) {
        throw new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.internalError,
        );
      }

      return {
        ok: true,
        replayed: true,
        aggregateId: replay.aggregateId,
        aggregateVersion: replay.aggregateVersion,
        correlationId,
        result: replay.result,
      };
    }

    const procurementCase = await this.persistence.loadProcurementCase(
      repositories,
      queryRunner,
      request.procurementCaseRecordId,
    );
    this.persistence.assertCaseVersion(
      procurementCase,
      request.expectedVersion,
    );
    if (procurementCase.stage !== 'delivery') {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.invalidTransition,
      );
    }

    const deliveryNote = await this.persistence.loadCommercialDocument(
      repositories,
      queryRunner,
      request.payload.deliveryNoteRecordId,
    );
    this.assertDeliveryNote(deliveryNote, request);

    const result: PashxRecordDeliveryResult = {
      procurementCaseRecordId: request.procurementCaseRecordId,
      deliveryNoteRecordId: request.payload.deliveryNoteRecordId,
      deliveryStatus: request.payload.deliveryStatus,
      deliveryDueAt: request.payload.dueAt,
      aggregateVersion: request.expectedVersion + 1,
    };

    const caseUpdate = await repositories.procurementCase.update(
      {
        id: request.procurementCaseRecordId,
        aggregateVersion: request.expectedVersion,
      },
      {
        deliveryStatus: toManifestDeliveryStatus(
          request.payload.deliveryStatus,
        ),
        deliveryDueAt: request.payload.dueAt,
        aggregateVersion: result.aggregateVersion,
      },
      undefined,
      queryRunner.manager,
    );
    if (caseUpdate.affected !== 1) {
      throw new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.staleVersion);
    }

    const noteUpdate = await repositories.commercialDocument.update(
      {
        id: request.payload.deliveryNoteRecordId,
        aggregateVersion: deliveryNote.aggregateVersion,
        lifecycleStatus: toManifestLifecycleStatus(
          deliveryNote.lifecycleStatus,
        ),
      },
      {
        lifecycleStatus: toManifestLifecycleStatus('finalized'),
        aggregateVersion: deliveryNote.aggregateVersion + 1,
      },
      undefined,
      queryRunner.manager,
    );
    if (noteUpdate.affected !== 1) {
      throw new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.recordConflict);
    }

    await this.commandSupport.persistCommandReceiptAndAudit({
      queryRunner,
      schema,
      idempotencyKey: request.idempotencyKey,
      requestHash,
      commandName: 'delivery.record',
      aggregateId: request.procurementCaseRecordId,
      aggregateVersion: result.aggregateVersion,
      result,
      actorId,
      correlationId,
      payload: { request, result },
    });

    return {
      ok: true,
      replayed: false,
      aggregateId: request.procurementCaseRecordId,
      aggregateVersion: result.aggregateVersion,
      correlationId,
      result,
    };
  }

  private assertDeliveryNote(
    deliveryNote: {
      id: string;
      procurementCaseRecordId: string | null;
      documentType: string;
      lifecycleStatus: string;
    },
    request: PashxRecordDeliveryRequest,
  ): void {
    if (
      deliveryNote.procurementCaseRecordId !== request.procurementCaseRecordId
    ) {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.recordNotFound,
        ['payload.deliveryNoteRecordId'],
      );
    }
    if (deliveryNote.documentType !== 'deliveryNote') {
      throw new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.invalidInput, [
        'payload.deliveryNoteRecordId',
      ]);
    }
    if (deliveryNote.lifecycleStatus !== 'draft') {
      if (deliveryNote.lifecycleStatus === 'finalized') {
        throw new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.finalizedDocumentImmutable,
        );
      }

      throw new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.recordConflict);
    }
  }
}
