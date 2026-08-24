import { PASHX_MAB_CAPABILITIES, PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS } from 'pashx-mab-contract';
import { definePermissionFlag } from 'twenty-sdk/define';

export default definePermissionFlag({ universalIdentifier: PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS.approvalRequest, key: PASHX_MAB_CAPABILITIES.approvalRequest, label: 'Request MAB approval', description: 'Create an audited request for an allowlisted MAB action.', icon: 'IconStamp' });
