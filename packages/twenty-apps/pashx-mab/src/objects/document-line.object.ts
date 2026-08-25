import {
  PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS,
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
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.documentLine
          .commercialDocumentRecordId,
      type: FieldType.UUID,
      name: 'commercialDocumentRecordId',
      label: 'Document ID',
      description:
        'Owning commercial-document record; one workspace boundary only.',
      icon: 'IconFileInvoice',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.documentLine.linePosition,
      // `position` is an engine-reserved system field name on every object
      // (id, createdAt, updatedAt, deletedAt, createdBy, updatedBy, position),
      // so the manifest field uses the explicit `linePosition` name instead.
      type: FieldType.NUMBER,
      name: 'linePosition',
      label: 'Position',
      description: 'Integer display order of the line on the source document.',
      icon: 'IconListNumbers',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.documentLine.description,
      type: FieldType.TEXT,
      name: 'description',
      label: 'Description',
      description: 'Stored line description, never narrated or re-keyed.',
      icon: 'IconAbc',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.documentLine.specification,
      type: FieldType.TEXT,
      name: 'specification',
      label: 'Specification',
      description: 'Stored technical specification for this line.',
      icon: 'IconListDetails',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.documentLine.quantity,
      // The metadata engine rejects NUMERIC field creation for custom apps
      // ("Use NUMBER instead"), and NUMBER maps to a float64 column, so decimal
      // quantities remain representable; money stays in integer micros.
      type: FieldType.NUMBER,
      name: 'quantity',
      label: 'Quantity',
      description: 'Ordered quantity; must be greater than zero.',
      icon: 'IconNumber',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.documentLine.unit,
      type: FieldType.TEXT,
      name: 'unit',
      label: 'Unit',
      description: 'Unit of measure for the ordered quantity.',
      icon: 'IconRuler',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.documentLine.unitPriceMicros,
      type: FieldType.NUMBER,
      name: 'unitPriceMicros',
      label: 'Unit price (micros)',
      description: 'Unit price in integer micros.',
      icon: 'IconCurrencyRiyal',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.documentLine.lineTotalMicros,
      type: FieldType.NUMBER,
      name: 'lineTotalMicros',
      label: 'Line total (micros)',
      description: 'Line total in integer micros; quantity × unit price.',
      icon: 'IconCurrencyRiyal',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.documentLine.currencyCode,
      type: FieldType.TEXT,
      name: 'currencyCode',
      label: 'Currency',
      description: 'ISO 4217 currency code shared by every line.',
      icon: 'IconCurrencyRiyal',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.documentLine.sourceFileReference,
      type: FieldType.TEXT,
      name: 'sourceFileReference',
      label: 'Source file reference',
      description:
        'Traceable location of the source document line for verification.',
      icon: 'IconLink',
    },
  ],
});
