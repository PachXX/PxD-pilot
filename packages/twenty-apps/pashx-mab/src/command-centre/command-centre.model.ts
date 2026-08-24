import {
  PASHX_COMMAND_CENTRE_SIGNALS,
  PASHX_OPERATIONAL_WORK_SIGNALS,
  type PashxCommandCentreItem,
  type PashxCommandCentreSignal,
  type PashxEvidenceInsight,
  type PashxOperationalCommandCentreResult,
  type PashxOperationalWorkItem,
  type PashxOperationalWorkSignal,
} from 'pashx-mab-contract';

export type CommandCentreGroup = Readonly<{
  signal: PashxCommandCentreSignal;
  items: readonly PashxCommandCentreItem[];
}>;

export type OperationalWorkGroup = Readonly<{
  signal: PashxOperationalWorkSignal;
  items: readonly PashxOperationalWorkItem[];
}>;

export type InsightSourceLink =
  | Readonly<{
      kind: 'link';
      objectName: string;
      recordId: string;
      href: string;
    }>
  | Readonly<{
      kind: 'plain';
      recordId: string;
    }>;

export const groupCommandCentreItems = (
  items: readonly PashxCommandCentreItem[],
): readonly CommandCentreGroup[] =>
  PASHX_COMMAND_CENTRE_SIGNALS.map((signal) => ({
    signal,
    items: items.filter((item) => item.signal === signal),
  }));

export const groupOperationalWorkItems = (
  items: readonly PashxOperationalWorkItem[],
): readonly OperationalWorkGroup[] =>
  PASHX_OPERATIONAL_WORK_SIGNALS.map((signal) => ({
    signal,
    items: items.filter((item) => item.signal === signal),
  }));

export const getCommandCentreRecordHref = (
  item: PashxCommandCentreItem,
): string => `/object/${item.recordType}/${item.recordId}`;

export const getOperationalWorkItemHref = (
  item: PashxOperationalWorkItem,
): string =>
  item.source === 'APPROVAL_REQUEST'
    ? `/object/approvalRequest/${item.item.id}`
    : getCommandCentreRecordHref(item.item);

export const getInsightRecordHref = (insight: PashxEvidenceInsight): string =>
  `/object/operationalInsight/${insight.id}`;

// Source IDs are stored without object types, so links resolve only against the
// loaded bounded records. Unresolvable IDs stay honest plain identifiers.
export const resolveInsightSourceLinks = (
  insight: PashxEvidenceInsight,
  result: PashxOperationalCommandCentreResult,
): readonly InsightSourceLink[] => {
  const objectNameByRecordId = new Map<string, string>();
  for (const item of result.commandItems) {
    objectNameByRecordId.set(item.procurementCaseId, 'procurementCase');
    objectNameByRecordId.set(item.recordId, item.recordType);
  }
  for (const approval of result.approvals) {
    objectNameByRecordId.set(approval.id, 'approvalRequest');
  }
  for (const storedInsight of result.insights) {
    objectNameByRecordId.set(storedInsight.id, 'operationalInsight');
  }

  // Deduplicate stored IDs so the display list produces stable unique keys.
  return [...new Set(insight.sourceRecordIds)].map(
    (recordId): InsightSourceLink => {
      const objectName = objectNameByRecordId.get(recordId);
      return objectName === undefined
        ? { kind: 'plain', recordId }
        : {
            kind: 'link',
            objectName,
            recordId,
            href: `/object/${objectName}/${recordId}`,
          };
    },
  );
};

export const formatCommandCentreDateTime = (
  value: string,
  locale: 'en' | 'ar',
): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Riyadh',
  }).format(date);
};
