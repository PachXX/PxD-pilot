import { PASHX_MAB_CAPABILITIES, PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS } from 'pashx-mab-contract';
import { definePermissionFlag } from 'twenty-sdk/define';

export default definePermissionFlag({ universalIdentifier: PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS.approvalDecide, key: PASHX_MAB_CAPABILITIES.approvalDecide, label: 'Decide MAB approval', description: 'Approve, reject, or cancel an audited MAB approval request.', icon: 'IconUserCheck' });
