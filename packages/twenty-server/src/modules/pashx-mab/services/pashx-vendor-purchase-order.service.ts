import { Injectable } from '@nestjs/common';
import {
  PASHX_COMMAND_EXCEPTION_CODES,
  type PashxCommandSuccess,
  type PashxCreateVendorPurchaseOrderRequest,
  type PashxVendorPurchaseOrderResult,
} from 'pashx-mab-contract';
import { MetricsService } from 'src/engine/core-modules/metrics/metrics.service';
import { MetricsKeys } from 'src/engine/core-modules/metrics/types/metrics-keys.type';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceQueryRunner } from 'src/engine/twenty-orm/query-runner/workspace-query-runner';
import { PASHX_FINANCIAL_COMMAND_DURATION_MS_BUCKET_BOUNDARIES } from 'src/modules/pashx-mab/constants/pashx-financial-command-duration-ms-bucket-boundaries.constant';
import { PashxMabException } from 'src/modules/pashx-mab/pashx-mab.exception';
import { PashxCommandSupportService } from 'src/modules/pashx-mab/services/pashx-command-support.service';
import {
  type PashxRepositories,
  PashxVendorPurchaseOrderPersistenceService,
} from 'src/modules/pashx-mab/services/pashx-vendor-purchase-order-persistence.service';
import {
  getPashxWorkspaceSchema,
  PashxWorkspaceSchemaService,
} from 'src/modules/pashx-mab/services/pashx-workspace-schema.service';
import { createVendorPurchaseOrderFingerprint } from 'src/modules/pashx-mab/utils/pashx-command-fingerprint.util';

const PROVISIONAL_NUMBERING_YEAR_RANGE = 1;
@Injectable()
export class PashxVendorPurchaseOrderService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly metricsService: MetricsService,
    private readonly commandSupport: PashxCommandSupportService,
    private readonly persistence: PashxVendorPurchaseOrderPersistenceService,
    private readonly workspaceSchema: PashxWorkspaceSchemaService,
  ) {}

  async create({
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
    request: PashxCreateVendorPurchaseOrderRequest;
  }): Promise<PashxCommandSuccess<PashxVendorPurchaseOrderResult>> {
    const startedAt = performance.now();
    let outcome: 'failed' | 'succeeded' = 'failed';
    let replayed = false;

    try {
      const commandResult =
        await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
          async () => {
            const workspaceDataSource =
              await this.globalWorkspaceOrmManager.getGlobalWorkspaceDataSource();
            const repositories = await this.persistence.getRepositories(
              workspaceId,
              roleId,
            );
            const queryRunner = workspaceDataSource.createQueryRunner();
            await queryRunner.connect();
            try {
              await queryRunner.startTransaction();
              await this.workspaceSchema.reconcileSupportTables(
                queryRunner,
                workspaceId,
              );
              await queryRunner.commitTransaction();
              await queryRunner.startTransaction();
              const result = await this.createInTransaction({
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

      outcome = 'succeeded';
      replayed = commandResult.replayed;

      return commandResult;
    } finally {
      this.metricsService.recordHistogram({
        key: MetricsKeys.PashxFinancialCommandInternalDurationMs,
        value: performance.now() - startedAt,
        unit: 'ms',
        attributes: {
          command: 'document.create',
          documentType: 'vendorPurchaseOrder',
          outcome,
          replayed,
        },
        bucketBoundaries: PASHX_FINANCIAL_COMMAND_DURATION_MS_BUCKET_BOUNDARIES,
      });
    }
  }

  private async createInTransaction({
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
    request: PashxCreateVendorPurchaseOrderRequest;
    queryRunner: WorkspaceQueryRunner;
    repositories: PashxRepositories;
  }): Promise<PashxCommandSuccess<PashxVendorPurchaseOrderResult>> {
    const schema = getPashxWorkspaceSchema(workspaceId);
    const requestHash = createVendorPurchaseOrderFingerprint(request);

    await this.lockCommand(queryRunner, workspaceId, request);
    const replay = await this.commandSupport.findReplay({
      queryRunner,
      schema,
      idempotencyKey: request.idempotencyKey,
      requestHash,
    });

    if (replay !== undefined) {
      return this.success(request, replay, correlationId, true);
    }

    const procurementCase = await this.persistence.loadCommandRecords(
      repositories,
      queryRunner,
      request,
    );
    const result = await this.buildResult(
      queryRunner,
      schema,
      workspaceId,
      request,
      procurementCase.aggregateVersion + 1,
    );

    await this.persistence.persistWorkspaceRecords(
      repositories,
      queryRunner,
      request,
      result,
    );
    await this.commandSupport.persistReceiptAndAudit({
      queryRunner,
      schema,
      request,
      requestHash,
      result,
      actorId,
      correlationId,
    });

    return this.success(request, result, correlationId, false);
  }

  private async lockCommand(
    queryRunner: WorkspaceQueryRunner,
    workspaceId: string,
    request: PashxCreateVendorPurchaseOrderRequest,
  ): Promise<void> {
    await this.commandSupport.takeTransactionLock(
      queryRunner,
      `idempotency:${workspaceId}:${request.idempotencyKey}`,
    );
    await this.commandSupport.takeTransactionLock(
      queryRunner,
      `aggregate:${workspaceId}:${request.payload.procurementCaseRecordId}`,
    );
  }

  private async buildResult(
    queryRunner: WorkspaceQueryRunner,
    schema: string,
    workspaceId: string,
    request: PashxCreateVendorPurchaseOrderRequest,
    nextVersion: number,
  ): Promise<PashxVendorPurchaseOrderResult> {
    const period = request.payload.issueDate.slice(0, 4);
    const issueYear = Number(period);
    const currentYear = new Date().getUTCFullYear();

    if (
      issueYear < currentYear - PROVISIONAL_NUMBERING_YEAR_RANGE ||
      issueYear > currentYear + PROVISIONAL_NUMBERING_YEAR_RANGE
    ) {
      throw new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.invalidInput, [
        'payload.issueDate',
      ]);
    }

    const documentNumber =
      await this.commandSupport.allocateVendorPurchaseOrderNumber({
        queryRunner,
        schema,
        workspaceId,
        period,
      });

    return {
      commercialDocumentRecordId: request.commercialDocumentRecordId,
      procurementCaseRecordId: request.payload.procurementCaseRecordId,
      documentType: 'vendorPurchaseOrder',
      documentNumber,
      lifecycleStatus: 'draft',
      aggregateVersion: nextVersion,
    };
  }

  private success(
    request: PashxCreateVendorPurchaseOrderRequest,
    result: PashxVendorPurchaseOrderResult,
    correlationId: string,
    replayed: boolean,
  ): PashxCommandSuccess<PashxVendorPurchaseOrderResult> {
    return {
      ok: true,
      replayed,
      aggregateId: request.payload.procurementCaseRecordId,
      aggregateVersion: result.aggregateVersion,
      correlationId,
      result,
    };
  }
}
