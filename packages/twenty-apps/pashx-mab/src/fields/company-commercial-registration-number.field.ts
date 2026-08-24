import { PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS } from 'pashx-mab-contract';
import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier:
    PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.company
      .commercialRegistrationNumber,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.TEXT,
  name: 'commercialRegistrationNumber',
  label: 'Commercial registration',
  description: 'Saudi commercial registration number used for MAB import matching.',
  icon: 'IconId',
  isNullable: true,
  isUnique: true,
});
