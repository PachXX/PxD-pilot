import {
  PASHX_EMAIL_INTAKE_TASK_TYPES,
  classifyEmailIntakeCandidate,
  type PashxEmailIntakeCandidate,
  type PashxEmailIntakeMessage,
} from 'pashx-mab-contract';
import { CoreApiClient } from 'twenty-client-sdk/core';

const DEFAULT_QUERY_LIMIT = 200;
const MAX_QUERY_LIMIT = 500;
const FROM_ROLE = 'FROM';

type QueryClient = Readonly<{
  query: (selection: Record<string, unknown>) => Promise<unknown>;
}>;

type QueryConnection<TNode> = Readonly<{
  edges?: readonly Readonly<{ node: TNode }>[];
  pageInfo?: Readonly<{ hasNextPage: boolean }>;
}>;

type ParticipantNode = Readonly<{
  role?: string | null;
  handle?: string | null;
  displayName?: string | null;
}>;

type MessageNode = Readonly<{
  id: string;
  subject?: string | null;
  text?: string | null;
  receivedAt?: string | null;
  isDraft?: boolean | null;
  messageParticipants?: QueryConnection<ParticipantNode>;
}>;

type EmailIntakeQueryData = Readonly<{
  messages?: QueryConnection<MessageNode>;
}>;

export type EmailIntakeCandidate = PashxEmailIntakeCandidate & {
  proposedTaskType: (typeof PASHX_EMAIL_INTAKE_TASK_TYPES)[number];
};

export type EmailIntakeResult = Readonly<{
  candidates: readonly EmailIntakeCandidate[];
  isPartial: boolean;
  asOf: string;
}>;

const fromParticipant = (node: MessageNode): PashxEmailIntakeMessage => {
  const sender =
    node.messageParticipants?.edges?.find(
      ({ node: participant }) => participant.role === FROM_ROLE,
    )?.node;
  const handle = sender?.handle ?? '';
  return {
    messageId: node.id,
    sender: handle === '' ? (sender?.displayName ?? '') : handle,
    subject: node.subject ?? '',
    body: node.text ?? '',
    receivedAt: node.receivedAt ?? '',
  };
};

/**
 * Read-only OC5 email-intake candidate read model.
 *
 * Reads synchronized Twenty `message` records (workspace-scoped through the
 * authenticated client, bounded at 1-500 per connection) and turns the
 * inbound ones into review-only candidates. Only messages that classify to a
 * supported task type are surfaced; nothing is created, sent, deleted or
 * auto-accepted, and the message body is never persisted on a candidate.
 */
export const loadEmailIntake = async ({
  now = () => new Date(),
  limit = DEFAULT_QUERY_LIMIT,
  client = new CoreApiClient() as QueryClient,
}: {
  now?: () => Date;
  limit?: number;
  client?: QueryClient;
}): Promise<EmailIntakeResult> => {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_QUERY_LIMIT) {
    throw new RangeError(
      `Email intake limit must be an integer from 1 to ${MAX_QUERY_LIMIT}.`,
    );
  }

  const data = (await client.query({
    messages: {
      __args: { first: limit },
      pageInfo: { hasNextPage: true },
      edges: {
        node: {
          id: true,
          subject: true,
          text: true,
          receivedAt: true,
          isDraft: true,
          messageParticipants: {
            edges: {
              node: {
                role: true,
                handle: true,
                displayName: true,
              },
            },
          },
        },
      },
    },
  })) as EmailIntakeQueryData;

  const asOf = now().toISOString();
  const isPartial = data.messages?.pageInfo?.hasNextPage === true;

  const candidates: EmailIntakeCandidate[] = (
    data.messages?.edges ?? []
  )
    .map(({ node }) => node)
    .filter((node) => node.isDraft !== true && node.isDraft !== undefined)
    .map(fromParticipant)
    .map(classifyEmailIntakeCandidate)
    .filter(
      (candidate): candidate is EmailIntakeCandidate =>
        candidate.proposedTaskType !== null &&
        PASHX_EMAIL_INTAKE_TASK_TYPES.includes(
          candidate.proposedTaskType as (typeof PASHX_EMAIL_INTAKE_TASK_TYPES)[number],
        ),
    );

  return { candidates, isPartial, asOf };
};
