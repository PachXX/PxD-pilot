import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { PashxCompanyIdentityService } from 'src/modules/pashx-mab/services/pashx-company-identity.service';
import { type PashxWorkspaceSchemaService } from 'src/modules/pashx-mab/services/pashx-workspace-schema.service';

const workspaceId = '11111111-1111-4111-8111-111111111111';
const companyId = '22222222-2222-4222-8222-222222222222';

const buildHarness = (
  company: {
    mabBusinessRoles: string[];
    customerId: string | null;
    vendorId: string | null;
  },
  fields = { customer: true, vendor: true },
) => {
  const query = jest.fn(
    async (sql: string, _parameters?: unknown[]): Promise<unknown> => {
      if (sql.includes('FOR UPDATE')) {
        return [
          {
            id: companyId,
            ...company,
            hasCustomerIdField: fields.customer,
            hasVendorIdField: fields.vendor,
          },
        ];
      }
      // Existence check for the randomly generated candidate: always report no
      // collision so allocation succeeds on the first attempt.
      if (sql.trimStart().startsWith('SELECT 1 FROM')) {
        return [];
      }
      return [];
    },
  );
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
  it('assigns both missing IDs with type prefixes under atomic locks', async () => {
    const harness = buildHarness({
      mabBusinessRoles: ['CUSTOMER', 'SUPPLIER'],
      customerId: null,
      vendorId: '',
    });

    await harness.service.handleCreated(createdPayload as never);

    const lockSql = harness.query.mock.calls
      .map(([sql]) => sql)
      .filter((sql) => sql.includes('INSERT INTO'));
    expect(lockSql).toHaveLength(2);
    expect(lockSql.every((sql) => sql.includes('ON CONFLICT'))).toBe(true);

    const updateCall = harness.query.mock.calls.find(([sql]) =>
      sql.trimStart().startsWith('UPDATE'),
    );

    expect(updateCall).toBeDefined();
    if (updateCall === undefined) throw new Error('Expected company update');

    const [updateSql, updateParameters] = updateCall;

    expect(updateSql).toContain('"customerId" = $1, "vendorId" = $2');
    if (updateParameters === undefined) {
      throw new Error('Expected company update parameters');
    }
    expect(updateParameters[0]).toMatch(/^C\d{7}$/);
    expect(updateParameters[1]).toMatch(/^V\d{7}$/);
    expect(updateParameters[2]).toBe(companyId);
    expect(harness.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('retries when a generated candidate collides with an existing ID', async () => {
    const harness = buildHarness({
      mabBusinessRoles: ['CUSTOMER'],
      customerId: null,
      vendorId: null,
    });
    let collisionChecks = 0;

    harness.query.mockImplementation(async (sql: string): Promise<unknown> => {
      if (sql.includes('FOR UPDATE')) {
        return [
          {
            id: companyId,
            mabBusinessRoles: ['CUSTOMER'],
            customerId: null,
            vendorId: null,
            hasCustomerIdField: true,
            hasVendorIdField: true,
          },
        ];
      }
      if (sql.trimStart().startsWith('SELECT 1 FROM')) {
        collisionChecks += 1;
        return collisionChecks === 1 ? [{ exists: 1 }] : [];
      }
      return [];
    });

    await harness.service.handleCreated(createdPayload as never);

    expect(collisionChecks).toBe(2);
    const updateCall = harness.query.mock.calls.find(([sql]) =>
      sql.trimStart().startsWith('UPDATE'),
    );
    expect(updateCall).toBeDefined();
    if (updateCall === undefined) throw new Error('Expected company update');
    expect((updateCall[1] as string[])[0]).toMatch(/^C\d{7}$/);
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
      harness.query.mock.calls.some(([sql]) =>
        sql.trimStart().startsWith('UPDATE'),
      ),
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

  it('no-ops safely when a non-MAB workspace lacks the identity fields', async () => {
    const harness = buildHarness(
      {
        mabBusinessRoles: ['CUSTOMER', 'SUPPLIER'],
        customerId: null,
        vendorId: null,
      },
      { customer: false, vendor: false },
    );

    await harness.service.handleCreated(createdPayload as never);

    expect(
      harness.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO')),
    ).toBe(false);
  });
});
