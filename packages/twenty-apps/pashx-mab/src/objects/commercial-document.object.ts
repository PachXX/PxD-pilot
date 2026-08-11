import {
  PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { defineObject, FieldType } from 'twenty-sdk/define';

export default defineObject({
  universalIdentifier:
    PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.commercialDocument,
  nameSingular: 'commercialDocument',
  namePlural: 'commercialDocuments',
  labelSingular: 'Commercial document',
  labelPlural: 'Commercial documents',
  description: 'A versioned RFQ, quotation, order, delivery note, or invoice.',
  icon: 'IconFileInvoice',
  labelIdentifierFieldMetadataUniversalIdentifier:
    PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS.commercialDocument,
  fields: [
    {
      universalIdentifier:
        PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS.commercialDocument,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Document reference',
      description: 'Human-readable document number or draft reference.',
      icon: 'IconHash',
      isUnique: true,
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.commercialDocument.documentType,
      type: FieldType.SELECT,
      name: 'documentType',
      label: 'Document type',
      description: 'The commercial role of this document.',
      icon: 'IconFileTypePdf',
      defaultValue: `'VENDOR_PURCHASE_ORDER'`,
      options: [
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS
            .commercialDocument.documentType.vendorPurchaseOrder,
          value: 'VENDOR_PURCHASE_ORDER',
          label: 'Vendor purchase order',
          color: 'blue',
          position: 0,
        },
      ],
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.commercialDocument
          .lifecycleStatus,
      type: FieldType.SELECT,
      name: 'lifecycleStatus',
      label: 'Lifecycle status',
      description: 'Authoritative document lifecycle state.',
      icon: 'IconProgress',
      defaultValue: `'DRAFT'`,
      options: [
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS
            .commercialDocument.lifecycleStatus.draft,
          value: 'DRAFT',
          label: 'Draft',
          color: 'gray',
          position: 0,
        },
      ],
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.commercialDocument
          .aggregateVersion,
      type: FieldType.NUMBER,
      name: 'aggregateVersion',
      label: 'Version',
      description: 'Optimistic-concurrency version maintained by PashX.',
      icon: 'IconVersions',
      defaultValue: 1,
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.commercialDocument
          .procurementCaseRecordId,
      type: FieldType.UUID,
      name: 'procurementCaseRecordId',
      label: 'Procurement case ID',
      description: 'Owning procurement-case record.',
      icon: 'IconBriefcase',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.commercialDocument
          .supplierRecordId,
      type: FieldType.UUID,
      name: 'supplierRecordId',
      label: 'Supplier ID',
      description: 'Twenty company record used as the supplier.',
      icon: 'IconBuildingFactory2',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.commercialDocument.issueDate,
      type: FieldType.DATE,
      name: 'issueDate',
      label: 'Issue date',
      description: 'Business issue date of the purchase order.',
      icon: 'IconCalendar',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.commercialDocument.currency,
      type: FieldType.TEXT,
      name: 'currencyCode',
      label: 'Currency',
      description: 'ISO 4217 currency code; SAR is the pilot default.',
      icon: 'IconCurrencyRiyal',
      defaultValue: `'SAR'`,
    },
  ],
});
