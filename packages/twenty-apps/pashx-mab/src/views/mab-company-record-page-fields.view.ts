import { PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS } from 'pashx-mab-contract';
import {
  defineView,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewType,
} from 'twenty-sdk/define';

export const MAB_COMPANY_RECORD_PAGE_FIELDS_VIEW_UNIVERSAL_IDENTIFIER =
  'cc12d1cd-45a9-4f15-9788-627056b80a9a';

const mabCompanyFields = PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.company;

export default defineView({
  universalIdentifier:
    MAB_COMPANY_RECORD_PAGE_FIELDS_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'MAB Company Record Page Fields',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: ViewType.FIELDS_WIDGET,
  fields: [
    {
      universalIdentifier: '664eb0cd-6abe-4380-adbe-7e756c8c7b9e',
      fieldMetadataUniversalIdentifier: mabCompanyFields.mabBusinessRoles,
      position: 0,
      isVisible: true,
    },
    {
      universalIdentifier: 'b2122f69-b67f-4f40-bc91-a7c0421b2ed9',
      fieldMetadataUniversalIdentifier:
        mabCompanyFields.commercialRegistrationNumber,
      position: 1,
      isVisible: true,
    },
    {
      universalIdentifier: 'e8f59019-84e1-4baa-a30c-15b8d82b7dd7',
      fieldMetadataUniversalIdentifier: mabCompanyFields.vatRegistrationNumber,
      position: 2,
      isVisible: true,
    },
  ],
});
