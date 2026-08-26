import { Injectable } from '@nestjs/common';

import {
  type ObjectRecordCreateEvent,
  type ObjectRecordUpdateEvent,
} from 'twenty-shared/database-events';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { type WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event-batch.type';
import { PashxWorkspaceSchemaService } from 'src/modules/pashx-mab/services/pashx-workspace-schema.service';

type CompanyIdentityRecord = Readonly<{
  id: string;
  mabBusinessRoles?: unknown;
  customerId?: string | null;
  vendorId?: string | null;
}>;

type CompanyIdentityKind = 'customer' | 'vendor';
type CompanyIdentityRow = Readonly<{
  id: string;
  mabBusinessRoles: unknown;
  customerId: string | null;
  vendorId: string | null;
  hasCustomerIdField: boolean;
  hasVendorIdField: boolean;
}>;
type CounterRow = Readonly<{ current_value: string }>;

const hasRole = (roles: unknown, role: 'CUSTOMER' | 'SUPPLIER'): boolean =>
  Array.isArray(roles) && roles.includes(role);

const isEmpty = (value: string | null | undefined): boolean =>
  value === null || value === undefined || value.trim() === '';

@Injectable()
export class PashxCompanyIdentityService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly workspaceSchema: PashxWorkspaceSchemaService,
  ) {}

  @OnDatabaseBatchEvent('company', DatabaseEventAction.CREATED)
  async handleCreated(
    payload: WorkspaceEventBatch<ObjectRecordCreateEvent<CompanyIdentityRecord>>,
  ): Promise<void> {
    await this.assignMissingIds(payload.workspaceId, payload.events);
  }

  @OnDatabaseBatchEvent('company', DatabaseEventAction.UPDATED)
  async handleUpdated(
    payload: WorkspaceEventBatch<ObjectRecordUpdateEvent<CompanyIdentityRecord>>,
  ): Promise<void> {
    await this.assignMissingIds(payload.workspaceId, payload.events);
  }

  private async assignMissingIds(
    workspaceId: string,
    events: readonly (
      | ObjectRecordCreateEvent<CompanyIdentityRecord>
      | ObjectRecordUpdateEvent<CompanyIdentityRecord>
    )[],
  ): Promise<void> {
    // Update event payloads are not guaranteed to contain every custom field.
    // Re-read each touched company under a row lock so role additions are never
    // missed and all idempotency decisions use authoritative database state.
    const companyIds = [
      ...new Set(events.map((event) => event.properties.after.id)),
    ];

    if (companyIds.length === 0) return;

    const authContext = buildSystemAuthContext(workspaceId);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const dataSource =
          await this.globalWorkspaceOrmManager.getGlobalWorkspaceDataSource();

        for (const companyId of companyIds) {
          const queryRunner = dataSource.createQueryRunner();
          await queryRunner.connect();
          await queryRunner.startTransaction();
          try {
            const schema = this.workspaceSchema.getSchema(workspaceId);
            const rows = (await queryRunner.query(
              `SELECT id,
                      to_jsonb(company)->'mabBusinessRoles' AS "mabBusinessRoles",
                      to_jsonb(company)->>'customerId' AS "customerId",
                      to_jsonb(company)->>'vendorId' AS "vendorId",
                      to_jsonb(company) ? 'customerId' AS "hasCustomerIdField",
                      to_jsonb(company) ? 'vendorId' AS "hasVendorIdField"
                 FROM ${schema}.company AS company
                WHERE id = $1
                FOR UPDATE`,
              [companyId],
            )) as CompanyIdentityRow[];
            const company = rows[0];

            if (company !== undefined) {
              const updates: string[] = [];
              const parameters: string[] = [];
              const needsCustomerId =
                hasRole(company.mabBusinessRoles, 'CUSTOMER') &&
                company.hasCustomerIdField &&
                isEmpty(company.customerId);
              const needsVendorId =
                hasRole(company.mabBusinessRoles, 'SUPPLIER') &&
                company.hasVendorIdField &&
                isEmpty(company.vendorId);

              if (needsCustomerId || needsVendorId) {
                await this.workspaceSchema.reconcileSupportTables(
                  queryRunner,
                  workspaceId,
                );
              }
              if (needsCustomerId) {
                parameters.push(
                  await this.allocateIdentity(queryRunner, schema, 'customer'),
                );
                updates.push(`"customerId" = $${parameters.length}`);
              }
              if (needsVendorId) {
                parameters.push(
                  await this.allocateIdentity(queryRunner, schema, 'vendor'),
                );
                updates.push(`"vendorId" = $${parameters.length}`);
              }

              if (updates.length > 0) {
                parameters.push(companyId);
                await queryRunner.query(
                  `UPDATE ${schema}.company
                      SET ${updates.join(', ')}, "updatedAt" = now()
                    WHERE id = $${parameters.length}`,
                  parameters,
                );
              }
            }

            await queryRunner.commitTransaction();
          } catch (error) {
            if (queryRunner.isTransactionActive) {
              await queryRunner.rollbackTransaction();
            }
            throw error;
          } finally {
            await queryRunner.release();
          }
        }
      },
      authContext,
    );
  }

  private async allocateIdentity(
    queryRunner: {
      query: (sql: string, parameters?: unknown[]) => Promise<unknown>;
    },
    schema: string,
    kind: CompanyIdentityKind,
  ): Promise<string> {
    const fieldName = kind === 'customer' ? 'customerId' : 'vendorId';
    const rows = (await queryRunner.query(
      `INSERT INTO ${schema}.pashx_number_counter
         (document_type, period, current_value)
       SELECT $1, 'global',
              GREATEST(
                COALESCE(MAX(CASE WHEN "${fieldName}" ~ '^[0-9]+$'
                                  THEN "${fieldName}"::bigint END), 100),
                100
              ) + 1
         FROM ${schema}.company
       ON CONFLICT (document_type, period)
       DO UPDATE SET current_value = GREATEST(
         pashx_number_counter.current_value + 1,
         EXCLUDED.current_value
       )
       RETURNING current_value::text`,
      [`company${kind === 'customer' ? 'Customer' : 'Vendor'}Id`],
    )) as CounterRow[];
    const value = rows[0]?.current_value;

    if (value === undefined) {
      throw new Error(`Failed to allocate the next ${kind} ID.`);
    }

    return value;
  }
}
