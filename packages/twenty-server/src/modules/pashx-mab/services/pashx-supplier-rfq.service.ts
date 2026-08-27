import { Injectable } from '@nestjs/common';

import {
  PASHX_COMMAND_EXCEPTION_CODES,
  type PashxCommandSuccess,
  type PashxRequestSupplierRfqsRequest,
  type PashxRequestSupplierRfqsResult,
} from 'pashx-mab-contract';
import { isNonEmptyString } from '@sniptt/guards';
import { QueryFailedError } from 'typeorm';
import { FieldActorSource } from 'twenty-shared/types';

import { getWorkspaceAuthContext } from 'src/engine/core-modules/auth/storage/workspace-auth-context.storage';
import { POSTGRESQL_ERROR_CODES } from 'src/engine/api/graphql/workspace-query-runner/constants/postgres-error-codes.constants';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import {
  TwentyORMException,
  TwentyORMExceptionCode,
} from 'src/engine/twenty-orm/exceptions/twenty-orm.exception';
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
import { createSupplierRfqsFingerprint } from 'src/modules/pashx-mab/utils/pashx-command-fingerprint.util';
import { toManifestDocumentType } from 'src/modules/pashx-mab/utils/pashx-manifest-value.util';

type PostgresQueryFailedError = QueryFailedError &
  Readonly<{
    code?: string;
    detail?: string;
    driverError?: Readonly<{ code?: string; detail?: string }>;
  }>;

const isSupplierRfqsResult = (
  value: unknown,
): value is PashxRequestSupplierRfqsResult => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const result = value as Readonly<Record<string, unknown>>;

  return (
    typeof result.procurementCaseRecordId === 'string' &&
    typeof result.dueAt === 'string' &&
    Array.isArray(result.supplierRfqRecordIds) &&
    result.supplierRfqRecordIds.every((id) => typeof id === 'string') &&
    Array.isArray(result.supplierRecordIds) &&
    result.supplierRecordIds.every((id) => typeof id === 'string') &&
    typeof result.aggregateVersion === 'number'
  );
};

const getUniqueViolationColumn = (error: unknown): string | undefined => {
  if (
    error instanceof TwentyORMException &&
    error.code === TwentyORMExceptionCode.DUPLICATE_ENTRY_DETECTED
  ) {
    return error.conflictingFieldName;
  }

  if (!(error instanceof QueryFailedError)) return undefined;

  const postgresError = error as PostgresQueryFailedError;
  const code = postgresError.code ?? postgresError.driverError?.code;

  if (code !== POSTGRESQL_ERROR_CODES.UNIQUE_VIOLATION) return undefined;

  const detail = postgresError.detail ?? postgresError.driverError?.detail;
  const match = detail?.match(/Key \(([^)]+)\)=/);

  return match?.[1].replace(/"/g, '');
};

@Injectable()
export class PashxSupplierRfqService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly commandSupport: PashxCommandSupportService,
    private readonly persistence: PashxWorkflowPersistenceService,
    private readonly workspaceSchema: PashxWorkspaceSchemaService,
  ) {}

  async request({
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
    request: PashxRequestSupplierRfqsRequest;
  }): Promise<PashxCommandSuccess<PashxRequestSupplierRfqsResult>> {
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
          const result = await this.requestInTransaction({
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

  private async requestInTransaction({
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
    request: PashxRequestSupplierRfqsRequest;
    queryRunner: WorkspaceQueryRunner;
    repositories: PashxWorkflowRepositories;
  }): Promise<PashxCommandSuccess<PashxRequestSupplierRfqsResult>> {
    const schema = getPashxWorkspaceSchema(workspaceId);
    const requestHash = createSupplierRfqsFingerprint(request);

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
      if (!isSupplierRfqsResult(replay.result)) {
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
    if (
      procurementCase.stage !== 'intake' &&
      procurementCase.stage !== 'sourcing'
    ) {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.invalidTransition,
      );
    }

    // Supplier RFQs exist to answer a client requirement; without a recorded
    // customer RFQ there is nothing to request quotations against.
    const clientRfqCount = await this.persistence.countCaseDocumentsByType({
      repositories,
      queryRunner,
      procurementCaseRecordId: request.procurementCaseRecordId,
      documentType: toManifestDocumentType('customerRfq'),
    });
    if (clientRfqCount === 0) {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.clientRequirementMissing,
      );
    }

    for (const row of request.payload.vendorRows) {
      await this.persistence.loadCompany(
        repositories,
        queryRunner,
        row.supplierRecordId,
      );
    }

    const period = String(new Date().getUTCFullYear());
    const issueDate = new Date().toISOString().slice(0, 10);
    const fieldActor = this.getFieldActor();

    for (const row of request.payload.vendorRows) {
      const documentNumber =
        await this.commandSupport.allocateSupplierRfqNumber({
          queryRunner,
          schema,
          workspaceId,
          period,
        });

      try {
        await repositories.commercialDocument.insert(
          {
            id: row.supplierRfqRecordId,
            name: documentNumber,
            createdBy: fieldActor,
            updatedBy: fieldActor,
            documentType: toManifestDocumentType('supplierRfq'),
            lifecycleStatus: 'DRAFT',
            aggregateVersion: 1,
            procurementCaseRecordId: request.procurementCaseRecordId,
            supplierRecordId: row.supplierRecordId,
            issueDate,
          },
          queryRunner.manager,
        );
      } catch (error) {
        const conflictingColumn = getUniqueViolationColumn(error);

        if (conflictingColumn === 'id') {
          throw new PashxMabException(
            PASHX_COMMAND_EXCEPTION_CODES.recordConflict,
            ['payload.vendorRows.supplierRfqRecordId'],
          );
        }
        if (
          conflictingColumn === 'name' ||
          (error instanceof TwentyORMException &&
            error.code === TwentyORMExceptionCode.DUPLICATE_ENTRY_DETECTED)
        ) {
          throw new PashxMabException(
            PASHX_COMMAND_EXCEPTION_CODES.numberConflict,
          );
        }

        throw error;
      }
    }

    const result: PashxRequestSupplierRfqsResult = {
      procurementCaseRecordId: request.procurementCaseRecordId,
      dueAt: request.payload.dueAt,
      supplierRfqRecordIds: request.payload.vendorRows.map(
        (row) => row.supplierRfqRecordId,
      ),
      supplierRecordIds: request.payload.vendorRows.map(
        (row) => row.supplierRecordId,
      ),
      aggregateVersion: request.expectedVersion + 1,
    };

    const versionUpdate = await repositories.procurementCase.update(
      {
        id: request.procurementCaseRecordId,
        aggregateVersion: request.expectedVersion,
      },
      { aggregateVersion: result.aggregateVersion },
      undefined,
      queryRunner.manager,
    );
    if (versionUpdate.affected !== 1) {
      throw new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.staleVersion);
    }

    await this.commandSupport.persistCommandReceiptAndAudit({
      queryRunner,
      schema,
      idempotencyKey: request.idempotencyKey,
      requestHash,
      commandName: 'document.create',
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

  private getFieldActor() {
    const authContext = getWorkspaceAuthContext();

    if (authContext.type !== 'user') {
      return {
        source: FieldActorSource.SYSTEM,
        workspaceMemberId: null,
        name: 'PashX MAB',
        context: {},
      };
    }

    return {
      source: FieldActorSource.API,
      workspaceMemberId: authContext.workspaceMemberId ?? null,
      name:
        [
          authContext.workspaceMember?.name?.firstName,
          authContext.workspaceMember?.name?.lastName,
        ]
          .filter(isNonEmptyString)
          .join(' ') ||
        authContext.user?.email ||
        authContext.workspaceMember?.userEmail ||
        'PashX MAB',
      context: {},
    };
  }
}
