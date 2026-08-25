import {
  PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { defineObject, FieldType } from 'twenty-sdk/define';

export default defineObject({
  universalIdentifier: PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.cashMovement,
  nameSingular: 'cashMovement',
  namePlural: 'cashMovements',
  labelSingular: 'Cash movement',
  labelPlural: 'Cash movements',
  description:
    'An evidence-linked receipt or payment. Only human-verified movements enter the cash view.',
  icon: 'IconCashBanknote',
  labelIdentifierFieldMetadataUniversalIdentifier:
    PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS.cashMovement,
  fields: [
    {
      universalIdentifier:
        PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS.cashMovement,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Movement reference',
      description:
        'Unique operator-controlled reference for idempotent matching.',
      icon: 'IconHash',
      isUnique: true,
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.cashMovement.direction,
      type: FieldType.SELECT,
      name: 'direction',
      label: 'Direction',
      description: 'Whether money was received by MAB or paid by MAB.',
      icon: 'IconArrowsExchange',
      options: [
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.cashMovement
            .direction.inflow,
          value: 'INFLOW',
          label: 'Cash inflow',
          color: 'green',
          position: 0,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.cashMovement
            .direction.outflow,
          value: 'OUTFLOW',
          label: 'Cash outflow',
          color: 'orange',
          position: 1,
        },
      ],
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.cashMovement.verificationStatus,
      type: FieldType.SELECT,
      name: 'verificationStatus',
      label: 'Verification status',
      description:
        'Only human-verified movements are included in cash totals; agents cannot verify them.',
      icon: 'IconProgressCheck',
      defaultValue: `'PENDING'`,
      options: [
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.cashMovement
            .verificationStatus.pending,
          value: 'PENDING',
          label: 'Pending evidence review',
          color: 'yellow',
          position: 0,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.cashMovement
            .verificationStatus.verified,
          value: 'VERIFIED',
          label: 'Verified',
          color: 'green',
          position: 1,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.cashMovement
            .verificationStatus.rejected,
          value: 'REJECTED',
          label: 'Rejected',
          color: 'red',
          position: 2,
        },
      ],
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.cashMovement.amount,
      type: FieldType.CURRENCY,
      name: 'amount',
      label: 'Amount',
      description:
        'Actual received or paid amount in integer-micros Currency form.',
      icon: 'IconCurrencyRiyal',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.cashMovement.movementDate,
      type: FieldType.DATE,
      name: 'movementDate',
      label: 'Movement date',
      description: 'Date the money was actually received or paid.',
      icon: 'IconCalendar',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.cashMovement
          .procurementCaseRecordId,
      type: FieldType.UUID,
      name: 'procurementCaseRecordId',
      label: 'Procurement case ID',
      description: 'Case to which this receipt or payment belongs.',
      icon: 'IconBriefcase',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.cashMovement
          .sourceDocumentRecordId,
      type: FieldType.UUID,
      name: 'sourceDocumentRecordId',
      label: 'Source document ID',
      description:
        'Invoice, purchase order, or credit record supporting the movement.',
      icon: 'IconFileText',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.cashMovement.bankReference,
      type: FieldType.TEXT,
      name: 'bankReference',
      label: 'Bank reference',
      description: 'Sanitized bank or remittance reference used for matching.',
      icon: 'IconBuildingBank',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.cashMovement.evidenceReference,
      type: FieldType.TEXT,
      name: 'evidenceReference',
      label: 'Evidence reference',
      description:
        'Traceable internal location of the reviewed payment evidence.',
      icon: 'IconLink',
    },
  ],
});
