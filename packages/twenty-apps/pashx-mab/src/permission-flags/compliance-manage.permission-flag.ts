import {
  PASHX_MAB_CAPABILITIES,
  PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { definePermissionFlag } from 'twenty-sdk/define';

export default definePermissionFlag({
  universalIdentifier:
    PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS.complianceManage,
  key: PASHX_MAB_CAPABILITIES.complianceManage,
  label: 'Manage invoice compliance',
  description: 'Submit, retry, and resolve ZATCA compliance operations.',
  icon: 'IconShieldCheck',
});
