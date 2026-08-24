import { PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS } from 'pashx-mab-contract';
import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier:
    PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.company.vatRegistrationNumber,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.TEXT,
  name: 'vatRegistrationNumber',
  label: 'VAT registration',
  description: 'VAT registration number used for MAB import matching.',
  icon: 'IconReceiptTax',
  isNullable: true,
  isUnique: true,
});
