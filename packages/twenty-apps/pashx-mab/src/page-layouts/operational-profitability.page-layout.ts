import {
  PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutType,
} from 'twenty-sdk/define';

export default definePageLayout({
  universalIdentifier:
    PASHX_MAB_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.operationalProfitability,
  name: 'Operational profitability',
  type: PageLayoutType.STANDALONE_PAGE,
  tabs: [
    {
      universalIdentifier:
        PASHX_MAB_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.operationalProfitabilityOverviewTab,
      title: 'Overview',
      position: 0,
      icon: 'IconChartBar',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        {
          universalIdentifier:
            PASHX_MAB_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.operationalProfitabilityDashboardWidget,
          title: 'Operational profitability',
          type: 'FRONT_COMPONENT',
          gridPosition: { row: 0, column: 0, rowSpan: 24, columnSpan: 12 },
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.operationalProfitabilityDashboard,
          },
        },
      ],
    },
  ],
});
