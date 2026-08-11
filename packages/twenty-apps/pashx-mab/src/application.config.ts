import { PASHX_MAB_APPLICATION_UNIVERSAL_IDENTIFIER } from 'pashx-mab-contract';
import { defineApplication } from 'twenty-sdk/define';

export default defineApplication({
  universalIdentifier: PASHX_MAB_APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'PashX MAB Procurement',
  description:
    'Single-workspace MAB procurement operations from requisition through delivery, invoicing, margin, and compliance.',
});
