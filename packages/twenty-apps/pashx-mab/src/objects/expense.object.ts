import {
  PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { defineObject, FieldType } from 'twenty-sdk/define';

export default defineObject({
  universalIdentifier: PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.expense,
  nameSingular: 'expense',
  namePlural: 'expenses',
  labelSingular: 'Expense',
  labelPlural: 'Expenses',
  description: 'An approved direct cost attributable to a procurement case.',
  icon: 'IconReceipt',
  labelIdentifierFieldMetadataUniversalIdentifier:
    PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS.expense,
  fields: [
    {
      universalIdentifier: PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS.expense,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Expense description',
      icon: 'IconAbc',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.expense.amount,
      type: FieldType.CURRENCY,
      name: 'amount',
      label: 'Amount',
      description: 'Approved direct expense in integer-micros Currency form.',
      icon: 'IconCurrencyRiyal',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.expense.approvalStatus,
      type: FieldType.SELECT,
      name: 'approvalStatus',
      label: 'Approval status',
      description: 'Only approved expenses enter direct cost.',
      icon: 'IconProgressCheck',
      defaultValue: `'PENDING'`,
      options: [
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.expense
            .approvalStatus.pending,
          value: 'PENDING',
          label: 'Pending',
          color: 'yellow',
          position: 0,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.expense
            .approvalStatus.approved,
          value: 'APPROVED',
          label: 'Approved',
          color: 'green',
          position: 1,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.expense
            .approvalStatus.rejected,
          value: 'REJECTED',
          label: 'Rejected',
          color: 'red',
          position: 2,
        },
      ],
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.expense
          .procurementCaseRecordId,
      type: FieldType.UUID,
      name: 'procurementCaseRecordId',
      label: 'Procurement case ID',
      description: 'Case to which this direct expense is attributable.',
      icon: 'IconBriefcase',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.expense.incurredDate,
      type: FieldType.DATE,
      name: 'incurredDate',
      label: 'Incurred date',
      description: 'Reporting date used by operational profitability.',
      icon: 'IconCalendar',
    },
  ],
});
