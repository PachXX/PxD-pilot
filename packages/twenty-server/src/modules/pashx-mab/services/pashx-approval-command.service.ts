import { Injectable } from '@nestjs/common';

import { randomUUID } from 'node:crypto';
import {
  approvalStatusForDecision,
  isPurchaseOrderApprovalDecisionAuthorized,
  PASHX_COMMAND_EXCEPTION_CODES,
  type PashxApprovalCommandResult,
  type PashxCommandName,
  type PashxCommandSuccess,
  type PashxDecideApprovalRequest,
  type PashxRequestApprovalRequest,
} from 'pashx-mab-contract';
import { FieldActorSource } from 'twenty-shared/types';
import { type ObjectLiteral } from 'typeorm';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceQueryRunner } from 'src/engine/twenty-orm/query-runner/workspace-query-runner';
import { type WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { PashxMabException } from 'src/modules/pashx-mab/pashx-mab.exception';
import { PashxCommandSupportService } from 'src/modules/pashx-mab/services/pashx-command-support.service';
import {
  getPashxWorkspaceSchema,
  PashxWorkspaceSchemaService,
} from 'src/modules/pashx-mab/services/pashx-workspace-schema.service';
import {
  createDecideApprovalFingerprint,
  createRequestApprovalFingerprint,
} from 'src/modules/pashx-mab/utils/pashx-command-fingerprint.util';

type ApprovalRow = Readonly<{
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  requesterRecordId: string;
  approverRecordId: string | null;
}>;

@Injectable()
export class PashxApprovalCommandService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly commandSupport: PashxCommandSupportService,
    private readonly workspaceSchema: PashxWorkspaceSchemaService,
  ) {}

  async request({
    workspaceId,
    actorId,
    actorRecordId,
    correlationId,
    request,
  }: {
    workspaceId: string;
    actorId: string;
    actorRecordId: string;
    correlationId: string;
    request: PashxRequestApprovalRequest;
  }): Promise<PashxCommandSuccess<PashxApprovalCommandResult>> {
    return this.execute(
      workspaceId,
      async (
        queryRunner,
        schema,
        approvalRepository,
        workspaceMemberRepository,
      ) => {
        const requestHash = createRequestApprovalFingerprint(request);

        await this.lock(
          queryRunner,
          workspaceId,
          request.idempotencyKey,
          request.approvalRequestRecordId,
        );
        const replay = await this.commandSupport.findApprovalReplay({
          queryRunner,
          schema,
          idempotencyKey: request.idempotencyKey,
          requestHash,
        });
        if (replay !== undefined) {
          return this.success(replay, correlationId, true);
        }

        const existing = await approvalRepository.findOne(
          { where: { id: request.approvalRequestRecordId } },
          queryRunner.manager,
        );
        if (existing !== null) {
          throw new PashxMabException(
            PASHX_COMMAND_EXCEPTION_CODES.recordConflict,
          );
        }
        if (request.approverRecordId !== undefined) {
          const approver = await workspaceMemberRepository.findOne(
            { where: { id: request.approverRecordId } },
            queryRunner.manager,
          );
          if (approver === null) {
            throw new PashxMabException(
              PASHX_COMMAND_EXCEPTION_CODES.recordNotFound,
              ['approverRecordId'],
            );
          }
        }

        const auditEventId = randomUUID();
        await approvalRepository.insert(
          {
            id: request.approvalRequestRecordId,
            name: request.name,
            status: 'PENDING',
            requestedActionCode: request.requestedActionCode,
            payloadDigest: request.payloadDigest,
            sourceRecordIds: request.sourceRecordIds,
            requesterRecordId: actorRecordId,
            approverRecordId: request.approverRecordId ?? null,
            requestedAt: new Date().toISOString(),
            decidedAt: null,
            decisionNote: null,
            decisionActorRecordId: null,
            auditEventId,
            idempotencyKey: request.idempotencyKey,
            createdBy: this.getFieldActor(actorRecordId),
            updatedBy: this.getFieldActor(actorRecordId),
          },
          queryRunner.manager,
        );
        const result: PashxApprovalCommandResult = {
          approvalRequestRecordId: request.approvalRequestRecordId,
          status: 'PENDING',
          decidedAt: null,
        };
        await this.commandSupport.persistApprovalReceiptAndAudit({
          queryRunner,
          schema,
          idempotencyKey: request.idempotencyKey,
          requestHash,
          commandName: 'approval.request',
          result,
          actorId,
          correlationId,
          auditEventId,
          payload: { request, result },
        });

        return this.success(result, correlationId, false);
      },
    );
  }

  async decide({
    workspaceId,
    actorId,
    actorRecordId,
    approvalRequestRecordId,
    correlationId,
    request,
  }: {
    workspaceId: string;
    actorId: string;
    actorRecordId: string;
    approvalRequestRecordId: string;
    correlationId: string;
    request: PashxDecideApprovalRequest;
  }): Promise<PashxCommandSuccess<PashxApprovalCommandResult>> {
    return this.execute(
      workspaceId,
      async (queryRunner, schema, approvalRepository) => {
        const requestHash = createDecideApprovalFingerprint(
          approvalRequestRecordId,
          request,
        );

        await this.lock(
          queryRunner,
          workspaceId,
          request.idempotencyKey,
          approvalRequestRecordId,
        );
        const replay = await this.commandSupport.findApprovalReplay({
          queryRunner,
          schema,
          idempotencyKey: request.idempotencyKey,
          requestHash,
        });
        if (replay !== undefined) {
          return this.success(replay, correlationId, true);
        }

        const approval = (await approvalRepository.findOne(
          { where: { id: approvalRequestRecordId } },
          queryRunner.manager,
        )) as ApprovalRow | null;
        if (approval === null) {
          throw new PashxMabException(
            PASHX_COMMAND_EXCEPTION_CODES.recordNotFound,
          );
        }
        if (approval.status !== request.expectedStatus) {
          throw new PashxMabException(
            PASHX_COMMAND_EXCEPTION_CODES.recordConflict,
            ['expectedStatus'],
            2,
          );
        }
        // D5 assigned-approver enforcement comes from the frozen contract
        // predicate so the enforcing service and the contract test agree.
        // Unauthorized actors fail closed with no partial write.
        if (
          !isPurchaseOrderApprovalDecisionAuthorized({
            requesterRecordId: approval.requesterRecordId,
            approverRecordId: approval.approverRecordId,
            actorRecordId,
            decision: request.decision,
          })
        ) {
          throw new PashxMabException(
            PASHX_COMMAND_EXCEPTION_CODES.forbiddenCapability,
          );
        }

        const status = approvalStatusForDecision(request.decision);
        const decidedAt = new Date().toISOString();
        const auditEventId = randomUUID();
        const update = await approvalRepository.update(
          { id: approvalRequestRecordId, status: 'PENDING' },
          {
            status,
            decidedAt,
            decisionNote: request.decisionNote,
            decisionActorRecordId: actorRecordId,
            auditEventId,
            updatedBy: this.getFieldActor(actorRecordId),
          },
          undefined,
          queryRunner.manager,
        );
        if (update.affected !== 1) {
          throw new PashxMabException(
            PASHX_COMMAND_EXCEPTION_CODES.recordConflict,
          );
        }
        const result: PashxApprovalCommandResult = {
          approvalRequestRecordId,
          status,
          decidedAt,
        };
        const commandName =
          `approval.${request.decision.toLowerCase()}` as Extract<
            PashxCommandName,
            'approval.approve' | 'approval.reject' | 'approval.cancel'
          >;
        await this.commandSupport.persistApprovalReceiptAndAudit({
          queryRunner,
          schema,
          idempotencyKey: request.idempotencyKey,
          requestHash,
          commandName,
          result,
          actorId,
          correlationId,
          auditEventId,
          payload: { request, result },
        });

        return this.success(result, correlationId, false);
      },
    );
  }

  private async execute<T>(
    workspaceId: string,
    work: (
      queryRunner: WorkspaceQueryRunner,
      schema: string,
      approvalRepository: WorkspaceRepository<ObjectLiteral>,
      workspaceMemberRepository: WorkspaceRepository<ObjectLiteral>,
    ) => Promise<T>,
  ): Promise<T> {
    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const dataSource =
          await this.globalWorkspaceOrmManager.getGlobalWorkspaceDataSource();
        // Generic object permissions are read-only by design. Only this capability-gated command
        // boundary receives the unscoped repository needed for an approval state transition.
        const approvalRepository =
          await this.globalWorkspaceOrmManager.getRepository<ObjectLiteral>(
            workspaceId,
            'approvalRequest',
            { shouldBypassPermissionChecks: true },
          );
        const workspaceMemberRepository =
          await this.globalWorkspaceOrmManager.getRepository<ObjectLiteral>(
            workspaceId,
            'workspaceMember',
            { shouldBypassPermissionChecks: true },
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
          const result = await work(
            queryRunner,
            getPashxWorkspaceSchema(workspaceId),
            approvalRepository,
            workspaceMemberRepository,
          );
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

  private async lock(
    queryRunner: WorkspaceQueryRunner,
    workspaceId: string,
    idempotencyKey: string,
    approvalRequestRecordId: string,
  ): Promise<void> {
    await this.commandSupport.takeTransactionLock(
      queryRunner,
      `idempotency:${workspaceId}:${idempotencyKey}`,
    );
    await this.commandSupport.takeTransactionLock(
      queryRunner,
      `approval:${workspaceId}:${approvalRequestRecordId}`,
    );
  }

  private success(
    result: PashxApprovalCommandResult,
    correlationId: string,
    replayed: boolean,
  ): PashxCommandSuccess<PashxApprovalCommandResult> {
    return {
      ok: true,
      replayed,
      aggregateId: result.approvalRequestRecordId,
      aggregateVersion: result.status === 'PENDING' ? 1 : 2,
      correlationId,
      result,
    };
  }

  private getFieldActor(actorRecordId: string) {
    return {
      source: FieldActorSource.API,
      workspaceMemberId: actorRecordId,
      name: 'PxD MAB command',
      context: {},
    };
  }
}
