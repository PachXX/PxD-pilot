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
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .documentType.customerRfq,
          value: 'CUSTOMER_RFQ',
          label: 'Customer RFQ',
          color: 'blue',
          position: 0,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .documentType.supplierRfq,
          value: 'SUPPLIER_RFQ',
          label: 'Supplier RFQ',
          color: 'blue',
          position: 1,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .documentType.vendorQuote,
          value: 'VENDOR_QUOTE',
          label: 'Vendor quotation',
          color: 'cyan',
          position: 2,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .documentType.customerQuote,
          value: 'CUSTOMER_QUOTE',
          label: 'Customer quotation',
          color: 'cyan',
          position: 3,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .documentType.customerPurchaseOrder,
          value: 'CUSTOMER_PURCHASE_ORDER',
          label: 'Customer purchase order',
          color: 'purple',
          position: 4,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .documentType.vendorPurchaseOrder,
          value: 'VENDOR_PURCHASE_ORDER',
          label: 'Vendor purchase order',
          color: 'blue',
          position: 5,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .documentType.deliveryNote,
          value: 'DELIVERY_NOTE',
          label: 'Delivery note',
          color: 'yellow',
          position: 6,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .documentType.vendorInvoice,
          value: 'VENDOR_INVOICE',
          label: 'Vendor invoice',
          color: 'orange',
          position: 7,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .documentType.customerInvoice,
          value: 'CUSTOMER_INVOICE',
          label: 'Customer invoice',
          color: 'green',
          position: 8,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .documentType.customerCreditNote,
          value: 'CUSTOMER_CREDIT_NOTE',
          label: 'Customer credit note',
          color: 'orange',
          position: 9,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .documentType.vendorCreditNote,
          value: 'VENDOR_CREDIT_NOTE',
          label: 'Vendor credit note',
          color: 'yellow',
          position: 10,
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
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .lifecycleStatus.draft,
          value: 'DRAFT',
          label: 'Draft',
          color: 'gray',
          position: 0,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .lifecycleStatus.finalized,
          value: 'FINALIZED',
          label: 'Finalized',
          color: 'green',
          position: 1,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .lifecycleStatus.cancelled,
          value: 'CANCELLED',
          label: 'Cancelled',
          color: 'red',
          position: 2,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .lifecycleStatus.credited,
          value: 'CREDITED',
          label: 'Credited',
          color: 'gray',
          position: 3,
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
      description: 'Business issue date of the document.',
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
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.commercialDocument.totalAmount,
      type: FieldType.CURRENCY,
      name: 'totalAmount',
      label: 'Final total',
      description:
        'Authoritative finalized total; calculations retain integer micros.',
      icon: 'IconCurrencyRiyal',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.commercialDocument
          .complianceStatus,
      type: FieldType.SELECT,
      name: 'complianceStatus',
      label: 'Invoice compliance',
      description:
        'Whether a revenue document may enter authoritative profitability.',
      icon: 'IconShieldCheck',
      defaultValue: `'NOT_REQUIRED'`,
      options: [
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .complianceStatus.notRequired,
          value: 'NOT_REQUIRED',
          label: 'Not required',
          color: 'gray',
          position: 0,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .complianceStatus.pending,
          value: 'PENDING',
          label: 'Pending',
          color: 'yellow',
          position: 1,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .complianceStatus.cleared,
          value: 'CLEARED',
          label: 'Cleared',
          color: 'green',
          position: 2,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.commercialDocument
            .complianceStatus.rejected,
          value: 'REJECTED',
          label: 'Rejected',
          color: 'red',
          position: 3,
        },
      ],
    },
  ],
});
