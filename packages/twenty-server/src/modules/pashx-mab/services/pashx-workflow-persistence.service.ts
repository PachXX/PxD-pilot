import { Injectable } from '@nestjs/common';

import {
  PASHX_CASE_TRANSITION_ACTION_CODE,
  PASHX_COMMAND_EXCEPTION_CODES,
  type PashxCommercialDocumentType,
  type PashxDocumentLifecycleStatus,
  type PashxProcurementCaseStage,
} from 'pashx-mab-contract';
import { type ObjectLiteral } from 'typeorm';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceQueryRunner } from 'src/engine/twenty-orm/query-runner/workspace-query-runner';
import { type WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';
import { PashxMabException } from 'src/modules/pashx-mab/pashx-mab.exception';
import {
  toContractCaseStage,
  toContractDocumentType,
  toContractLifecycleStatus,
} from 'src/modules/pashx-mab/utils/pashx-manifest-value.util';

export type PashxWorkflowRepositories = Readonly<{
  procurementCase: WorkspaceRepository<ObjectLiteral>;
  commercialDocument: WorkspaceRepository<ObjectLiteral>;
  approvalRequest: WorkspaceRepository<ObjectLiteral>;
  company: WorkspaceRepository<ObjectLiteral>;
}>;

export type PashxWorkflowProcurementCaseRecord = Readonly<{
  id: string;
  stage: PashxProcurementCaseStage;
  aggregateVersion: number;
}>;

export type PashxWorkflowDocumentRecord = Readonly<{
  id: string;
  procurementCaseRecordId: string | null;
  documentType: PashxCommercialDocumentType;
  lifecycleStatus: PashxDocumentLifecycleStatus;
  aggregateVersion: number;
  supplierRecordId: string | null;
  totalAmountMicros: number | null;
}>;

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isRecordValue = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The workspace ORM returns CURRENCY fields as a composite object
// { amountMicros, currencyCode }, so the stored micros are read from the
// composite rather than from a flat column.
const toTotalAmountMicros = (value: unknown): number | null => {
  if (!isRecordValue(value)) return null;
  const amountMicros = value.amountMicros;

  return isNumber(amountMicros) ? amountMicros : null;
};

@Injectable()
export class PashxWorkflowPersistenceService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async getRepositories(
    workspaceId: string,
    roleId: string,
  ): Promise<PashxWorkflowRepositories> {
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
      approvalRequest:
        await this.globalWorkspaceOrmManager.getRepository<ObjectLiteral>(
          workspaceId,
          'approvalRequest',
          permission,
        ),
      company: await this.globalWorkspaceOrmManager.getRepository<ObjectLiteral>(
        workspaceId,
        'company',
        permission,
      ),
    };
  }

  async loadProcurementCase(
    repositories: PashxWorkflowRepositories,
    queryRunner: WorkspaceQueryRunner,
    procurementCaseRecordId: string,
  ): Promise<PashxWorkflowProcurementCaseRecord> {
    const row = await repositories.procurementCase.findOne(
      { where: { id: procurementCaseRecordId } },
      queryRunner.manager,
    );

    if (row === null) {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.recordNotFound,
        ['procurementCaseRecordId'],
      );
    }

    const stage = toContractCaseStage(String(row.stage));
    const aggregateVersion = row.aggregateVersion;

    if (stage === undefined || !isNumber(aggregateVersion)) {
      throw new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.internalError);
    }

    return { id: row.id, stage, aggregateVersion };
  }

  assertCaseVersion(
    procurementCase: PashxWorkflowProcurementCaseRecord,
    expectedVersion: number,
  ): void {
    if (procurementCase.aggregateVersion !== expectedVersion) {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.staleVersion,
        [],
        procurementCase.aggregateVersion,
      );
    }
  }

  async loadCommercialDocument(
    repositories: PashxWorkflowRepositories,
    queryRunner: WorkspaceQueryRunner,
    commercialDocumentRecordId: string,
  ): Promise<PashxWorkflowDocumentRecord> {
    const row = await repositories.commercialDocument.findOne(
      { where: { id: commercialDocumentRecordId } },
      queryRunner.manager,
    );

    if (row === null) {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.recordNotFound,
        ['commercialDocumentRecordId'],
      );
    }

    const documentType = toContractDocumentType(String(row.documentType));
    const lifecycleStatus = toContractLifecycleStatus(
      String(row.lifecycleStatus),
    );
    const aggregateVersion = row.aggregateVersion;

    if (
      documentType === undefined ||
      lifecycleStatus === undefined ||
      !isNumber(aggregateVersion)
    ) {
      throw new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.internalError);
    }

    return {
      id: row.id,
      procurementCaseRecordId:
        typeof row.procurementCaseRecordId === 'string'
          ? row.procurementCaseRecordId
          : null,
      documentType,
      lifecycleStatus,
      aggregateVersion,
      supplierRecordId:
        typeof row.supplierRecordId === 'string' ? row.supplierRecordId : null,
      totalAmountMicros: toTotalAmountMicros(row.totalAmount),
    };
  }

  async findFinalizedDocumentTypes(
    repositories: PashxWorkflowRepositories,
    queryRunner: WorkspaceQueryRunner,
    procurementCaseRecordId: string,
  ): Promise<ReadonlySet<PashxCommercialDocumentType>> {
    const rows = await repositories.commercialDocument.find(
      {
        where: {
          procurementCaseRecordId,
          lifecycleStatus: 'FINALIZED',
        },
      },
      queryRunner.manager,
    );

    const types = rows
      .map((row) => toContractDocumentType(String(row.documentType)))
      .filter(
        (documentType): documentType is PashxCommercialDocumentType =>
          documentType !== undefined,
      );

    return new Set(types);
  }

  async hasApprovedTransitionApproval({
    repositories,
    queryRunner,
    procurementCaseRecordId,
    payloadDigest,
  }: {
    repositories: PashxWorkflowRepositories;
    queryRunner: WorkspaceQueryRunner;
    procurementCaseRecordId: string;
    payloadDigest: string;
  }): Promise<boolean> {
    const rows = await repositories.approvalRequest.find(
      {
        where: {
          requestedActionCode: PASHX_CASE_TRANSITION_ACTION_CODE,
          status: 'APPROVED',
          payloadDigest,
        },
      },
      queryRunner.manager,
    );

    return rows.some((row) =>
      Array.isArray(row.sourceRecordIds)
        ? row.sourceRecordIds.includes(procurementCaseRecordId)
        : false,
    );
  }

  async loadCompany(
    repositories: PashxWorkflowRepositories,
    queryRunner: WorkspaceQueryRunner,
    companyRecordId: string,
  ): Promise<void> {
    const row = await repositories.company.findOne(
      { where: { id: companyRecordId } },
      queryRunner.manager,
    );

    if (row === null) {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.recordNotFound,
        ['payload.vendorRows.supplierRecordId'],
      );
    }
  }

  async countCaseDocumentsByType({
    repositories,
    queryRunner,
    procurementCaseRecordId,
    documentType,
  }: {
    repositories: PashxWorkflowRepositories;
    queryRunner: WorkspaceQueryRunner;
    procurementCaseRecordId: string;
    documentType: string;
  }): Promise<number> {
    const rows = await repositories.commercialDocument.find(
      {
        where: {
          procurementCaseRecordId,
          documentType,
        },
      },
      queryRunner.manager,
    );

    return rows.length;
  }
}
