import {
  PASHX_MAB_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { defineCommandMenuItem } from 'twenty-sdk/define';

export default defineCommandMenuItem({
  universalIdentifier:
    PASHX_MAB_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS.createVendorPurchaseOrder,
  label: 'Create vendor purchase order',
  shortLabel: 'Create Vendor PO',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier:
    PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.procurementCase,
  frontComponentUniversalIdentifier:
    PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.createVendorPurchaseOrder,
});
