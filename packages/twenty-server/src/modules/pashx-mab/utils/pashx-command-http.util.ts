import { HttpException, HttpStatus } from '@nestjs/common';

import {
  PASHX_COMMAND_ERROR_DEFINITIONS,
  PASHX_COMMAND_EXCEPTION_CODES,
  type PashxCommandError,
  type PashxCommandExceptionCode,
} from 'pashx-mab-contract';

import { PashxMabException } from 'src/modules/pashx-mab/pashx-mab.exception';

// Shared HTTP mapping for the workflow command controllers (case transitions,
// document lifecycle, delivery records). Domain-rule rejections are 409
// conflicts; the pre-existing per-controller copies in the vendor PO and
// approval controllers keep their own mapping and remain untouched.
const statusForCode = (code: PashxCommandExceptionCode): HttpStatus => {
  switch (code) {
    case PASHX_COMMAND_EXCEPTION_CODES.invalidInput:
      return HttpStatus.BAD_REQUEST;
    case PASHX_COMMAND_EXCEPTION_CODES.forbiddenCapability:
      return HttpStatus.FORBIDDEN;
    case PASHX_COMMAND_EXCEPTION_CODES.recordNotFound:
      return HttpStatus.NOT_FOUND;
    case PASHX_COMMAND_EXCEPTION_CODES.invalidTransition:
    case PASHX_COMMAND_EXCEPTION_CODES.transitionEvidenceMissing:
    case PASHX_COMMAND_EXCEPTION_CODES.documentEvidenceMissing:
    case PASHX_COMMAND_EXCEPTION_CODES.clientRequirementMissing:
    case PASHX_COMMAND_EXCEPTION_CODES.approvalGateUnsatisfied:
    case PASHX_COMMAND_EXCEPTION_CODES.finalizedDocumentImmutable:
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

// A function DECLARATION (not a const arrow) so TypeScript control-flow
// analysis treats every call as terminating and narrows the guarded values
// in the controllers below the call.
export function throwPashxWorkflowCommandError(
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
