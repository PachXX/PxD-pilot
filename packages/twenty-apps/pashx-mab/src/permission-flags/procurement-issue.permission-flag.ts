import {
  PASHX_MAB_CAPABILITIES,
  PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { definePermissionFlag } from 'twenty-sdk/define';

export default definePermissionFlag({
  universalIdentifier:
    PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS.procurementIssue,
  key: PASHX_MAB_CAPABILITIES.procurementIssue,
  label: 'Issue procurement documents',
  description: 'Finalize and issue procurement and purchase documents.',
  icon: 'IconShoppingCartCheck',
});
