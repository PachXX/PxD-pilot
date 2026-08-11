export const PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS = {
  caseEdit: '1558bdbd-decc-42ba-90c5-91d1c17fa719',
  documentEdit: 'd15efa3b-872b-4c29-8906-9414e96d800e',
  procurementIssue: '48e88ff5-fdfa-46da-a72d-3f371198b2f5',
  deliveryRecord: 'a007f872-f7af-4838-8010-4308355e901c',
  financePost: 'f10dd5c0-b522-4e2b-bfa9-490eea7c2a20',
  pilotAdmin: 'cd920e7c-3e07-4ec1-8118-a6d06c6ecc19',
  importRun: '3c4635c3-601d-4dfd-9ab2-a317c9bb948a',
  complianceManage: 'e4be95f6-1e87-46e2-b031-0f9a8dade5ea',
} as const;

export const PASHX_MAB_CAPABILITIES = {
  caseEdit: 'pashx.case.edit',
  documentEdit: 'pashx.document.edit',
  procurementIssue: 'pashx.procurement.issue',
  deliveryRecord: 'pashx.delivery.record',
  financePost: 'pashx.finance.post',
  pilotAdmin: 'pashx.pilot.admin',
  importRun: 'pashx.import.run',
  complianceManage: 'pashx.compliance.manage',
} as const;

export type PashxMabCapabilityName = keyof typeof PASHX_MAB_CAPABILITIES;
export type PashxMabCapability =
  (typeof PASHX_MAB_CAPABILITIES)[PashxMabCapabilityName];

export const PASHX_MAB_CAPABILITY_NAMES = Object.freeze(
  Object.keys(PASHX_MAB_CAPABILITIES) as PashxMabCapabilityName[],
);

export const PASHX_MAB_ROLE_KEYS = [
  'admin',
  'operator',
  'finance',
  'viewer',
] as const;

export type PashxMabRoleKey = (typeof PASHX_MAB_ROLE_KEYS)[number];

export const PASHX_MAB_ROLE_CAPABILITIES = {
  admin: PASHX_MAB_CAPABILITY_NAMES.map(
    (name): PashxMabCapability => PASHX_MAB_CAPABILITIES[name],
  ),
  operator: [
    PASHX_MAB_CAPABILITIES.caseEdit,
    PASHX_MAB_CAPABILITIES.documentEdit,
    PASHX_MAB_CAPABILITIES.procurementIssue,
    PASHX_MAB_CAPABILITIES.deliveryRecord,
  ],
  finance: [
    PASHX_MAB_CAPABILITIES.documentEdit,
    PASHX_MAB_CAPABILITIES.financePost,
    PASHX_MAB_CAPABILITIES.complianceManage,
  ],
  viewer: [],
} as const satisfies Record<PashxMabRoleKey, readonly PashxMabCapability[]>;

const capabilityUniversalIdentifierByValue = Object.fromEntries(
  PASHX_MAB_CAPABILITY_NAMES.map((name) => [
    PASHX_MAB_CAPABILITIES[name],
    PASHX_MAB_CAPABILITY_UNIVERSAL_IDENTIFIERS[name],
  ]),
) as Record<PashxMabCapability, string>;

const getCapabilityUniversalIdentifiers = (role: PashxMabRoleKey) =>
  PASHX_MAB_ROLE_CAPABILITIES[role].map(
    (capability) => capabilityUniversalIdentifierByValue[capability],
  );

export const PASHX_MAB_ROLE_CAPABILITY_UNIVERSAL_IDENTIFIERS = Object.freeze({
  admin: getCapabilityUniversalIdentifiers('admin'),
  operator: getCapabilityUniversalIdentifiers('operator'),
  finance: getCapabilityUniversalIdentifiers('finance'),
  viewer: getCapabilityUniversalIdentifiers('viewer'),
} satisfies Record<PashxMabRoleKey, readonly string[]>);

const pashxMabCapabilitySet = new Set<PashxMabCapability>(
  Object.values(PASHX_MAB_CAPABILITIES),
);

export const isPashxMabCapability = (
  value: string,
): value is PashxMabCapability =>
  pashxMabCapabilitySet.has(value as PashxMabCapability);
