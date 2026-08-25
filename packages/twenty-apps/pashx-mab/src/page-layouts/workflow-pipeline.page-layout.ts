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
    PASHX_MAB_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.workflowPipeline,
  name: 'MAB workflow pipeline',
  type: PageLayoutType.STANDALONE_PAGE,
  tabs: [
    {
      universalIdentifier:
        PASHX_MAB_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS
          .workflowPipelineOverviewTab,
      title: 'MAB workflow pipeline',
      position: 0,
      icon: 'IconLayoutKanban',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        {
          universalIdentifier:
            PASHX_MAB_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS
              .workflowPipelineWidget,
          title: 'MAB workflow pipeline',
          type: 'FRONT_COMPONENT',
          gridPosition: { row: 0, column: 0, rowSpan: 24, columnSpan: 12 },
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.workflowPipeline,
          },
        },
      ],
    },
  ],
});
