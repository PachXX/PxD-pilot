import type { PashxEmailIntakeCandidate } from 'pashx-mab-contract';

// Native Twenty message record link for drill-through from a candidate.
export const getEmailMessageHref = (
  candidate: PashxEmailIntakeCandidate,
): string => `/object/message/${candidate.messageId}`;
