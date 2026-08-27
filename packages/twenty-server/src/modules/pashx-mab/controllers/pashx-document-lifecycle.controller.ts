import {
  Body,
  Controller,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { randomUUID } from 'node:crypto';
import {
  PASHX_COMMAND_EXCEPTION_CODES,
  PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS,
  type PashxCancelDocumentResult,
  type PashxCommandSuccess,
  type PashxFinalizeDocumentResult,
  type PashxWorkflowValidationResult,
  validateCancelDocumentRequest,
  validateFinalizeDocumentRequest,
} from 'pashx-mab-contract';

import { getWorkspaceAuthContext } from 'src/engine/core-modules/auth/storage/workspace-auth-context.storage';
import { CustomPermissionGuard } from 'src/engine/guards/custom-permission.guard';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { PashxMabException } from 'src/modules/pashx-mab/pashx-mab.exception';
import { PashxCapabilityService } from 'src/modules/pashx-mab/services/pashx-capability.service';
import { PashxDocumentLifecycleService } from 'src/modules/pashx-mab/services/pashx-document-lifecycle.service';
import { throwPashxWorkflowCommandError } from 'src/modules/pashx-mab/utils/pashx-command-http.util';
import { createPashxUnexpectedErrorLog } from 'src/modules/pashx-mab/utils/pashx-unexpected-error-log.util';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('rest/pashx-mab/commercial-documents/:commercialDocumentRecordId')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, CustomPermissionGuard)
export class PashxDocumentLifecycleController {
  private readonly logger = new Logger(PashxDocumentLifecycleController.name);

  constructor(
    private readonly capabilityService: PashxCapabilityService,
    private readonly documentLifecycleService: PashxDocumentLifecycleService,
  ) {}

  @Post('finalize')
  async finalize(
    @Param('commercialDocumentRecordId') commercialDocumentRecordId: string,
    @Body() body: unknown,
  ): Promise<PashxCommandSuccess<PashxFinalizeDocumentResult>> {
    return this.runLifecycle({
      commercialDocumentRecordId,
      body,
      validate: validateFinalizeDocumentRequest,
      execute: (request, context) =>
        this.documentLifecycleService.finalize({ ...context, request }),
    });
  }

  @Post('cancel')
  async cancel(
    @Param('commercialDocumentRecordId') commercialDocumentRecordId: string,
    @Body() body: unknown,
  ): Promise<PashxCommandSuccess<PashxCancelDocumentResult>> {
    return this.runLifecycle({
      commercialDocumentRecordId,
      body,
      validate: validateCancelDocumentRequest,
      execute: (request, context) =>
        this.documentLifecycleService.cancel({ ...context, request }),
    });
  }

  private async runLifecycle<TRequest, TResult>({
    commercialDocumentRecordId,
    body,
    validate,
    execute,
  }: {
    commercialDocumentRecordId: string;
    body: unknown;
    validate: (input: unknown) => PashxWorkflowValidationResult<TRequest>;
    execute: (
      request: TRequest,
      context: {
        workspaceId: string;
        actorId: string;
        roleId: string;
        correlationId: string;
      },
    ) => Promise<TResult>;
  }): Promise<TResult> {
    const correlationId = randomUUID();
    const validation = validate(body);

    if (!UUID.test(commercialDocumentRecordId) || !validation.valid) {
      throwPashxWorkflowCommandError(
        new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.invalidInput, [
          ...(!UUID.test(commercialDocumentRecordId)
            ? ['commercialDocumentRecordId']
            : []),
          ...(!validation.valid ? validation.fieldPaths : []),
        ]),
        correlationId,
      );
    }

    const authContext = getWorkspaceAuthContext();
    if (authContext.type !== 'user') {
      throwPashxWorkflowCommandError(
        new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.forbiddenCapability,
        ),
        correlationId,
      );
    }

    const roleId = await this.capabilityService.getRoleIdIfUserHasCapability({
      workspaceId: authContext.workspace.id,
      userWorkspaceId: authContext.userWorkspaceId,
      capabilityUniversalIdentifier:
        PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS.documentEdit,
    });
    if (roleId === undefined) {
      throwPashxWorkflowCommandError(
        new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.forbiddenCapability,
        ),
        correlationId,
      );
    }

    try {
      return await execute(validation.value, {
        workspaceId: authContext.workspace.id,
        actorId: authContext.user.id,
        roleId,
        correlationId,
      });
    } catch (error) {
      if (error instanceof PashxMabException) {
        throwPashxWorkflowCommandError(error, correlationId);
      }

      const unexpectedErrorLog = createPashxUnexpectedErrorLog({
        error,
        correlationId,
      });
      if (unexpectedErrorLog.stack === undefined) {
        this.logger.error(unexpectedErrorLog.message);
      } else {
        this.logger.error(unexpectedErrorLog.message, unexpectedErrorLog.stack);
      }

      throwPashxWorkflowCommandError(
        new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.internalError),
        correlationId,
      );
    }
  }
}
