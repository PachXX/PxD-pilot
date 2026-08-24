import {
  PASHX_MAB_ROLE_CAPABILITY_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_ROLE_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { defineRole, SystemPermissionFlag } from 'twenty-sdk/define';

import { PASHX_MAB_ROLE_OBJECT_PERMISSIONS } from './role-object-permissions';

export default defineRole({
  universalIdentifier: PASHX_MAB_ROLE_UNIVERSAL_IDENTIFIERS.evidenceAgent,
  label: 'PxD Evidence Agent',
  description:
    'Read-only evidence access for PxD analysis and procurement triage agents.',
  icon: 'IconRobot',
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canAccessAllTools: false,
  canBeAssignedToUsers: false,
  canBeAssignedToAgents: true,
  canBeAssignedToApiKeys: false,
  objectPermissions: PASHX_MAB_ROLE_OBJECT_PERMISSIONS.evidenceAgent,
  permissionFlagUniversalIdentifiers: [
    SystemPermissionFlag.AI,
    ...PASHX_MAB_ROLE_CAPABILITY_UNIVERSAL_IDENTIFIERS.evidenceAgent,
  ],
});
