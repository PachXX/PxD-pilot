import {
  PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS,
  PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'pashx-mab-contract';
import { defineObject, FieldType } from 'twenty-sdk/define';

export default defineObject({
  universalIdentifier: PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.procurementCase,
  nameSingular: 'procurementCase',
  namePlural: 'procurementCases',
  labelSingular: 'Procurement case',
  labelPlural: 'Procurement cases',
  description: 'The authoritative RFQ-to-margin transaction chain.',
  icon: 'IconBriefcase',
  labelIdentifierFieldMetadataUniversalIdentifier:
    PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS.procurementCase,
  fields: [
    {
      universalIdentifier:
        PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS.procurementCase,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Case name',
      description: 'Human-readable case reference.',
      icon: 'IconAbc',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.procurementCase.aggregateVersion,
      type: FieldType.NUMBER,
      name: 'aggregateVersion',
      label: 'Version',
      description: 'Optimistic-concurrency version maintained by PashX.',
      icon: 'IconVersions',
      defaultValue: 0,
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.procurementCase.customerRecordId,
      type: FieldType.UUID,
      name: 'customerRecordId',
      label: 'Customer ID',
      description: 'Twenty company record used as the customer.',
      icon: 'IconBuilding',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.procurementCase.projectName,
      type: FieldType.TEXT,
      name: 'projectName',
      label: 'Project',
      description: 'MAB project or cost-centre label.',
      icon: 'IconBuildingWarehouse',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.procurementCase.ownerRecordId,
      type: FieldType.UUID,
      name: 'ownerRecordId',
      label: 'Owner ID',
      description: 'Twenty workspace-member record responsible for this case.',
      icon: 'IconUser',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.procurementCase.stage,
      type: FieldType.SELECT,
      name: 'stage',
      label: 'Stage',
      description: 'Authoritative position in the procurement chain.',
      icon: 'IconProgress',
      options: [
        ['intake', 'INTAKE', 'Intake', 'gray'],
        ['sourcing', 'SOURCING', 'Sourcing', 'blue'],
        ['quoted', 'QUOTED', 'Quoted', 'cyan'],
        ['customerOrder', 'CUSTOMER_ORDER', 'Customer order', 'purple'],
        ['vendorOrder', 'VENDOR_ORDER', 'Vendor order', 'orange'],
        ['delivery', 'DELIVERY', 'Delivery', 'yellow'],
        ['invoicing', 'INVOICING', 'Invoicing', 'pink'],
        ['closed', 'CLOSED', 'Closed', 'green'],
        ['cancelled', 'CANCELLED', 'Cancelled', 'red'],
      ].map(([key, value, label, color], position) => ({
        id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.procurementCase.stage[
          key as keyof typeof PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.procurementCase.stage
        ],
        value,
        label,
        color,
        position,
      })),
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.procurementCase.nextActionCode,
      type: FieldType.SELECT,
      name: 'nextActionCode',
      label: 'Next action',
      description: 'Allowlisted next action maintained by the domain service.',
      icon: 'IconPlayerPlay',
      options: [
        ['reviewDraftDocument', 'REVIEW_DRAFT_DOCUMENT', 'Review draft document'],
        ['reviewPendingExpense', 'REVIEW_PENDING_EXPENSE', 'Review pending expense'],
        ['completeCaseData', 'COMPLETE_CASE_DATA', 'Complete case data'],
        ['completeDocumentData', 'COMPLETE_DOCUMENT_DATA', 'Complete document data'],
        [
          'resolveComplianceException',
          'RESOLVE_COMPLIANCE_EXCEPTION',
          'Resolve compliance exception',
        ],
      ].map(([key, value, label], position) => ({
        id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.procurementCase
          .nextActionCode[
          key as keyof typeof PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.procurementCase.nextActionCode
        ],
        value,
        label,
        color: 'blue',
        position,
      })),
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.procurementCase.actionDueAt,
      type: FieldType.DATE_TIME,
      name: 'actionDueAt',
      label: 'Action due at',
      description: 'Authoritative deadline for the current next action.',
      icon: 'IconCalendarDue',
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.procurementCase
          .blockedReasonCode,
      type: FieldType.SELECT,
      name: 'blockedReasonCode',
      label: 'Blocked reason',
      description: 'Recorded operational blocker that cannot be derived from validation.',
      icon: 'IconBarrierBlock',
      options: [
        ['awaitingCustomerInput', 'AWAITING_CUSTOMER_INPUT', 'Awaiting customer input'],
        [
          'awaitingSupplierResponse',
          'AWAITING_SUPPLIER_RESPONSE',
          'Awaiting supplier response',
        ],
        [
          'awaitingInternalDecision',
          'AWAITING_INTERNAL_DECISION',
          'Awaiting internal decision',
        ],
        ['externalDependency', 'EXTERNAL_DEPENDENCY', 'External dependency'],
      ].map(([key, value, label], position) => ({
        id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.procurementCase
          .blockedReasonCode[
          key as keyof typeof PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.procurementCase.blockedReasonCode
        ],
        value,
        label,
        color: 'orange',
        position,
      })),
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.procurementCase.deliveryStatus,
      type: FieldType.SELECT,
      name: 'deliveryStatus',
      label: 'Delivery status',
      description:
        'Delivery progress recorded by the delivery command; evidence is the finalized delivery note.',
      icon: 'IconTruckDelivery',
      defaultValue: `'NOT_STARTED'`,
      options: [
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.procurementCase
            .deliveryStatus.notStarted,
          value: 'NOT_STARTED',
          label: 'Not started',
          color: 'gray',
          position: 0,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.procurementCase
            .deliveryStatus.partial,
          value: 'PARTIAL',
          label: 'Partial',
          color: 'yellow',
          position: 1,
        },
        {
          id: PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS.procurementCase
            .deliveryStatus.full,
          value: 'FULL',
          label: 'Full',
          color: 'green',
          position: 2,
        },
      ],
    },
    {
      universalIdentifier:
        PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS.procurementCase.deliveryDueAt,
      type: FieldType.DATE_TIME,
      name: 'deliveryDueAt',
      label: 'Delivery due at',
      description: 'Agreed delivery deadline maintained by the delivery command.',
      icon: 'IconCalendarDue',
    },
  ],
});
