import {
  PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { defineObject, FieldType } from 'twenty-sdk/define';

export default defineObject({
  universalIdentifier: PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.documentLine,
  nameSingular: 'documentLine',
  namePlural: 'documentLines',
  labelSingular: 'Document line',
  labelPlural: 'Document lines',
  description:
    'A deterministic quantity and price line on a commercial document.',
  icon: 'IconListDetails',
  labelIdentifierFieldMetadataUniversalIdentifier:
    PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS.documentLine,
  fields: [
    {
      universalIdentifier:
        PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS.documentLine,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Line description',
      icon: 'IconAbc',
    },
  ],
});
