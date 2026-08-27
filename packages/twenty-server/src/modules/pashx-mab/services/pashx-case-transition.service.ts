import { Injectable } from '@nestjs/common';

import {
  getPashxMabStageTransition,
  PASHX_COMMAND_EXCEPTION_CODES,
  PASHX_MAB_CANCELLABLE_STAGES,
  type PashxCommandSuccess,
  type PashxProcurementCaseStage,
  type PashxTransitionCaseRequest,
  type PashxTransitionCaseResult,
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
import {
  createCaseTransitionApprovalDigest,
  createCaseTransitionFingerprint,
} from 'src/modules/pashx-mab/utils/pashx-command-fingerprint.util';
import { toManifestCaseStage } from 'src/modules/pashx-mab/utils/pashx-manifest-value.util';

const isTransitionCaseResult = (
  value: unknown,
): value is PashxTransitionCaseResult => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const result = value as Readonly<Record<string, unknown>>;

  return (
    typeof result.procurementCaseRecordId === 'string' &&
    typeof result.fromStage === 'string' &&
    typeof result.toStage === 'string' &&
    typeof result.aggregateVersion === 'number'
  );
};

@Injectable()
export class PashxCaseTransitionService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly commandSupport: PashxCommandSupportService,
    private readonly persistence: PashxWorkflowPersistenceService,
    private readonly workspaceSchema: PashxWorkspaceSchemaService,
  ) {}

  async transition({
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
    request: PashxTransitionCaseRequest;
  }): Promise<PashxCommandSuccess<PashxTransitionCaseResult>> {
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
          const result = await this.transitionInTransaction({
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

  private async transitionInTransaction({
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
    request: PashxTransitionCaseRequest;
    queryRunner: WorkspaceQueryRunner;
    repositories: PashxWorkflowRepositories;
  }): Promise<PashxCommandSuccess<PashxTransitionCaseResult>> {
    const schema = getPashxWorkspaceSchema(workspaceId);
    const requestHash = createCaseTransitionFingerprint(request);

    await this.commandSupport.takeTransactionLock(
      queryRunner,
      `idempotency:${workspaceId}:${request.idempotencyKey}`,
    );
    await this.commandSupport.takeTransactionLock(
      queryRunner,
      `aggregate:${workspaceId}:${request.procurementCaseRecordId}`,
    );

    const replay = await this.commandSupport.findCommandReplay({
      queryRunner,
      schema,
      idempotencyKey: request.idempotencyKey,
      requestHash,
    });
    if (replay !== undefined) {
      if (!isTransitionCaseResult(replay.result)) {
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
    await this.assertTransition(
      repositories,
      queryRunner,
      procurementCase.stage,
      request,
    );

    const result: PashxTransitionCaseResult = {
      procurementCaseRecordId: request.procurementCaseRecordId,
      fromStage: request.payload.fromStage,
      toStage: request.payload.toStage,
      aggregateVersion: request.expectedVersion + 1,
    };

    const update = await repositories.procurementCase.update(
      {
        id: request.procurementCaseRecordId,
        aggregateVersion: request.expectedVersion,
        stage: toManifestCaseStage(request.payload.fromStage),
      },
      {
        stage: toManifestCaseStage(request.payload.toStage),
        aggregateVersion: result.aggregateVersion,
      },
      undefined,
      queryRunner.manager,
    );
    if (update.affected !== 1) {
      throw new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.staleVersion);
    }

    await this.commandSupport.persistCommandReceiptAndAudit({
      queryRunner,
      schema,
      idempotencyKey: request.idempotencyKey,
      requestHash,
      commandName: 'case.transition',
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

  private async assertTransition(
    repositories: PashxWorkflowRepositories,
    queryRunner: WorkspaceQueryRunner,
    currentStage: PashxProcurementCaseStage,
    request: PashxTransitionCaseRequest,
  ): Promise<void> {
    const { fromStage, toStage } = request.payload;

    if (fromStage !== currentStage) {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.invalidTransition,
        ['payload.fromStage'],
      );
    }

    if (toStage === 'cancelled') {
      if (
        !(
          PASHX_MAB_CANCELLABLE_STAGES as readonly PashxProcurementCaseStage[]
        ).includes(fromStage)
      ) {
        throw new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.invalidTransition,
        );
      }

      return;
    }

    const transition = getPashxMabStageTransition(fromStage, toStage);
    if (transition === undefined) {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.invalidTransition,
      );
    }

    const finalizedTypes = await this.persistence.findFinalizedDocumentTypes(
      repositories,
      queryRunner,
      request.procurementCaseRecordId,
    );
    const missing = transition.requiredFinalizedDocuments.filter(
      (documentType) => !finalizedTypes.has(documentType),
    );
    if (missing.length > 0) {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.transitionEvidenceMissing,
      );
    }

    if (transition.approvalGate !== 'none') {
      const payloadDigest = createCaseTransitionApprovalDigest({
        procurementCaseRecordId: request.procurementCaseRecordId,
        fromStage,
        toStage,
        expectedVersion: request.expectedVersion,
      });
      const approved = await this.persistence.hasApprovedTransitionApproval({
        repositories,
        queryRunner,
        procurementCaseRecordId: request.procurementCaseRecordId,
        payloadDigest,
      });
      if (!approved) {
        throw new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.approvalGateUnsatisfied,
        );
      }
    }
  }
}
