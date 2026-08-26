import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { MAB_COMPANY_RECORD_PAGE_FIELDS_VIEW_UNIVERSAL_IDENTIFIER } from '../views/mab-company-record-page-fields.view';

export const MAB_COMPANY_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER =
  '9b6fd32e-544b-4256-9889-87eb66c64079';

export default definePageLayout({
  universalIdentifier: MAB_COMPANY_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'MAB Customer and Supplier Layout',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  tabs: [
    {
      universalIdentifier: '70f01b7a-25d1-4570-a9e6-b71545af188c',
      title: 'Business details',
      position: 0,
      icon: 'IconBuildingFactory2',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: '98a3476c-30d3-4b29-9422-d51886fa8622',
          title: 'Customer and supplier details',
          type: 'FIELDS',
          configuration: {
            configurationType: 'FIELDS',
            viewUniversalIdentifier:
              MAB_COMPANY_RECORD_PAGE_FIELDS_VIEW_UNIVERSAL_IDENTIFIER,
          },
        },
      ],
    },
  ],
});
