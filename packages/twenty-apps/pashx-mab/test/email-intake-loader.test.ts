import assert from 'node:assert/strict';
import test from 'node:test';

import { loadEmailIntake } from '../src/email-intake/load-email-intake';

const messageNode = (
  overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> => ({
  id: 'msg-1',
  subject: '',
  text: '',
  receivedAt: '2026-08-24T09:00:00.000Z',
  isDraft: false,
  messageParticipants: {
    edges: [
      {
        node: {
          role: 'FROM',
          handle: 'supplier@example.com',
          displayName: 'ABC Trading',
        },
      },
      { node: { role: 'TO', handle: 'info@mabindus.com', displayName: null } },
    ],
  },
  ...overrides,
});

const loadWith = async (connections: Readonly<Record<string, unknown>>, limit = 25) => {
  let selection: Record<string, unknown> | undefined;
  const result = await loadEmailIntake({
    now: () => new Date('2026-08-24T10:00:00.000Z'),
    limit,
    client: {
      query: (nextSelection) => {
        selection = nextSelection;
        return Promise.resolve(connections);
      },
    },
  });
  return { result, selection };
};

test('surfaces review-only candidates from inbound synchronized email', async () => {
  const { result, selection } = await loadWith({
    messages: {
      pageInfo: { hasNextPage: false },
      edges: [
        {
          node: messageNode({
            id: 'msg-rfq',
            subject: 'RFQ for steel panels',
            text: 'Please quote.',
          }),
        },
        {
          node: messageNode({
            id: 'msg-invoice',
            subject: 'Invoice INV-0042',
            text: 'Due in 30 days.',
          }),
        },
      ],
    },
  });

  assert.deepEqual(
    result.candidates.map(({ messageId, proposedTaskType }) => ({
      messageId,
      proposedTaskType,
    })),
    [
      { messageId: 'msg-rfq', proposedTaskType: 'PREPARE_QUOTATION' },
      { messageId: 'msg-invoice', proposedTaskType: 'CAPTURE_INVOICE' },
    ],
  );
  assert.equal(
    result.candidates.every(({ reviewStatus }) => reviewStatus === 'PENDING_REVIEW'),
    true,
  );
  assert.equal(result.isPartial, false);
  assert.equal(result.asOf, '2026-08-24T10:00:00.000Z');
  assert.deepEqual(
    (selection?.messages as { __args: unknown }).__args,
    { first: 25 },
  );
});

test('excludes drafts and unrelated mail that produces no task proposal', async () => {
  const { result } = await loadWith({
    messages: {
      pageInfo: { hasNextPage: false },
      edges: [
        { node: messageNode({ id: 'draft', isDraft: true, subject: 'Invoice x' }) },
        { node: messageNode({ id: 'unrelated', subject: 'Lunch tomorrow?' }) },
        { node: messageNode({ id: 'po', subject: 'Purchase Order PO-88' }) },
      ],
    },
  });

  assert.deepEqual(
    result.candidates.map(({ messageId }) => messageId),
    ['po'],
  );
});

test('uses the FROM participant as the sender and tolerates a missing one', async () => {
  const { result } = await loadWith({
    messages: {
      pageInfo: { hasNextPage: false },
      edges: [
        {
          node: messageNode({
            id: 'no-from',
            subject: 'Quotation request',
            messageParticipants: {
              edges: [
                { node: { role: 'TO', handle: 'info@mabindus.com', displayName: null } },
              ],
            },
          }),
        },
      ],
    },
  });

  assert.equal(result.candidates[0]?.sender, '');
  assert.equal(result.candidates[0]?.proposedTaskType, 'PREPARE_QUOTATION');
});

test('sets isPartial when the message connection has another page', async () => {
  const { result } = await loadWith({
    messages: {
      pageInfo: { hasNextPage: true },
      edges: [{ node: messageNode({ id: 'po', subject: 'PO-1' }) }],
    },
  });
  assert.equal(result.isPartial, true);
});

test('rejects unbounded query limits at the boundary', async () => {
  await assert.rejects(
    loadEmailIntake({
      limit: 501,
      client: { query: () => Promise.resolve({}) },
    }),
    /integer from 1 to 500/,
  );
});

test('returns an empty candidate list when no messages are present', async () => {
  const { result } = await loadWith({});
  assert.deepEqual(result.candidates, []);
  assert.equal(result.isPartial, false);
});
