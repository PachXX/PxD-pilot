import {
  PASHX_COMMAND_EXCEPTION_CODES,
  type PashxApprovalCommandResult,
  type PashxDecideApprovalRequest,
  type PashxRequestApprovalRequest,
} from 'pashx-mab-contract';

import { type GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceQueryRunner } from 'src/engine/twenty-orm/query-runner/workspace-query-runner';
import { PashxApprovalCommandService } from 'src/modules/pashx-mab/services/pashx-approval-command.service';
import { PashxCommandSupportService } from 'src/modules/pashx-mab/services/pashx-command-support.service';
import { type PashxWorkspaceSchemaService } from 'src/modules/pashx-mab/services/pashx-workspace-schema.service';

const workspaceId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const actorRecordId = '33333333-3333-4333-8333-333333333333';
const approvalRequestRecordId = '44444444-4444-4444-8444-444444444444';
const correlationId = '55555555-5555-4555-8555-555555555555';

const request: PashxRequestApprovalRequest = {
  contractVersion: 1,
  approvalRequestRecordId,
  idempotencyKey: 'approval-request-1',
  name: 'Approve vendor PO',
  requestedActionCode: 'VENDOR_PO_FINALIZE',
  payloadDigest: 'a'.repeat(64),
  sourceRecordIds: ['66666666-6666-4666-8666-666666666666'],
  approverRecordId: actorRecordId,
};

const decision = (
  value: PashxDecideApprovalRequest['decision'],
): PashxDecideApprovalRequest => ({
  contractVersion: 1,
  idempotencyKey: `approval-${value.toLowerCase()}-1`,
  expectedStatus: 'PENDING',
  decision: value,
  decisionNote: `${value} after evidence review`,
});

const buildHarness = () => {
  let active = false;
  const manager = {};
  const queryRunner = {
    manager,
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockImplementation(async () => {
      active = true;
    }),
    commitTransaction: jest.fn().mockImplementation(async () => {
      active = false;
    }),
    rollbackTransaction: jest.fn().mockImplementation(async () => {
      active = false;
    }),
    release: jest.fn().mockResolvedValue(undefined),
    get isTransactionActive() {
      return active;
    },
  } as unknown as WorkspaceQueryRunner;
  const repository = {
    findOne: jest.fn().mockResolvedValue(null),
    insert: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const workspaceMemberRepository = {
    findOne: jest.fn().mockResolvedValue({ id: actorRecordId }),
  };
  const globalWorkspaceOrmManager = {
    executeInWorkspaceContext: jest.fn((callback: () => unknown) => callback()),
    getGlobalWorkspaceDataSource: jest.fn().mockResolvedValue({
      createQueryRunner: () => queryRunner,
    }),
    getRepository: jest
      .fn()
      .mockImplementation((_workspaceId: string, objectName: string) =>
        Promise.resolve(
          objectName === 'workspaceMember'
            ? workspaceMemberRepository
            : repository,
        ),
      ),
  } as unknown as GlobalWorkspaceOrmManager;
  const commandSupport = {
    takeTransactionLock: jest.fn().mockResolvedValue(undefined),
    findApprovalReplay: jest.fn().mockResolvedValue(undefined),
    persistApprovalReceiptAndAudit: jest.fn().mockResolvedValue(undefined),
  };
  const workspaceSchema = {
    reconcileSupportTables: jest.fn().mockResolvedValue(1),
  };
  const service = new PashxApprovalCommandService(
    globalWorkspaceOrmManager,
    commandSupport as unknown as PashxCommandSupportService,
    workspaceSchema as unknown as PashxWorkspaceSchemaService,
  );

  return {
    commandSupport,
    globalWorkspaceOrmManager,
    queryRunner,
    repository,
    service,
    workspaceMemberRepository,
    workspaceSchema,
  };
};

describe('PashxApprovalCommandService', () => {
  it('creates the native approval, receipt and audit in one business transaction', async () => {
    const harness = buildHarness();

    const result = await harness.service.request({
      workspaceId,
      actorId,
      actorRecordId,
      correlationId,
      request,
    });

    expect(result).toMatchObject({
      ok: true,
      replayed: false,
      aggregateVersion: 1,
      result: { status: 'PENDING', decidedAt: null },
    });
    expect(harness.repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: approvalRequestRecordId,
        requesterRecordId: actorRecordId,
        status: 'PENDING',
      }),
      expect.anything(),
    );
    expect(
      harness.commandSupport.persistApprovalReceiptAndAudit,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId,
        commandName: 'approval.request',
        correlationId,
      }),
    );
    expect(harness.queryRunner.commitTransaction).toHaveBeenCalledTimes(2);
    expect(
      harness.globalWorkspaceOrmManager.getRepository,
    ).toHaveBeenCalledWith(workspaceId, 'approvalRequest', {
      shouldBypassPermissionChecks: true,
    });
    expect(
      harness.globalWorkspaceOrmManager.getRepository,
    ).toHaveBeenCalledWith(workspaceId, 'workspaceMember', {
      shouldBypassPermissionChecks: true,
    });
  });

  it('replays an identical request without a second record or audit event', async () => {
    const harness = buildHarness();
    const replay: PashxApprovalCommandResult = {
      approvalRequestRecordId,
      status: 'PENDING',
      decidedAt: null,
    };
    harness.commandSupport.findApprovalReplay.mockResolvedValue(replay);

    const result = await harness.service.request({
      workspaceId,
      actorId,
      actorRecordId,
      correlationId,
      request,
    });

    expect(result.replayed).toBe(true);
    expect(harness.repository.findOne).not.toHaveBeenCalled();
    expect(harness.repository.insert).not.toHaveBeenCalled();
    expect(
      harness.commandSupport.persistApprovalReceiptAndAudit,
    ).not.toHaveBeenCalled();
  });

  it('rejects an assigned approver outside the workspace', async () => {
    const harness = buildHarness();
    harness.workspaceMemberRepository.findOne.mockResolvedValue(null);

    await expect(
      harness.service.request({
        workspaceId,
        actorId,
        actorRecordId,
        correlationId,
        request,
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.recordNotFound,
      fieldPaths: ['approverRecordId'],
    });
    expect(harness.repository.insert).not.toHaveBeenCalled();
    expect(
      harness.commandSupport.persistApprovalReceiptAndAudit,
    ).not.toHaveBeenCalled();
  });

  it.each([
    ['APPROVE', 'APPROVED', 'approval.approve'],
    ['REJECT', 'REJECTED', 'approval.reject'],
  ] as const)(
    'applies %s with CAS and a typed audit command for the assigned approver',
    async (choice, status, commandName) => {
      const harness = buildHarness();
      harness.repository.findOne.mockResolvedValue({
        id: approvalRequestRecordId,
        status: 'PENDING',
        requesterRecordId: '77777777-7777-4777-8777-777777777777',
        approverRecordId: actorRecordId,
      });

      const result = await harness.service.decide({
        workspaceId,
        actorId,
        actorRecordId,
        approvalRequestRecordId,
        correlationId,
        request: decision(choice),
      });

      expect(result.result.status).toBe(status);
      expect(harness.repository.update).toHaveBeenCalledWith(
        { id: approvalRequestRecordId, status: 'PENDING' },
        expect.objectContaining({
          status,
          decisionActorRecordId: actorRecordId,
        }),
        undefined,
        expect.anything(),
      );
      expect(
        harness.commandSupport.persistApprovalReceiptAndAudit,
      ).toHaveBeenCalledWith(expect.objectContaining({ commandName }));
    },
  );

  it('lets the requester cancel their own pending request', async () => {
    const harness = buildHarness();
    harness.repository.findOne.mockResolvedValue({
      id: approvalRequestRecordId,
      status: 'PENDING',
      requesterRecordId: actorRecordId,
      approverRecordId: null,
    });

    const result = await harness.service.decide({
      workspaceId,
      actorId,
      actorRecordId,
      approvalRequestRecordId,
      correlationId,
      request: decision('CANCEL'),
    });

    expect(result.result.status).toBe('CANCELLED');
    expect(
      harness.commandSupport.persistApprovalReceiptAndAudit,
    ).toHaveBeenCalledWith(expect.objectContaining({ commandName: 'approval.cancel' }));
  });

  it.each(['APPROVE', 'REJECT'] as const)(
    'rejects the requester %s their own request with no partial write',
    async (choice) => {
      const harness = buildHarness();
      harness.repository.findOne.mockResolvedValue({
        id: approvalRequestRecordId,
        status: 'PENDING',
        requesterRecordId: actorRecordId,
        approverRecordId: actorRecordId,
      });

      await expect(
        harness.service.decide({
          workspaceId,
          actorId,
          actorRecordId,
          approvalRequestRecordId,
          correlationId,
          request: decision(choice),
        }),
      ).rejects.toMatchObject({
        code: PASHX_COMMAND_EXCEPTION_CODES.forbiddenCapability,
      });
      expect(harness.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(harness.repository.update).not.toHaveBeenCalled();
      expect(
        harness.commandSupport.persistApprovalReceiptAndAudit,
      ).not.toHaveBeenCalled();
    },
  );

  it('rejects an unassigned approver and rolls back without audit', async () => {
    const harness = buildHarness();
    harness.repository.findOne.mockResolvedValue({
      id: approvalRequestRecordId,
      status: 'PENDING',
      requesterRecordId: '77777777-7777-4777-8777-777777777777',
      approverRecordId: '88888888-8888-4888-8888-888888888888',
    });

    await expect(
      harness.service.decide({
        workspaceId,
        actorId,
        actorRecordId,
        approvalRequestRecordId,
        correlationId,
        request: decision('APPROVE'),
      }),
    ).rejects.toMatchObject({
      code: PASHX_COMMAND_EXCEPTION_CODES.forbiddenCapability,
    });
    expect(harness.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(harness.repository.update).not.toHaveBeenCalled();
    expect(
      harness.commandSupport.persistApprovalReceiptAndAudit,
    ).not.toHaveBeenCalled();
  });
});

describe('PashxCommandSupportService approval audit', () => {
  it('persists one receipt and one audit event on the supplied query runner', async () => {
    const service = new PashxCommandSupportService();
    const queryRunner = {
      query: jest.fn().mockResolvedValue([]),
    } as unknown as WorkspaceQueryRunner;
    const result: PashxApprovalCommandResult = {
      approvalRequestRecordId,
      status: 'APPROVED',
      decidedAt: '2026-08-21T12:00:00.000Z',
    };

    await service.persistApprovalReceiptAndAudit({
      queryRunner,
      schema: 'workspace_1',
      idempotencyKey: 'approval-approve-1',
      requestHash: 'b'.repeat(64),
      commandName: 'approval.approve',
      result,
      actorId,
      correlationId,
      auditEventId: '99999999-9999-4999-8999-999999999999',
      payload: { result },
    });

    expect(queryRunner.query).toHaveBeenCalledTimes(2);
    expect(queryRunner.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('pashx_command_receipt'),
      expect.arrayContaining([result.approvalRequestRecordId, 2]),
    );
    expect(queryRunner.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('pashx_audit_event'),
      expect.arrayContaining([
        'approval.approve',
        result.approvalRequestRecordId,
        2,
      ]),
    );
  });
});
