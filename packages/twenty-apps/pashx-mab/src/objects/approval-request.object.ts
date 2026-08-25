import {
  PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { defineObject, FieldType } from 'twenty-sdk/define';

export default defineObject({
  universalIdentifier: PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.approvalRequest,
  nameSingular: 'approvalRequest',
  namePlural: 'approvalRequests',
  labelSingular: 'Approval request',
  labelPlural: 'Approval requests',
  description: 'Audited human decision gate for a proposed MAB action.',
  icon: 'IconStamp',
  labelIdentifierFieldMetadataUniversalIdentifier:
    PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS.approvalRequest,
  fields: [
    {
      universalIdentifier:
        PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS.approvalRequest,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Approval',
      description: 'Human-readable approval request.',
      icon: 'IconAbc',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.approvalRequest.status,
      type: FieldType.SELECT,
      name: 'status',
      label: 'Status',
      description: 'Human decision state.',
      icon: 'IconProgress',
      defaultValue: `'PENDING'`,
      options: ([
        ['pending', 'PENDING', 'Pending', 'yellow'],
        ['approved', 'APPROVED', 'Approved', 'green'],
        ['rejected', 'REJECTED', 'Rejected', 'red'],
        ['cancelled', 'CANCELLED', 'Cancelled', 'gray'],
      ] as const).map(([key, value, label, color], position) => ({
        id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.approvalRequest.status[
          key as keyof typeof PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.approvalRequest.status
        ],
        value,
        label,
        color,
        position,
      })),
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.approvalRequest
          .requestedActionCode,
      type: FieldType.TEXT,
      name: 'requestedActionCode',
      label: 'Requested action',
      description: 'Allowlisted domain action awaiting approval.',
      icon: 'IconPlayerPlay',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.approvalRequest.payloadDigest,
      type: FieldType.TEXT,
      name: 'payloadDigest',
      label: 'Payload digest',
      description: 'Immutable digest of the proposed action payload.',
      icon: 'IconFingerprint',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.approvalRequest.sourceRecordIds,
      type: FieldType.RAW_JSON,
      name: 'sourceRecordIds',
      label: 'Source record IDs',
      description: 'Evidence record identifiers for this decision.',
      icon: 'IconListDetails',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.approvalRequest.requesterRecordId,
      type: FieldType.UUID,
      name: 'requesterRecordId',
      label: 'Requester ID',
      description: 'Workspace member who requested the action.',
      icon: 'IconUser',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.approvalRequest.approverRecordId,
      type: FieldType.UUID,
      name: 'approverRecordId',
      label: 'Approver ID',
      description: 'Assigned human approver.',
      icon: 'IconUserCheck',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.approvalRequest.requestedAt,
      type: FieldType.DATE_TIME,
      name: 'requestedAt',
      label: 'Requested at',
      description: 'Time the approval was requested.',
      icon: 'IconCalendarTime',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.approvalRequest.decidedAt,
      type: FieldType.DATE_TIME,
      name: 'decidedAt',
      label: 'Decided at',
      description: 'Time a human made the decision.',
      icon: 'IconCalendarCheck',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.approvalRequest
          .decisionActorRecordId,
      type: FieldType.UUID,
      name: 'decisionActorRecordId',
      label: 'Decision actor ID',
      description: 'Workspace member accountable for the latest decision.',
      icon: 'IconUserCheck',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.approvalRequest.decisionNote,
      type: FieldType.TEXT,
      name: 'decisionNote',
      label: 'Decision note',
      description: 'Human rationale for approve, reject, or cancel.',
      icon: 'IconNote',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.approvalRequest.auditEventId,
      type: FieldType.UUID,
      name: 'auditEventId',
      label: 'Latest audit event ID',
      description: 'Immutable audit event for the latest approval transition.',
      icon: 'IconHistory',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.approvalRequest.idempotencyKey,
      type: FieldType.TEXT,
      name: 'idempotencyKey',
      label: 'Idempotency key',
      description: 'Stable key preventing duplicate approval requests.',
      icon: 'IconKey',
      isUnique: true,
    },
  ],
});
