import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { randomUUID } from 'node:crypto';
import {
  PASHX_COMMAND_ERROR_DEFINITIONS,
  PASHX_COMMAND_EXCEPTION_CODES,
  PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS,
  type PashxApprovalCommandResult,
  type PashxCommandError,
  type PashxCommandExceptionCode,
  type PashxCommandSuccess,
  validateDecideApproval,
  validateRequestApproval,
} from 'pashx-mab-contract';

import { getWorkspaceAuthContext } from 'src/engine/core-modules/auth/storage/workspace-auth-context.storage';
import { CustomPermissionGuard } from 'src/engine/guards/custom-permission.guard';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { PashxMabException } from 'src/modules/pashx-mab/pashx-mab.exception';
import { PashxApprovalCommandService } from 'src/modules/pashx-mab/services/pashx-approval-command.service';
import { PashxCapabilityService } from 'src/modules/pashx-mab/services/pashx-capability.service';
import { createPashxUnexpectedErrorLog } from 'src/modules/pashx-mab/utils/pashx-unexpected-error-log.util';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const statusForCode = (code: PashxCommandExceptionCode): HttpStatus => {
  switch (code) {
    case PASHX_COMMAND_EXCEPTION_CODES.invalidInput:
      return HttpStatus.BAD_REQUEST;
    case PASHX_COMMAND_EXCEPTION_CODES.forbiddenCapability:
      return HttpStatus.FORBIDDEN;
    case PASHX_COMMAND_EXCEPTION_CODES.recordNotFound:
      return HttpStatus.NOT_FOUND;
    case PASHX_COMMAND_EXCEPTION_CODES.staleVersion:
    case PASHX_COMMAND_EXCEPTION_CODES.idempotencyKeyReused:
    case PASHX_COMMAND_EXCEPTION_CODES.numberConflict:
    case PASHX_COMMAND_EXCEPTION_CODES.recordConflict:
      return HttpStatus.CONFLICT;
    case PASHX_COMMAND_EXCEPTION_CODES.storageFailure:
    case PASHX_COMMAND_EXCEPTION_CODES.providerRetryableFailure:
      return HttpStatus.SERVICE_UNAVAILABLE;
    default:
      return HttpStatus.INTERNAL_SERVER_ERROR;
  }
};

@Controller('rest/pashx-mab/approval-requests')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, CustomPermissionGuard)
export class PashxApprovalCommandController {
  private readonly logger = new Logger(PashxApprovalCommandController.name);

  constructor(
    private readonly capabilityService: PashxCapabilityService,
    private readonly approvalCommandService: PashxApprovalCommandService,
  ) {}

  @Post()
  async requestApproval(
    @Body() body: unknown,
  ): Promise<PashxCommandSuccess<PashxApprovalCommandResult>> {
    const correlationId = randomUUID();
    const validation = validateRequestApproval(body);

    if (!validation.valid) {
      this.throwCommandError(
        new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.invalidInput,
          validation.fieldPaths,
        ),
        correlationId,
      );
    }
    const authContext = getWorkspaceAuthContext();
    if (authContext.type !== 'user') {
      this.throwCommandError(
        new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.forbiddenCapability,
        ),
        correlationId,
      );
    }
    if (authContext.workspaceMemberId == null) {
      this.throwCommandError(
        new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.forbiddenCapability,
        ),
        correlationId,
      );
    }
    await this.requireCapability(
      authContext.workspace.id,
      authContext.userWorkspaceId,
      PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS.approvalRequest,
      correlationId,
    );

    try {
      return await this.approvalCommandService.request({
        workspaceId: authContext.workspace.id,
        actorId: authContext.user.id,
        actorRecordId: authContext.workspaceMemberId,
        correlationId,
        request: validation.value,
      });
    } catch (error) {
      this.handleError(error, correlationId);
    }
  }

  @Post(':approvalRequestRecordId/decisions')
  async decideApproval(
    @Param('approvalRequestRecordId') approvalRequestRecordId: string,
    @Body() body: unknown,
  ): Promise<PashxCommandSuccess<PashxApprovalCommandResult>> {
    const correlationId = randomUUID();
    const validation = validateDecideApproval(body);

    if (!UUID.test(approvalRequestRecordId) || !validation.valid) {
      this.throwCommandError(
        new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.invalidInput, [
          ...(!UUID.test(approvalRequestRecordId)
            ? ['approvalRequestRecordId']
            : []),
          ...(!validation.valid ? validation.fieldPaths : []),
        ]),
        correlationId,
      );
    }
    const authContext = getWorkspaceAuthContext();
    if (authContext.type !== 'user') {
      this.throwCommandError(
        new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.forbiddenCapability,
        ),
        correlationId,
      );
    }
    if (authContext.workspaceMemberId == null) {
      this.throwCommandError(
        new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.forbiddenCapability,
        ),
        correlationId,
      );
    }
    await this.requireCapability(
      authContext.workspace.id,
      authContext.userWorkspaceId,
      validation.value.decision === 'CANCEL'
        ? PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS.approvalRequest
        : PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS.approvalDecide,
      correlationId,
    );

    try {
      return await this.approvalCommandService.decide({
        workspaceId: authContext.workspace.id,
        actorId: authContext.user.id,
        actorRecordId: authContext.workspaceMemberId,
        approvalRequestRecordId,
        correlationId,
        request: validation.value,
      });
    } catch (error) {
      this.handleError(error, correlationId);
    }
  }

  private async requireCapability(
    workspaceId: string,
    userWorkspaceId: string,
    capabilityUniversalIdentifier: string,
    correlationId: string,
  ): Promise<void> {
    const roleId = await this.capabilityService.getRoleIdIfUserHasCapability({
      workspaceId,
      userWorkspaceId,
      capabilityUniversalIdentifier,
    });
    if (roleId === undefined) {
      this.throwCommandError(
        new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.forbiddenCapability,
        ),
        correlationId,
      );
    }
  }

  private handleError(error: unknown, correlationId: string): never {
    if (error instanceof PashxMabException)
      this.throwCommandError(error, correlationId);

    const unexpectedErrorLog = createPashxUnexpectedErrorLog({
      error,
      correlationId,
    });
    if (unexpectedErrorLog.stack === undefined)
      this.logger.error(unexpectedErrorLog.message);
    else
      this.logger.error(unexpectedErrorLog.message, unexpectedErrorLog.stack);

    this.throwCommandError(
      new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.internalError),
      correlationId,
    );
  }

  private throwCommandError(
    error: PashxMabException,
    correlationId: string,
  ): never {
    const response: PashxCommandError = {
      ok: false,
      code: error.code,
      correlationId,
      retryable: PASHX_COMMAND_ERROR_DEFINITIONS[error.code].retryable,
      fieldPaths: error.fieldPaths,
      ...(error.currentVersion === undefined
        ? {}
        : { currentVersion: error.currentVersion }),
    };

    throw new HttpException(response, statusForCode(error.code));
  }
}
