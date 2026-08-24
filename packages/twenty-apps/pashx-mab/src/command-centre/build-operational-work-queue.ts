import {
  PASHX_OPERATIONAL_WORK_SIGNALS,
  type PashxApprovalQueueItem,
  type PashxCommandCentreItem,
  type PashxOperationalWorkItem,
} from 'pashx-mab-contract';

const signalRank = new Map(
  PASHX_OPERATIONAL_WORK_SIGNALS.map((signal, index) => [signal, index]),
);

export const buildOperationalWorkQueue = ({
  commandItems,
  approvals,
}: Readonly<{
  commandItems: readonly PashxCommandCentreItem[];
  approvals: readonly PashxApprovalQueueItem[];
}>): readonly PashxOperationalWorkItem[] => {
  const work: PashxOperationalWorkItem[] = [
    ...commandItems.map(
      (item): PashxOperationalWorkItem => ({
        signal: item.signal,
        source: 'COMMAND_CENTRE',
        item,
      }),
    ),
    ...approvals
      .filter(({ status }) => status === 'PENDING')
      .map(
        (item): PashxOperationalWorkItem => ({
          signal: 'APPROVAL_REQUIRED',
          source: 'APPROVAL_REQUEST',
          item,
        }),
      ),
  ];

  return work.sort((left, right) => {
    const rankDifference =
      (signalRank.get(left.signal) ?? Number.MAX_SAFE_INTEGER) -
      (signalRank.get(right.signal) ?? Number.MAX_SAFE_INTEGER);
    if (rankDifference !== 0) return rankDifference;

    const leftTime =
      left.source === 'APPROVAL_REQUEST'
        ? left.item.requestedAt
        : left.item.actionDueAt ?? left.item.sourceUpdatedAt;
    const rightTime =
      right.source === 'APPROVAL_REQUEST'
        ? right.item.requestedAt
        : right.item.actionDueAt ?? right.item.sourceUpdatedAt;
    const timeDifference = leftTime.localeCompare(rightTime);
    if (timeDifference !== 0) return timeDifference;

    const leftId =
      left.source === 'APPROVAL_REQUEST' ? left.item.id : left.item.recordId;
    const rightId =
      right.source === 'APPROVAL_REQUEST' ? right.item.id : right.item.recordId;
    return leftId.localeCompare(rightId);
  });
};
