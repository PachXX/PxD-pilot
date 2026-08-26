import { Injectable } from '@nestjs/common';

import { PASHX_COMMAND_EXCEPTION_CODES } from 'pashx-mab-contract';

import { type WorkspaceQueryRunner } from 'src/engine/twenty-orm/query-runner/workspace-query-runner';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';
import { PashxMabException } from 'src/modules/pashx-mab/pashx-mab.exception';

type PashxSupportSchemaVersionRow = Readonly<{ version: number }>;

export const PASHX_SUPPORT_SCHEMA_VERSION = 1;

export const quotePashxIdentifier = (identifier: string): string =>
  `"${identifier.replace(/"/g, '""')}"`;

export const getPashxWorkspaceSchema = (workspaceId: string): string =>
  quotePashxIdentifier(getWorkspaceSchemaName(workspaceId));

@Injectable()
export class PashxWorkspaceSchemaService {
  getSchema(workspaceId: string): string {
    return getPashxWorkspaceSchema(workspaceId);
  }

  async reconcileSupportTables(
    queryRunner: WorkspaceQueryRunner,
    workspaceId: string,
  ): Promise<number> {
    if (!queryRunner.isTransactionActive) {
      throw new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.internalError);
    }

    const schema = getPashxWorkspaceSchema(workspaceId);

    await queryRunner.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [`pashx:support-schema:${workspaceId}`],
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.pashx_support_schema_version (
        id smallint PRIMARY KEY CHECK (id = 1),
        version integer NOT NULL CHECK (version >= 0),
        reconciled_at timestamptz NOT NULL DEFAULT now()
      );
      INSERT INTO ${schema}.pashx_support_schema_version (id, version)
      VALUES (1, 0)
      ON CONFLICT (id) DO NOTHING;
    `);
    const rows = (await queryRunner.query(
      `SELECT version FROM ${schema}.pashx_support_schema_version WHERE id = 1 FOR UPDATE`,
    )) as PashxSupportSchemaVersionRow[];
    const installedVersion = rows[0]?.version;

    if (
      installedVersion === undefined ||
      installedVersion > PASHX_SUPPORT_SCHEMA_VERSION
    ) {
      throw new PashxMabException(PASHX_COMMAND_EXCEPTION_CODES.internalError);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.pashx_command_receipt (
        idempotency_key text PRIMARY KEY,
        request_hash text NOT NULL,
        aggregate_id uuid NOT NULL,
        aggregate_version integer NOT NULL,
        result_json jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS ${schema}.pashx_number_counter (
        document_type text NOT NULL,
        period text NOT NULL,
        current_value bigint NOT NULL,
        PRIMARY KEY (document_type, period)
      );
      CREATE TABLE IF NOT EXISTS ${schema}.pashx_audit_event (
        id uuid PRIMARY KEY,
        correlation_id uuid NOT NULL,
        actor_id uuid NOT NULL,
        command_name text NOT NULL,
        aggregate_id uuid NOT NULL,
        aggregate_version integer NOT NULL,
        payload jsonb NOT NULL,
        occurred_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    if (installedVersion < PASHX_SUPPORT_SCHEMA_VERSION) {
      await queryRunner.query(
        `UPDATE ${schema}.pashx_support_schema_version
         SET version = $1, reconciled_at = now()
         WHERE id = 1`,
        [PASHX_SUPPORT_SCHEMA_VERSION],
      );
    }

    return PASHX_SUPPORT_SCHEMA_VERSION;
  }
}
