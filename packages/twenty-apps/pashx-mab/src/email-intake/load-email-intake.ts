import {
  classifyEmailIntakeCandidate,
  PASHX_MAB_CAPABILITIES,
  type PashxEmailIntakeCandidate,
  type PashxEmailIntakeMessage,
} from 'pashx-mab-contract';
import { CoreApiClient } from 'twenty-client-sdk/core';
import { MetadataApiClient } from 'twenty-client-sdk/metadata';

const DEFAULT_QUERY_LIMIT = 50;
const MAX_QUERY_LIMIT = 500;
const FROM_ROLE = 'FROM';
const TO_ROLE = 'TO';
const INCOMING_DIRECTION = 'INCOMING';
const APPROVED_MAILBOX = 'info@mabindus.com';

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

type MessageChannelAssociationNode = Readonly<{
  direction?: string | null;
}>;

type MessageNode = Readonly<{
  id: string;
  subject?: string | null;
  text?: string | null;
  receivedAt?: string | null;
  isDraft?: boolean | null;
  messageParticipants?: QueryConnection<ParticipantNode>;
  messageChannelMessageAssociations?: QueryConnection<MessageChannelAssociationNode>;
}>;

type EmailIntakeQueryData = Readonly<{
  messages?: QueryConnection<MessageNode>;
}>;

export type EmailIntakeResult = Readonly<{
  candidates: readonly PashxEmailIntakeCandidate[];
  isPartial: boolean;
  asOf: string;
}>;

export const canReviewEmailIntake = async (
  client = new MetadataApiClient() as QueryClient,
): Promise<boolean> => {
  const identity = (await client.query({
    currentUser: {
      workspaceMember: {
        roles: { permissionFlags: { flag: true } },
      },
    },
  })) as {
    currentUser?: {
      workspaceMember?: {
        roles?: readonly {
          permissionFlags?: readonly { flag?: string | null }[];
        }[];
      } | null;
    };
  };

  return (
    identity.currentUser?.workspaceMember?.roles?.some((role) =>
      role.permissionFlags?.some(
        ({ flag }) => flag === PASHX_MAB_CAPABILITIES.emailIntakeReview,
      ),
    ) === true
  );
};

const isApprovedInboundMessage = (node: MessageNode): boolean => {
  const isIncoming = node.messageChannelMessageAssociations?.edges?.some(
    ({ node: association }) => association.direction === INCOMING_DIRECTION,
  );
  const targetsApprovedMailbox = node.messageParticipants?.edges?.some(
    ({ node: participant }) =>
      participant.role === TO_ROLE &&
      participant.handle?.trim().toLowerCase() === APPROVED_MAILBOX,
  );

  return isIncoming === true && targetsApprovedMailbox === true;
};

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
      __args: {
        first: limit,
        orderBy: [
          { receivedAt: 'DescNullsLast' },
          { id: 'DescNullsLast' },
        ],
      },
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
          messageChannelMessageAssociations: {
            edges: { node: { direction: true } },
          },
        },
      },
    },
  })) as EmailIntakeQueryData;

  const asOf = now().toISOString();
  const isPartial = data.messages?.pageInfo?.hasNextPage === true;

  const candidates: PashxEmailIntakeCandidate[] = (
    data.messages?.edges ?? []
  )
    .map(({ node }) => node)
    .filter(
      (node) =>
        node.isDraft === false && isApprovedInboundMessage(node),
    )
    .map(fromParticipant)
    .map(classifyEmailIntakeCandidate)
    .filter((candidate) => candidate.proposedTaskType !== null);

  return { candidates, isPartial, asOf };
};
