import { PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS } from 'pashx-mab-contract';
import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export default defineField({
  universalIdentifier:
    PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.company.mabMetadataSourceKey,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.TEXT,
  name: 'mabMetadataSourceKey',
  label: 'MAB metadata source key',
  description: 'Stable source row key for repeatable MAB metadata imports.',
  icon: 'IconDatabaseImport',
  isNullable: true,
  isUnique: true,
});
