import {
  PASHX_MAB_CAPABILITIES,
  PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { definePermissionFlag } from 'twenty-sdk/define';

export default definePermissionFlag({
  universalIdentifier:
    PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS.deliveryRecord,
  key: PASHX_MAB_CAPABILITIES.deliveryRecord,
  label: 'Record deliveries',
  description: 'Record delivery notes and delivery progress.',
  icon: 'IconTruckDelivery',
});
