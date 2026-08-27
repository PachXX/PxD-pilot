import { PASHX_MAB_CAPABILITIES, PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS } from 'pashx-mab-contract';
import { definePermissionFlag } from 'twenty-sdk/define';

export default definePermissionFlag({ universalIdentifier: PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS.insightGenerate, key: PASHX_MAB_CAPABILITIES.insightGenerate, label: 'Generate MAB insight', description: 'Generate a versioned read-only insight from permitted evidence.', icon: 'IconBulb' });
