import { PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS } from 'pashx-mab-contract';
import {
  defineView,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewType,
} from 'twenty-sdk/define';

export const MAB_CUSTOMERS_VIEW_UNIVERSAL_IDENTIFIER =
  'b862b3fc-4080-4709-905d-25e5b6d3b5ad';

const companyFields = STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.fields;
const mabCompanyFields = PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.company;

export default defineView({
  universalIdentifier: MAB_CUSTOMERS_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'MAB customers',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconBuildingStore',
  position: 10,
  fields: [
    {
      universalIdentifier: 'b34a531d-472a-485d-9d70-17455d5c0334',
      fieldMetadataUniversalIdentifier: companyFields.name.universalIdentifier,
      position: 0,
      isVisible: true,
      size: 240,
    },
    {
      universalIdentifier: 'e1de83b1-e7dc-4391-b431-e72c367e6b46',
      fieldMetadataUniversalIdentifier: mabCompanyFields.mabBusinessRoles,
      position: 1,
      isVisible: true,
      size: 150,
    },
    {
      universalIdentifier: '4e8060e6-abb2-40f2-82c6-2de4f60bbd80',
      fieldMetadataUniversalIdentifier:
        mabCompanyFields.commercialRegistrationNumber,
      position: 2,
      isVisible: true,
      size: 190,
    },
    {
      universalIdentifier: 'ed2a3b7e-0d42-4ab1-98d8-de2fca3c9775',
      fieldMetadataUniversalIdentifier: mabCompanyFields.vatRegistrationNumber,
      position: 3,
      isVisible: true,
      size: 190,
    },
  ],
  filters: [
    {
      universalIdentifier: 'e5c9bd1c-66b7-4ad7-b515-5940cfdcf67d',
      fieldMetadataUniversalIdentifier: mabCompanyFields.mabBusinessRoles,
      operand: ViewFilterOperand.CONTAINS,
      value: ['CUSTOMER'],
    },
  ],
});
