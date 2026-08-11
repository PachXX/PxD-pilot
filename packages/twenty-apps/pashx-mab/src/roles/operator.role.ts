import {
  PASHX_MAB_ROLE_CAPABILITY_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_ROLE_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { defineRole } from 'twenty-sdk/define';

import { PASHX_MAB_ROLE_OBJECT_PERMISSIONS } from './role-object-permissions';

export default defineRole({
  universalIdentifier: PASHX_MAB_ROLE_UNIVERSAL_IDENTIFIERS.operator,
  label: 'PashX MAB Operator',
  description: 'Runs procurement cases, documents, purchasing, and delivery.',
  icon: 'IconUserCog',
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canAccessAllTools: false,
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  objectPermissions: PASHX_MAB_ROLE_OBJECT_PERMISSIONS.operator,
  permissionFlagUniversalIdentifiers: [
    ...PASHX_MAB_ROLE_CAPABILITY_UNIVERSAL_IDENTIFIERS.operator,
  ],
});
