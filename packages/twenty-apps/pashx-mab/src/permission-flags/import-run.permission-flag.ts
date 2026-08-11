import {
  PASHX_MAB_CAPABILITIES,
  PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { definePermissionFlag } from 'twenty-sdk/define';

export default definePermissionFlag({
  universalIdentifier: PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS.importRun,
  key: PASHX_MAB_CAPABILITIES.importRun,
  label: 'Run staged imports',
  description: 'Validate, approve, and commit staged MAB imports.',
  icon: 'IconFileImport',
});
