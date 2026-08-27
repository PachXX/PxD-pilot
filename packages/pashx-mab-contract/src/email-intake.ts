import type { PashxEmailIntakeCandidate } from './operational-command-centre.js';

export const PASHX_EMAIL_INTAKE_TASK_TYPES = [
  'PREPARE_QUOTATION',
  'CAPTURE_PURCHASE_ORDER',
  'CAPTURE_DELIVERY_NOTE',
  'CAPTURE_INVOICE',
] as const;
export type PashxEmailIntakeTaskType =
  (typeof PASHX_EMAIL_INTAKE_TASK_TYPES)[number];

export const PASHX_EMAIL_INTAKE_REVIEW_STATUSES = [
  'PENDING_REVIEW',
  'ACCEPTED',
  'DISMISSED',
] as const;
export type PashxEmailIntakeReviewStatus =
  (typeof PASHX_EMAIL_INTAKE_REVIEW_STATUSES)[number];

/**
 * A synchronized email message reduced to the fields the read model needs.
 * The body is used here only to classify; it is never persisted on a candidate.
 */
export type PashxEmailIntakeMessage = Readonly<{
  messageId: string;
  sender: string;
  subject: string;
  body: string;
  receivedAt: string;
}>;

const normalize = (value: string): string => value.toLowerCase();

const MATCHERS: readonly Readonly<{
  proposedTaskType: PashxEmailIntakeTaskType;
  pattern: RegExp;
}>[] = [
  {
    proposedTaskType: 'CAPTURE_INVOICE',
    pattern: /\binvoice\b|\bbill(?:ing)?\b|\bpayment due\b/,
  },
  {
    proposedTaskType: 'CAPTURE_DELIVERY_NOTE',
    pattern: /\bdelivery note\b|\bdn\b|\bconsignment\b|\bdelivered\b/,
  },
  {
    proposedTaskType: 'CAPTURE_PURCHASE_ORDER',
    pattern: /\bpurchase order\b|\bpo\b|\border number\b/,
  },
  {
    proposedTaskType: 'PREPARE_QUOTATION',
    pattern: /\bquotation\b|\bquote\b|\brfq\b|\brequest for quote\b/,
  },
];

/**
 * Deterministic keyword classifier for synchronized email intake.
 *
 * OC5 is review-only: the result is always PENDING_REVIEW, never auto-created
 * and never accepted. Email content is untrusted input, so this function only
 * matches literal keywords and never executes, summarizes, or follows any
 * instruction found inside the message body.
 */
export const classifyEmailIntakeCandidate = (
  message: PashxEmailIntakeMessage,
): PashxEmailIntakeCandidate => {
  const textToMatch = normalize(`${message.subject}\n${message.body}`);
  const match = MATCHERS.find(({ pattern }) => pattern.test(textToMatch));

  return {
    messageId: message.messageId,
    sender: message.sender,
    subject: message.subject,
    proposedTaskType: match?.proposedTaskType ?? null,
    sourceRecordIds: [message.messageId],
    reviewStatus: 'PENDING_REVIEW',
    receivedAt: message.receivedAt,
  };
};
