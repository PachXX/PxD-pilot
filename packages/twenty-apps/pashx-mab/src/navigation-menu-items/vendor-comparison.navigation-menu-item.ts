import {
  PASHX_MAB_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

export default defineNavigationMenuItem({
  universalIdentifier:
    PASHX_MAB_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.vendorComparison,
  name: 'Vendor comparison',
  icon: 'IconScale',
  color: 'green',
  position: 3,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier:
    PASHX_MAB_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.vendorComparison,
});
