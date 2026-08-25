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
  type PashxCommandSuccess,
  type PashxRequestSupplierRfqsResult,
  validateRequestSupplierRfqsRequest,
} from 'pashx-mab-contract';

import { getWorkspaceAuthContext } from 'src/engine/core-modules/auth/storage/workspace-auth-context.storage';
import { CustomPermissionGuard } from 'src/engine/guards/custom-permission.guard';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { PashxMabException } from 'src/modules/pashx-mab/pashx-mab.exception';
import { PashxCapabilityService } from 'src/modules/pashx-mab/services/pashx-capability.service';
import { PashxSupplierRfqService } from 'src/modules/pashx-mab/services/pashx-supplier-rfq.service';
import { throwPashxWorkflowCommandError } from 'src/modules/pashx-mab/utils/pashx-command-http.util';
import { createPashxUnexpectedErrorLog } from 'src/modules/pashx-mab/utils/pashx-unexpected-error-log.util';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller(
  'rest/pashx-mab/procurement-cases/:procurementCaseRecordId/supplier-rfqs',
)
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, CustomPermissionGuard)
export class PashxSupplierRfqController {
  private readonly logger = new Logger(PashxSupplierRfqController.name);

  constructor(
    private readonly capabilityService: PashxCapabilityService,
    private readonly supplierRfqService: PashxSupplierRfqService,
  ) {}

  @Post()
  async request(
    @Param('procurementCaseRecordId') procurementCaseRecordId: string,
    @Body() body: unknown,
  ): Promise<PashxCommandSuccess<PashxRequestSupplierRfqsResult>> {
    const correlationId = randomUUID();
    const validation = validateRequestSupplierRfqsRequest(body);

    if (
      !UUID.test(procurementCaseRecordId) ||
      !validation.valid ||
      validation.value.procurementCaseRecordId !== procurementCaseRecordId
    ) {
      throwPashxWorkflowCommandError(
        new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.invalidInput, [
          ...(!UUID.test(procurementCaseRecordId)
            ? ['procurementCaseRecordId']
            : []),
          ...(!validation.valid
            ? validation.fieldPaths
            : validation.value.procurementCaseRecordId !==
                procurementCaseRecordId
              ? ['procurementCaseRecordId']
              : []),
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
        PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS.procurementIssue,
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
      return await this.supplierRfqService.request({
        workspaceId: authContext.workspace.id,
        actorId: authContext.user.id,
        roleId,
        correlationId,
        request: validation.value,
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
