import { PASHX_MAB_CAPABILITIES, PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS } from 'pashx-mab-contract';
import { definePermissionFlag } from 'twenty-sdk/define';

export default definePermissionFlag({ universalIdentifier: PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS.emailIntakeReview, key: PASHX_MAB_CAPABILITIES.emailIntakeReview, label: 'Review email intake', description: 'Review task candidates derived from synchronized email.', icon: 'IconMailSearch' });
