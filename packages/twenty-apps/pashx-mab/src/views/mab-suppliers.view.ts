import { PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS } from 'pashx-mab-contract';
import {
  defineView,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewType,
} from 'twenty-sdk/define';

export const MAB_SUPPLIERS_VIEW_UNIVERSAL_IDENTIFIER =
  'a2ee499b-cc76-4833-9767-13c5cb817549';

const companyFields = STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.fields;
const mabCompanyFields = PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.company;

export default defineView({
  universalIdentifier: MAB_SUPPLIERS_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'MAB suppliers',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconBuildingFactory2',
  position: 11,
  fields: [
    {
      universalIdentifier: '37af2aee-8a37-4787-9402-8f6537cd0f20',
      fieldMetadataUniversalIdentifier: companyFields.name.universalIdentifier,
      position: 0,
      isVisible: true,
      size: 240,
    },
    {
      universalIdentifier: 'b156e145-54c1-4c45-bb61-10536d1c0337',
      fieldMetadataUniversalIdentifier: mabCompanyFields.mabBusinessRoles,
      position: 1,
      isVisible: true,
      size: 150,
    },
    {
      universalIdentifier: 'e5095e6d-7b53-4bcf-8ca2-5143f8e3e7eb',
      fieldMetadataUniversalIdentifier:
        mabCompanyFields.commercialRegistrationNumber,
      position: 2,
      isVisible: true,
      size: 190,
    },
    {
      universalIdentifier: '6ab8e186-848c-45c6-af07-9cc7551300e5',
      fieldMetadataUniversalIdentifier: mabCompanyFields.vatRegistrationNumber,
      position: 3,
      isVisible: true,
      size: 190,
    },
  ],
  filters: [
    {
      universalIdentifier: '5b9f811d-ab6a-4b71-b11a-1a0211fe6bb1',
      fieldMetadataUniversalIdentifier: mabCompanyFields.mabBusinessRoles,
      operand: ViewFilterOperand.CONTAINS,
      value: ['SUPPLIER'],
    },
  ],
});
