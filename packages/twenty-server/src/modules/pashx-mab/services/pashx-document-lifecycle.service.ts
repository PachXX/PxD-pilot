import { Injectable } from '@nestjs/common';

import {
  PASHX_COMMAND_EXCEPTION_CODES,
  PASHX_MAB_WORKFLOW_DOCUMENT_RULES,
  type PashxCancelDocumentResult,
  type PashxCommandSuccess,
  type PashxCommercialDocumentType,
  type PashxFinalizeDocumentRequest,
  type PashxFinalizeDocumentResult,
  type PashxMabWorkflowDocumentRule,
} from 'pashx-mab-contract';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceQueryRunner } from 'src/engine/twenty-orm/query-runner/workspace-query-runner';
import { PashxMabException } from 'src/modules/pashx-mab/pashx-mab.exception';
import { PashxCommandSupportService } from 'src/modules/pashx-mab/services/pashx-command-support.service';
import {
  PashxWorkflowPersistenceService,
  type PashxWorkflowDocumentRecord,
  type PashxWorkflowRepositories,
} from 'src/modules/pashx-mab/services/pashx-workflow-persistence.service';
import {
  getPashxWorkspaceSchema,
  PashxWorkspaceSchemaService,
} from 'src/modules/pashx-mab/services/pashx-workspace-schema.service';
import { createDocumentLifecycleFingerprint } from 'src/modules/pashx-mab/utils/pashx-command-fingerprint.util';
import { toManifestLifecycleStatus } from 'src/modules/pashx-mab/utils/pashx-manifest-value.util';

type DocumentLifecycleResult =
  | PashxFinalizeDocumentResult
  | PashxCancelDocumentResult;

// The workflow rules are keyed by the nine workflow document types; legacy
// types (credit/debit notes, generic rfq) have no rule and finalize applies
// only the plain draft transition.
const PASHX_WORKFLOW_RULE_LOOKUP = PASHX_MAB_WORKFLOW_DOCUMENT_RULES as Partial<
  Record<PashxCommercialDocumentType, PashxMabWorkflowDocumentRule>
>;

const isDocumentLifecycleResult = (
  value: unknown,
): value is DocumentLifecycleResult => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const result = value as Readonly<Record<string, unknown>>;

  return (
    typeof result.commercialDocumentRecordId === 'string' &&
    (typeof result.procurementCaseRecordId === 'string' ||
      result.procurementCaseRecordId === null) &&
    typeof result.documentType === 'string' &&
    (result.lifecycleStatus === 'finalized' ||
      result.lifecycleStatus === 'cancelled') &&
    typeof result.aggregateVersion === 'number'
  );
};

@Injectable()
export class PashxDocumentLifecycleService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly commandSupport: PashxCommandSupportService,
    private readonly persistence: PashxWorkflowPersistenceService,
    private readonly workspaceSchema: PashxWorkspaceSchemaService,
  ) {}

  async finalize({
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
    request: PashxFinalizeDocumentRequest;
  }): Promise<PashxCommandSuccess<PashxFinalizeDocumentResult>> {
    return this.execute(workspaceId, roleId, async (context) => {
      const result = await this.runLifecycleCommand({
        ...context,
        workspaceId,
        actorId,
        correlationId,
        request,
        nextStatus: 'finalized',
        commandName: 'document.finalize',
      });

      return result as PashxCommandSuccess<PashxFinalizeDocumentResult>;
    });
  }

  async cancel({
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
    request: PashxFinalizeDocumentRequest;
  }): Promise<PashxCommandSuccess<PashxCancelDocumentResult>> {
    return this.execute(workspaceId, roleId, async (context) => {
      const result = await this.runLifecycleCommand({
        ...context,
        workspaceId,
        actorId,
        correlationId,
        request,
        nextStatus: 'cancelled',
        commandName: 'document.cancel',
      });

      return result as PashxCommandSuccess<PashxCancelDocumentResult>;
    });
  }

  private async runLifecycleCommand({
    workspaceId,
    actorId,
    correlationId,
    request,
    queryRunner,
    repositories,
    nextStatus,
    commandName,
  }: {
    workspaceId: string;
    actorId: string;
    correlationId: string;
    request: PashxFinalizeDocumentRequest;
    queryRunner: WorkspaceQueryRunner;
    repositories: PashxWorkflowRepositories;
    nextStatus: 'finalized' | 'cancelled';
    commandName: 'document.finalize' | 'document.cancel';
  }): Promise<PashxCommandSuccess<DocumentLifecycleResult>> {
    const schema = getPashxWorkspaceSchema(workspaceId);
    const requestHash = createDocumentLifecycleFingerprint(request);

    await this.commandSupport.takeTransactionLock(
      queryRunner,
      `idempotency:${workspaceId}:${request.idempotencyKey}`,
    );
    await this.commandSupport.takeTransactionLock(
      queryRunner,
      `aggregate:${workspaceId}:${request.commercialDocumentRecordId}`,
    );

    const replay = await this.commandSupport.findCommandReplay({
      queryRunner,
      schema,
      idempotencyKey: request.idempotencyKey,
      requestHash,
    });
    if (replay !== undefined) {
      if (!isDocumentLifecycleResult(replay.result)) {
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

    const document = await this.persistence.loadCommercialDocument(
      repositories,
      queryRunner,
      request.commercialDocumentRecordId,
    );
    this.assertLifecycleMove(document, request, nextStatus);

    const result: DocumentLifecycleResult = {
      commercialDocumentRecordId: request.commercialDocumentRecordId,
      procurementCaseRecordId: document.procurementCaseRecordId,
      documentType: document.documentType,
      lifecycleStatus: nextStatus,
      aggregateVersion: document.aggregateVersion + 1,
    };

    const update = await repositories.commercialDocument.update(
      {
        id: request.commercialDocumentRecordId,
        aggregateVersion: document.aggregateVersion,
        lifecycleStatus: toManifestLifecycleStatus(document.lifecycleStatus),
      },
      {
        lifecycleStatus: toManifestLifecycleStatus(nextStatus),
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
      commandName,
      aggregateId: request.commercialDocumentRecordId,
      aggregateVersion: result.aggregateVersion,
      result,
      actorId,
      correlationId,
      payload: { request, result },
    });

    return {
      ok: true,
      replayed: false,
      aggregateId: request.commercialDocumentRecordId,
      aggregateVersion: result.aggregateVersion,
      correlationId,
      result,
    };
  }

  private assertLifecycleMove(
    document: PashxWorkflowDocumentRecord,
    request: PashxFinalizeDocumentRequest,
    nextStatus: 'finalized' | 'cancelled',
  ): void {
    if (document.aggregateVersion !== request.expectedVersion) {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.staleVersion,
        [],
        document.aggregateVersion,
      );
    }

    if (document.lifecycleStatus !== 'draft') {
      if (document.lifecycleStatus === 'finalized') {
        throw new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.finalizedDocumentImmutable,
        );
      }

      throw new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.recordConflict);
    }

    if (nextStatus === 'cancelled') {
      return;
    }

    // Finalizing a document without an owning case would create workflow
    // evidence that no transition can ever use.
    if (document.procurementCaseRecordId === null) {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.documentEvidenceMissing,
      );
    }

    const rule = PASHX_WORKFLOW_RULE_LOOKUP[document.documentType];
    if (rule !== undefined) {
      if (rule.requiresSupplier && document.supplierRecordId === null) {
        throw new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.documentEvidenceMissing,
        );
      }
      if (rule.requiresTotal && document.totalAmountMicros === null) {
        throw new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.documentEvidenceMissing,
        );
      }
    }
  }

  private async execute<T>(
    workspaceId: string,
    roleId: string,
    work: (context: {
      queryRunner: WorkspaceQueryRunner;
      repositories: PashxWorkflowRepositories;
    }) => Promise<T>,
  ): Promise<T> {
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
          const result = await work({ queryRunner, repositories });
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
}
