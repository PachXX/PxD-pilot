import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';

import { randomUUID } from 'node:crypto';
import {
  PASHX_COMMAND_ERROR_DEFINITIONS,
  PASHX_COMMAND_EXCEPTION_CODES,
  PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS,
  type PashxCommandError,
  type PashxCommandExceptionCode,
  type PashxCommandSuccess,
  type PashxVendorPurchaseOrderResult,
  validateCreateVendorPurchaseOrderRequest,
} from 'pashx-mab-contract';

import { getWorkspaceAuthContext } from 'src/engine/core-modules/auth/storage/workspace-auth-context.storage';
import { CustomPermissionGuard } from 'src/engine/guards/custom-permission.guard';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  PermissionsException,
  PermissionsExceptionCode,
} from 'src/engine/metadata-modules/permissions/permissions.exception';
import { PashxMabException } from 'src/modules/pashx-mab/pashx-mab.exception';
import { PashxCapabilityService } from 'src/modules/pashx-mab/services/pashx-capability.service';
import { PashxVendorPurchaseOrderService } from 'src/modules/pashx-mab/services/pashx-vendor-purchase-order.service';
import { createPashxUnexpectedErrorLog } from 'src/modules/pashx-mab/utils/pashx-unexpected-error-log.util';

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
    case PASHX_COMMAND_EXCEPTION_CODES.internalError:
      return HttpStatus.INTERNAL_SERVER_ERROR;
    default:
      return HttpStatus.UNPROCESSABLE_ENTITY;
  }
};

@Controller('rest/pashx-mab/vendor-purchase-orders')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, CustomPermissionGuard)
export class PashxVendorPurchaseOrderController {
  private readonly logger = new Logger(PashxVendorPurchaseOrderController.name);

  constructor(
    private readonly capabilityService: PashxCapabilityService,
    private readonly vendorPurchaseOrderService: PashxVendorPurchaseOrderService,
  ) {}

  @Post()
  async create(
    @Body() body: unknown,
  ): Promise<PashxCommandSuccess<PashxVendorPurchaseOrderResult>> {
    const correlationId = randomUUID();
    const validation = validateCreateVendorPurchaseOrderRequest(body);

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

    const roleId = await this.capabilityService.getRoleIdIfUserHasCapability({
      workspaceId: authContext.workspace.id,
      userWorkspaceId: authContext.userWorkspaceId,
      capabilityUniversalIdentifier:
        PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS.procurementIssue,
    });

    if (roleId === undefined) {
      this.throwCommandError(
        new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.forbiddenCapability,
        ),
        correlationId,
      );
    }

    try {
      return await this.vendorPurchaseOrderService.create({
        workspaceId: authContext.workspace.id,
        actorId: authContext.user.id,
        roleId,
        correlationId,
        request: validation.value,
      });
    } catch (error) {
      if (error instanceof PashxMabException) {
        this.throwCommandError(error, correlationId);
      }
      if (
        error instanceof PermissionsException &&
        error.code === PermissionsExceptionCode.PERMISSION_DENIED
      ) {
        this.throwCommandError(
          new PashxMabException(
            PASHX_COMMAND_EXCEPTION_CODES.forbiddenCapability,
          ),
          correlationId,
        );
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

      this.throwCommandError(
        new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.internalError),
        correlationId,
      );
    }
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
