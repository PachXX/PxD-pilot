import {
  PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier:
    PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.company.mabBusinessRoles,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.MULTI_SELECT,
  name: 'mabBusinessRoles',
  label: 'MAB business roles',
  description: 'Whether the company is a customer, supplier, or both in MAB procurement.',
  icon: 'IconBuildingFactory2',
  isNullable: true,
  options: [
    {
      id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.company.mabBusinessRoles.customer,
      value: 'CUSTOMER',
      label: 'Customer',
      color: 'green',
      position: 0,
    },
    {
      id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.company.mabBusinessRoles.supplier,
      value: 'SUPPLIER',
      label: 'Supplier',
      color: 'blue',
      position: 1,
    },
  ],
});
