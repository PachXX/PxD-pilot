import {
  PASHX_MAB_CAPABILITIES,
  PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { definePermissionFlag } from 'twenty-sdk/define';

export default definePermissionFlag({
  universalIdentifier: PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS.documentEdit,
  key: PASHX_MAB_CAPABILITIES.documentEdit,
  label: 'Edit commercial documents',
  description: 'Create and update draft commercial documents and lines.',
  icon: 'IconFileInvoice',
});
