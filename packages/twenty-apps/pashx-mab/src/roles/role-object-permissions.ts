import { PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS } from 'pashx-mab-contract';
import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

const readOnly = {
  canReadObjectRecords: true,
  canUpdateObjectRecords: false,
  canSoftDeleteObjectRecords: false,
  canDestroyObjectRecords: false,
};

const readWrite = {
  ...readOnly,
  canUpdateObjectRecords: true,
};

const permission = (
  objectUniversalIdentifier: string,
  access: typeof readOnly,
) => ({ objectUniversalIdentifier, ...access });

export const PASHX_MAB_ROLE_OBJECT_PERMISSIONS = {
  admin: [
    ...Object.values(PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS).map((id) =>
      permission(id, readWrite),
    ),
    permission(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
      readOnly,
    ),
  ],
  operator: [
    permission(
      PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.procurementCase,
      readWrite,
    ),
    permission(
      PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.commercialDocument,
      readWrite,
    ),
    permission(PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.documentLine, readWrite),
    permission(PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.expense, readOnly),
    permission(
      PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.approvalRequest,
      readOnly,
    ),
    permission(
      PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.operationalInsight,
      readOnly,
    ),
    permission(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
      readOnly,
    ),
  ],
  finance: [
    permission(
      PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.procurementCase,
      readOnly,
    ),
    permission(
      PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.commercialDocument,
      readWrite,
    ),
    permission(PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.documentLine, readWrite),
    permission(PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.expense, readWrite),
    permission(
      PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.approvalRequest,
      readOnly,
    ),
    permission(
      PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS.operationalInsight,
      readOnly,
    ),
    permission(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
      readOnly,
    ),
  ],
  viewer: [
    ...Object.values(PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS).map((id) =>
      permission(id, readOnly),
    ),
    permission(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
      readOnly,
    ),
  ],
  evidenceAgent: [
    ...Object.values(PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS).map((id) =>
      permission(id, readOnly),
    ),
    permission(
      STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
      readOnly,
    ),
  ],
};
