import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { PashxCompanyIdentityService } from 'src/modules/pashx-mab/services/pashx-company-identity.service';
import { type PashxWorkspaceSchemaService } from 'src/modules/pashx-mab/services/pashx-workspace-schema.service';

const workspaceId = '11111111-1111-4111-8111-111111111111';
const companyId = '22222222-2222-4222-8222-222222222222';

const buildHarness = (company: {
  mabBusinessRoles: string[];
  customerId: string | null;
  vendorId: string | null;
}) => {
  const query = jest.fn(async (sql: string, parameters?: unknown[]) => {
    if (sql.includes('FOR UPDATE')) return [{ id: companyId, ...company }];
    if (sql.includes('INSERT INTO')) {
      return parameters?.[0] === 'companyCustomerId'
        ? [{ current_value: '104' }]
        : [{ current_value: '108' }];
    }
    return [];
  });
  const queryRunner = {
    query,
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    isTransactionActive: true,
  };
  const manager = {
    executeInWorkspaceContext: jest.fn((callback: () => unknown) => callback()),
    getGlobalWorkspaceDataSource: jest.fn().mockResolvedValue({
      createQueryRunner: () => queryRunner,
    }),
  } as unknown as GlobalWorkspaceOrmManager;
  const workspaceSchema = {
    reconcileSupportTables: jest.fn(),
    getSchema: jest.fn().mockReturnValue('workspace_test'),
  } as unknown as PashxWorkspaceSchemaService;

  return {
    query,
    queryRunner,
    service: new PashxCompanyIdentityService(manager, workspaceSchema),
  };
};

const createdPayload = {
  workspaceId,
  events: [{ properties: { after: { id: companyId } } }],
};

describe('PashxCompanyIdentityService', () => {
  it('atomically assigns both missing IDs from the live maxima', async () => {
    const harness = buildHarness({
      mabBusinessRoles: ['CUSTOMER', 'SUPPLIER'],
      customerId: null,
      vendorId: '',
    });

    await harness.service.handleCreated(createdPayload as never);

    const counterSql = harness.query.mock.calls
      .map(([sql]) => sql)
      .filter((sql) => sql.includes('INSERT INTO'));
    expect(counterSql).toHaveLength(2);
    expect(counterSql.every((sql) => sql.includes('ON CONFLICT'))).toBe(true);
    expect(counterSql.every((sql) => sql.includes('GREATEST'))).toBe(true);
    expect(counterSql.every((sql) => sql.includes("~ '^[0-9]+$'"))).toBe(true);
    expect(harness.query).toHaveBeenCalledWith(
      expect.stringContaining('"customerId" = $1, "vendorId" = $2'),
      ['104', '108', companyId],
    );
    expect(harness.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('never overwrites IDs on an unrelated company update', async () => {
    const harness = buildHarness({
      mabBusinessRoles: ['CUSTOMER', 'SUPPLIER'],
      customerId: '103',
      vendorId: '107',
    });

    await harness.service.handleUpdated(createdPayload as never);

    expect(
      harness.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO')),
    ).toBe(false);
    expect(
      harness.query.mock.calls.some(([sql]) => sql.trimStart().startsWith('UPDATE')),
    ).toBe(false);
    expect(harness.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('leaves generic companies without a MAB role untouched', async () => {
    const harness = buildHarness({
      mabBusinessRoles: [],
      customerId: null,
      vendorId: null,
    });

    await harness.service.handleCreated(createdPayload as never);

    expect(
      harness.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO')),
    ).toBe(false);
  });
});
