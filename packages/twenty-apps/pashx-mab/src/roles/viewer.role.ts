import {
  PASHX_MAB_ROLE_CAPABILITY_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_ROLE_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { defineApplicationRole } from 'twenty-sdk/define';

import { PASHX_MAB_ROLE_OBJECT_PERMISSIONS } from './role-object-permissions';

export default defineApplicationRole({
  universalIdentifier: PASHX_MAB_ROLE_UNIVERSAL_IDENTIFIERS.viewer,
  label: 'PashX MAB Viewer',
  description: 'Reads MAB records without permission to run commands.',
  icon: 'IconEye',
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canAccessAllTools: false,
  canBeAssignedToUsers: true,
  canBeAssignedToAgents: false,
  canBeAssignedToApiKeys: false,
  objectPermissions: PASHX_MAB_ROLE_OBJECT_PERMISSIONS.viewer,
  permissionFlagUniversalIdentifiers: [
    ...PASHX_MAB_ROLE_CAPABILITY_UNIVERSAL_IDENTIFIERS.viewer,
  ],
});
