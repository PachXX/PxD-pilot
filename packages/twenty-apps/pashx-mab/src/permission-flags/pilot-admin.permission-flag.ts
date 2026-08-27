import {
  PASHX_MAB_CAPABILITIES,
  PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { definePermissionFlag } from 'twenty-sdk/define';

export default definePermissionFlag({
  universalIdentifier: PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS.pilotAdmin,
  key: PASHX_MAB_CAPABILITIES.pilotAdmin,
  label: 'Administer the MAB pilot',
  description: 'Manage MAB pilot configuration and operational controls.',
  icon: 'IconSettings',
});
