import {
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
  ],
});
