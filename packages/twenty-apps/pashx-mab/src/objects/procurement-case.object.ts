import {
  PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { defineObject, FieldType } from 'twenty-sdk/define';

export default defineObject({
  universalIdentifier: PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.procurementCase,
  nameSingular: 'procurementCase',
  namePlural: 'procurementCases',
  labelSingular: 'Procurement case',
  labelPlural: 'Procurement cases',
  description: 'The authoritative RFQ-to-margin transaction chain.',
  icon: 'IconBriefcase',
  labelIdentifierFieldMetadataUniversalIdentifier:
    PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS.procurementCase,
  fields: [
    {
      universalIdentifier:
        PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS.procurementCase,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Case name',
      description: 'Human-readable case reference.',
      icon: 'IconAbc',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.procurementCase.aggregateVersion,
      type: FieldType.NUMBER,
      name: 'aggregateVersion',
      label: 'Version',
      description: 'Optimistic-concurrency version maintained by PashX.',
      icon: 'IconVersions',
      defaultValue: 0,
    },
  ],
});
