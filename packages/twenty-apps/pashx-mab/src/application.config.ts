import { PASHX_MAB_APPLICATION_UNIVERSAL_IDENTIFIER } from 'pashx-mab-contract';
import { defineApplication } from 'twenty-sdk/define';

export default defineApplication({
  universalIdentifier: PASHX_MAB_APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: 'PxD',
  description:
    'MAB procurement command centre and read-only operational profitability.',
  logo: 'public/brand/pxd-logo-512.png',
});
