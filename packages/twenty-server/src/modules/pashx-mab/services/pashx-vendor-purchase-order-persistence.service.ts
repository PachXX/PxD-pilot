import { Injectable } from '@nestjs/common';

import {
  PASHX_COMMAND_EXCEPTION_CODES,
  type PashxCreateVendorPurchaseOrderRequest,
  type PashxVendorPurchaseOrderResult,
} from 'pashx-mab-contract';
import { isNonEmptyString } from '@sniptt/guards';
import { type ObjectLiteral, QueryFailedError } from 'typeorm';
// `isNonEmptyString` comes from @sniptt/guards in twenty-server, NOT from twenty-shared/utils —
// that barrel does not export it. An earlier revision imported it from twenty-shared/utils, which
// resolves as a module but leaves the binding undefined, so `.filter(undefined)` threw
// `TypeError: undefined is not a function` at runtime. Nothing caught it at build time: the server
// is compiled by swc with `typeCheck: false` (see nest-cli.json), so a wrong named import is not a
// build error here. Verify value imports against the built dist, not the source barrel.
import { FieldActorSource } from 'twenty-shared/types';

import { POSTGRESQL_ERROR_CODES } from 'src/engine/api/graphql/workspace-query-runner/constants/postgres-error-codes.constants';
import { getWorkspaceAuthContext } from 'src/engine/core-modules/auth/storage/workspace-auth-context.storage';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceQueryRunner } from 'src/engine/twenty-orm/query-runner/workspace-query-runner';
import { type WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { PashxMabException } from 'src/modules/pashx-mab/pashx-mab.exception';
import {
  toManifestDocumentType,
  toManifestLifecycleStatus,
} from 'src/modules/pashx-mab/utils/pashx-manifest-value.util';

export type PashxProcurementCaseRecord = Readonly<{
  id: string;
  aggregateVersion: number;
}>;

export type PashxRepositories = Readonly<{
  procurementCase: WorkspaceRepository<ObjectLiteral>;
  commercialDocument: WorkspaceRepository<ObjectLiteral>;
  company: WorkspaceRepository<ObjectLiteral>;
}>;

type PostgresQueryFailedError = QueryFailedError &
  Readonly<{
    code?: string;
    detail?: string;
    driverError?: Readonly<{ code?: string; detail?: string }>;
  }>;

const getUniqueViolationColumn = (error: unknown): string | undefined => {
  if (!(error instanceof QueryFailedError)) {
    return undefined;
  }

  const postgresError = error as PostgresQueryFailedError;
  const code = postgresError.code ?? postgresError.driverError?.code;

  if (code !== POSTGRESQL_ERROR_CODES.UNIQUE_VIOLATION) {
    return undefined;
  }

  const detail = postgresError.detail ?? postgresError.driverError?.detail;
  const match = detail?.match(/Key \(([^)]+)\)=/);

  return match?.[1].replace(/"/g, '');
};

@Injectable()
export class PashxVendorPurchaseOrderPersistenceService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async getRepositories(
    workspaceId: string,
    roleId: string,
  ): Promise<PashxRepositories> {
    const permission = { unionOf: [roleId] };

    return {
      procurementCase:
        await this.globalWorkspaceOrmManager.getRepository<ObjectLiteral>(
          workspaceId,
          'procurementCase',
          permission,
        ),
      commercialDocument:
        await this.globalWorkspaceOrmManager.getRepository<ObjectLiteral>(
          workspaceId,
          'commercialDocument',
          permission,
        ),
      company:
        await this.globalWorkspaceOrmManager.getRepository<ObjectLiteral>(
          workspaceId,
          'company',
          permission,
        ),
    };
  }

  async loadCommandRecords(
    repositories: PashxRepositories,
    queryRunner: WorkspaceQueryRunner,
    request: PashxCreateVendorPurchaseOrderRequest,
  ): Promise<PashxProcurementCaseRecord> {
    const procurementCase = await repositories.procurementCase.findOne(
      { where: { id: request.payload.procurementCaseRecordId } },
      queryRunner.manager,
    );

    if (procurementCase === null) {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.recordNotFound,
        ['payload.procurementCaseRecordId'],
      );
    }
    const aggregateVersion = procurementCase.aggregateVersion;

    if (typeof aggregateVersion !== 'number') {
      throw new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.internalError);
    }
    if (aggregateVersion !== request.expectedVersion) {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.staleVersion,
        [],
        aggregateVersion,
      );
    }

    const supplier = await repositories.company.findOne(
      { where: { id: request.payload.supplierRecordId } },
      queryRunner.manager,
    );

    if (supplier === null) {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.recordNotFound,
        ['payload.supplierRecordId'],
      );
    }

    return {
      id: request.payload.procurementCaseRecordId,
      aggregateVersion,
    };
  }

  async persistWorkspaceRecords(
    repositories: PashxRepositories,
    queryRunner: WorkspaceQueryRunner,
    request: PashxCreateVendorPurchaseOrderRequest,
    result: PashxVendorPurchaseOrderResult,
  ): Promise<void> {
    // `createdBy` and `updatedBy` are standard ACTOR composites whose `*Name` columns are NOT NULL
    // with no database default. The GraphQL/REST record pipeline fills them from the auth context,
    // but this command writes through a raw repository insert and bypasses that, so Postgres
    // rejected the row with
    //   null value in column "createdByName" of relation "_commercialDocument"
    //
    // BOTH are required. Only `createdByName` appeared in the error because Postgres reports the
    // first violation; `updatedByName` is equally NOT NULL and would have failed the very next
    // attempt. The full set was found by listing NOT NULL columns without defaults on
    // `_commercialDocument` — createdByName and updatedByName are the only two.
    //
    // The actor is read from the request-scoped AsyncLocalStorage rather than threaded through the
    // call chain, matching how the controller already obtains it.
    const authContext = getWorkspaceAuthContext();
    const createdBy =
      authContext.type === 'user'
        ? {
            // API, not MANUAL: this arrives through the PashX REST command endpoint, not through a
            // user editing a record in the UI. The distinction matters for audit provenance.
            source: FieldActorSource.API,
            // `?? null` rather than leaving it possibly undefined: the column is nullable, and an
            // explicit null is unambiguous where undefined would mean "omit the column".
            workspaceMemberId: authContext.workspaceMemberId ?? null,
            // Every step here is optional-chained and ends in a literal, so this expression cannot
            // throw regardless of how sparsely the auth context is populated.
            //
            // `UserWorkspaceAuthContext` declares `user` as NonNullable, but it is NOT always
            // present at runtime on the token-authenticated path — dereferencing it threw a
            // TypeError that surfaced only as `PASHX_INTERNAL_ERROR` (the controller logs the error
            // TYPE and no stack, by design, so nothing pointed here). Workspace members created by
            // a bare `signUpInWorkspace` also have empty first and last names, so the fallback is
            // the normal path for service accounts and invited users, not an edge case.
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
          }
        : {
            source: FieldActorSource.SYSTEM,
            workspaceMemberId: null,
            name: 'PashX MAB',
            context: {},
          };

    try {
      await repositories.commercialDocument.insert(
        {
          id: request.commercialDocumentRecordId,
          name: result.documentNumber,
          // On insert the record has never been modified, so updatedBy is the creating actor.
          createdBy,
          updatedBy: createdBy,
          // Contract values are translated to the workspace SELECT option spellings here; the
          // manifest cannot use the camelCase contract values because the metadata validator
          // requires UPPER_CASE. See pashx-manifest-value.util.ts.
          documentType: toManifestDocumentType(result.documentType),
          lifecycleStatus: toManifestLifecycleStatus(result.lifecycleStatus),
          aggregateVersion: 1,
          procurementCaseRecordId: request.payload.procurementCaseRecordId,
          supplierRecordId: request.payload.supplierRecordId,
          issueDate: request.payload.issueDate,
          // `currency` is a reserved field name in Twenty's metadata engine, so the manifest
          // declares this column as `currencyCode`. The contract payload keeps `currency`.
          currencyCode: request.payload.currency,
        },
        queryRunner.manager,
      );
    } catch (error) {
      const conflictingColumn = getUniqueViolationColumn(error);

      if (conflictingColumn === 'id') {
        throw new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.recordConflict,
          ['commercialDocumentRecordId'],
        );
      }
      if (conflictingColumn === 'name') {
        throw new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.numberConflict,
        );
      }

      throw error;
    }
    const versionUpdate = await repositories.procurementCase.update(
      {
        id: request.payload.procurementCaseRecordId,
        aggregateVersion: request.expectedVersion,
      },
      { aggregateVersion: result.aggregateVersion },
      undefined,
      queryRunner.manager,
    );

    if (versionUpdate.affected !== 1) {
      const currentProcurementCase = await repositories.procurementCase.findOne(
        { where: { id: request.payload.procurementCaseRecordId } },
        queryRunner.manager,
      );

      if (currentProcurementCase === null) {
        throw new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.recordNotFound,
          ['payload.procurementCaseRecordId'],
        );
      }

      const currentAggregateVersion = currentProcurementCase.aggregateVersion;

      if (typeof currentAggregateVersion !== 'number') {
        throw new PashxMabException(
          PASHX_COMMAND_EXCEPTION_CODES.internalError,
        );
      }

      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.staleVersion,
        [],
        currentAggregateVersion,
      );
    }
  }
}
