import { Injectable } from '@nestjs/common';

import { randomUUID } from 'node:crypto';
import {
  PASHX_COMMAND_EXCEPTION_CODES,
  type PashxApprovalCommandResult,
  type PashxCommandName,
  type PashxCreateVendorPurchaseOrderRequest,
  type PashxVendorPurchaseOrderResult,
} from 'pashx-mab-contract';

import { type WorkspaceQueryRunner } from 'src/engine/twenty-orm/query-runner/workspace-query-runner';
import { PashxMabException } from 'src/modules/pashx-mab/pashx-mab.exception';

type PashxCommandReceiptRow = Readonly<{
  request_hash: string;
  aggregate_id: string;
  aggregate_version: number;
  result_json: unknown;
}>;

type PashxNumberRow = Readonly<{ current_value: string }>;

const firstRow = <T>(rows: unknown): T | undefined =>
  Array.isArray(rows) ? (rows[0] as T | undefined) : undefined;

const isVendorPurchaseOrderResult = (
  value: unknown,
): value is PashxVendorPurchaseOrderResult => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const result = value as Readonly<Record<string, unknown>>;

  return (
    typeof result.commercialDocumentRecordId === 'string' &&
    typeof result.procurementCaseRecordId === 'string' &&
    result.documentType === 'vendorPurchaseOrder' &&
    typeof result.documentNumber === 'string' &&
    result.lifecycleStatus === 'draft' &&
    typeof result.aggregateVersion === 'number'
  );
};

const isApprovalCommandResult = (
  value: unknown,
): value is PashxApprovalCommandResult => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const result = value as Readonly<Record<string, unknown>>;

  return (
    typeof result.approvalRequestRecordId === 'string' &&
    ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(
      String(result.status),
    ) &&
    (result.decidedAt === null || typeof result.decidedAt === 'string')
  );
};

@Injectable()
export class PashxCommandSupportService {
  async takeTransactionLock(
    queryRunner: WorkspaceQueryRunner,
    scope: string,
  ): Promise<void> {
    await queryRunner.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [scope],
    );
  }

  async findReplay({
    queryRunner,
    schema,
    idempotencyKey,
    requestHash,
  }: {
    queryRunner: WorkspaceQueryRunner;
    schema: string;
    idempotencyKey: string;
    requestHash: string;
  }): Promise<PashxVendorPurchaseOrderResult | undefined> {
    const receipt = firstRow<PashxCommandReceiptRow>(
      await queryRunner.query(
        `SELECT request_hash, result_json FROM ${schema}.pashx_command_receipt WHERE idempotency_key = $1`,
        [idempotencyKey],
      ),
    );

    if (receipt === undefined) {
      return undefined;
    }
    if (receipt.request_hash !== requestHash) {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.idempotencyKeyReused,
      );
    }
    if (!isVendorPurchaseOrderResult(receipt.result_json)) {
      throw new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.internalError);
    }

    return receipt.result_json;
  }

  async findApprovalReplay({
    queryRunner,
    schema,
    idempotencyKey,
    requestHash,
  }: {
    queryRunner: WorkspaceQueryRunner;
    schema: string;
    idempotencyKey: string;
    requestHash: string;
  }): Promise<PashxApprovalCommandResult | undefined> {
    const receipt = firstRow<PashxCommandReceiptRow>(
      await queryRunner.query(
        `SELECT request_hash, result_json FROM ${schema}.pashx_command_receipt WHERE idempotency_key = $1`,
        [idempotencyKey],
      ),
    );

    if (receipt === undefined) return undefined;
    if (receipt.request_hash !== requestHash) {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.idempotencyKeyReused,
      );
    }
    if (!isApprovalCommandResult(receipt.result_json)) {
      throw new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.internalError);
    }

    return receipt.result_json;
  }

  // Generic receipt lookup for the workflow commands (case.transition,
  // document.finalize, document.cancel, delivery.record). The caller validates
  // the result shape, so one lookup serves every command without duplicating
  // the hash-reuse conflict check.
  async findCommandReplay({
    queryRunner,
    schema,
    idempotencyKey,
    requestHash,
  }: {
    queryRunner: WorkspaceQueryRunner;
    schema: string;
    idempotencyKey: string;
    requestHash: string;
  }): Promise<
    | Readonly<{
        aggregateId: string;
        aggregateVersion: number;
        result: unknown;
      }>
    | undefined
  > {
    const receipt = firstRow<PashxCommandReceiptRow>(
      await queryRunner.query(
        `SELECT request_hash, aggregate_id, aggregate_version, result_json FROM ${schema}.pashx_command_receipt WHERE idempotency_key = $1`,
        [idempotencyKey],
      ),
    );

    if (receipt === undefined) return undefined;
    if (receipt.request_hash !== requestHash) {
      throw new PashxMabException(
        PASHX_COMMAND_EXCEPTION_CODES.idempotencyKeyReused,
      );
    }

    return {
      aggregateId: receipt.aggregate_id,
      aggregateVersion: receipt.aggregate_version,
      result: receipt.result_json,
    };
  }

  async persistCommandReceiptAndAudit({
    queryRunner,
    schema,
    idempotencyKey,
    requestHash,
    commandName,
    aggregateId,
    aggregateVersion,
    result,
    actorId,
    correlationId,
    payload,
  }: {
    queryRunner: WorkspaceQueryRunner;
    schema: string;
    idempotencyKey: string;
    requestHash: string;
    commandName: PashxCommandName;
    aggregateId: string;
    aggregateVersion: number;
    result: unknown;
    actorId: string;
    correlationId: string;
    payload: unknown;
  }): Promise<void> {
    await queryRunner.query(
      `INSERT INTO ${schema}.pashx_command_receipt
        (idempotency_key, request_hash, aggregate_id, aggregate_version, result_json)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        idempotencyKey,
        requestHash,
        aggregateId,
        aggregateVersion,
        JSON.stringify(result),
      ],
    );
    await queryRunner.query(
      `INSERT INTO ${schema}.pashx_audit_event
        (id, correlation_id, actor_id, command_name, aggregate_id, aggregate_version, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        randomUUID(),
        correlationId,
        actorId,
        commandName,
        aggregateId,
        aggregateVersion,
        JSON.stringify(payload),
      ],
    );
  }

  async persistApprovalReceiptAndAudit({
    queryRunner,
    schema,
    idempotencyKey,
    requestHash,
    commandName,
    result,
    actorId,
    correlationId,
    auditEventId,
    payload,
  }: {
    queryRunner: WorkspaceQueryRunner;
    schema: string;
    idempotencyKey: string;
    requestHash: string;
    commandName: Extract<
      PashxCommandName,
      | 'approval.request'
      | 'approval.approve'
      | 'approval.reject'
      | 'approval.cancel'
    >;
    result: PashxApprovalCommandResult;
    actorId: string;
    correlationId: string;
    auditEventId: string;
    payload: unknown;
  }): Promise<void> {
    await queryRunner.query(
      `INSERT INTO ${schema}.pashx_command_receipt
        (idempotency_key, request_hash, aggregate_id, aggregate_version, result_json)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        idempotencyKey,
        requestHash,
        result.approvalRequestRecordId,
        result.status === 'PENDING' ? 1 : 2,
        JSON.stringify(result),
      ],
    );
    await queryRunner.query(
      `INSERT INTO ${schema}.pashx_audit_event
        (id, correlation_id, actor_id, command_name, aggregate_id, aggregate_version, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        auditEventId,
        correlationId,
        actorId,
        commandName,
        result.approvalRequestRecordId,
        result.status === 'PENDING' ? 1 : 2,
        JSON.stringify(payload),
      ],
    );
  }

  async allocateVendorPurchaseOrderNumber({
    queryRunner,
    schema,
    workspaceId,
    period,
  }: {
    queryRunner: WorkspaceQueryRunner;
    schema: string;
    workspaceId: string;
    period: string;
  }): Promise<string> {
    await this.takeTransactionLock(
      queryRunner,
      `number:${workspaceId}:vendorPurchaseOrder:${period}`,
    );
    const row = firstRow<PashxNumberRow>(
      await queryRunner.query(
        `INSERT INTO ${schema}.pashx_number_counter
          (document_type, period, current_value)
         VALUES ('vendorPurchaseOrder', $1, 1)
         ON CONFLICT (document_type, period)
         DO UPDATE SET current_value = pashx_number_counter.current_value + 1
         RETURNING current_value::text`,
        [period],
      ),
    );

    if (row === undefined) {
      throw new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.numberConflict);
    }

    return `MAB-VPO-${period}-${row.current_value.padStart(4, '0')}`;
  }

  async allocateSupplierRfqNumber({
    queryRunner,
    schema,
    workspaceId,
    period,
  }: {
    queryRunner: WorkspaceQueryRunner;
    schema: string;
    workspaceId: string;
    period: string;
  }): Promise<string> {
    await this.takeTransactionLock(
      queryRunner,
      `number:${workspaceId}:supplierRfq:${period}`,
    );
    const row = firstRow<PashxNumberRow>(
      await queryRunner.query(
        `INSERT INTO ${schema}.pashx_number_counter
          (document_type, period, current_value)
         VALUES ('supplierRfq', $1, 1)
         ON CONFLICT (document_type, period)
         DO UPDATE SET current_value = pashx_number_counter.current_value + 1
         RETURNING current_value::text`,
        [period],
      ),
    );

    if (row === undefined) {
      throw new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.numberConflict);
    }

    return `MAB-SRFQ-${period}-${row.current_value.padStart(4, '0')}`;
  }

  async persistReceiptAndAudit({
    queryRunner,
    schema,
    request,
    requestHash,
    result,
    actorId,
    correlationId,
  }: {
    queryRunner: WorkspaceQueryRunner;
    schema: string;
    request: PashxCreateVendorPurchaseOrderRequest;
    requestHash: string;
    result: PashxVendorPurchaseOrderResult;
    actorId: string;
    correlationId: string;
  }): Promise<void> {
    await queryRunner.query(
      `INSERT INTO ${schema}.pashx_command_receipt
        (idempotency_key, request_hash, aggregate_id, aggregate_version, result_json)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        request.idempotencyKey,
        requestHash,
        request.payload.procurementCaseRecordId,
        result.aggregateVersion,
        JSON.stringify(result),
      ],
    );
    await queryRunner.query(
      `INSERT INTO ${schema}.pashx_audit_event
        (id, correlation_id, actor_id, command_name, aggregate_id, aggregate_version, payload)
       VALUES ($1, $2, $3, 'document.create', $4, $5, $6::jsonb)`,
      [
        randomUUID(),
        correlationId,
        actorId,
        request.payload.procurementCaseRecordId,
        result.aggregateVersion,
        JSON.stringify({ request, result }),
      ],
    );
  }
}
