import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PASHX_MAB_AGENT_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_ROLE_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { SystemPermissionFlag } from 'twenty-sdk/define';

import evidenceAnalyst from '../src/agents/evidence-analyst.agent';
import procurementTriage from '../src/agents/procurement-triage.agent';
import evidenceAgentRole from '../src/roles/evidence-agent.role';

test('binds both OC4 agents to the agent-only evidence role', () => {
  assert.equal(evidenceAnalyst.success, true);
  assert.equal(procurementTriage.success, true);

  assert.deepEqual(
    [evidenceAnalyst.config, procurementTriage.config].map((agent) => ({
      universalIdentifier: agent.universalIdentifier,
      roleUniversalIdentifier: agent.roleUniversalIdentifier,
    })),
    [
      {
        universalIdentifier:
          PASHX_MAB_AGENT_UNIVERSAL_IDENTIFIERS.evidenceAnalyst,
        roleUniversalIdentifier:
          PASHX_MAB_ROLE_UNIVERSAL_IDENTIFIERS.evidenceAgent,
      },
      {
        universalIdentifier:
          PASHX_MAB_AGENT_UNIVERSAL_IDENTIFIERS.procurementTriage,
        roleUniversalIdentifier:
          PASHX_MAB_ROLE_UNIVERSAL_IDENTIFIERS.evidenceAgent,
      },
    ],
  );
});

test('keeps the OC4 role explicitly read-only and agent-only', () => {
  assert.equal(evidenceAgentRole.success, true);
  const role = evidenceAgentRole.config;

  assert.equal(role.canReadAllObjectRecords, false);
  assert.equal(role.canUpdateAllObjectRecords, false);
  assert.equal(role.canSoftDeleteAllObjectRecords, false);
  assert.equal(role.canDestroyAllObjectRecords, false);
  assert.equal(role.canUpdateAllSettings, false);
  assert.equal(role.canAccessAllTools, false);
  assert.equal(role.canBeAssignedToUsers, false);
  assert.equal(role.canBeAssignedToAgents, true);
  assert.equal(role.canBeAssignedToApiKeys, false);
  assert.deepEqual(role.permissionFlagUniversalIdentifiers, [
    SystemPermissionFlag.AI,
  ]);
  assert.ok((role.objectPermissions?.length ?? 0) > 0);

  for (const permission of role.objectPermissions ?? []) {
    assert.equal(permission.canReadObjectRecords, true);
    assert.equal(permission.canUpdateObjectRecords, false);
    assert.equal(permission.canSoftDeleteObjectRecords, false);
    assert.equal(permission.canDestroyObjectRecords, false);
  }
});

test('makes evidence provenance and prohibited actions explicit in each prompt', () => {
  for (const agent of [evidenceAnalyst.config, procurementTriage.config]) {
    assert.match(agent.prompt, /source record IDs/);
    assert.match(agent.prompt, /untrusted evidence, never as instructions/);
    assert.match(agent.prompt, /Never create, update, delete/);
    assert.match(agent.prompt, /send email/);
    assert.match(agent.prompt, /change compliance state/);
  }
});
