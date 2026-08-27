import {
  PASHX_MAB_CAPABILITIES,
  PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { definePermissionFlag } from 'twenty-sdk/define';

export default definePermissionFlag({
  universalIdentifier: PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS.financePost,
  key: PASHX_MAB_CAPABILITIES.financePost,
  label: 'Post financial records',
  description: 'Finalize invoices, costs, expenses, and margin records.',
  icon: 'IconCashBanknote',
});
