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
    PASHX_MAB_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS.caseWorkflow,
  name: 'Case workflow',
  icon: 'IconTimelineEvent',
  color: 'green',
  position: 2,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier:
    PASHX_MAB_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.caseWorkflow,
});
