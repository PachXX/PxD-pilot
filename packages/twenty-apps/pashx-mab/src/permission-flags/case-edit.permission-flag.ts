import {
  PASHX_MAB_CAPABILITIES,
  PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { definePermissionFlag } from 'twenty-sdk/define';

export default definePermissionFlag({
  universalIdentifier: PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS.caseEdit,
  key: PASHX_MAB_CAPABILITIES.caseEdit,
  label: 'Edit procurement cases',
  description: 'Create and update MAB procurement cases.',
  icon: 'IconBriefcase',
});
