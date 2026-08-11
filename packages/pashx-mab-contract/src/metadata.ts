export const PASHX_MAB_APPLICATION_UNIVERSAL_IDENTIFIER =
  '058263f0-1cc0-42e7-94a1-b4beb688e771';

export const PASHX_MAB_ROLE_UNIVERSAL_IDENTIFIERS = {
  admin: '7f8eadb1-18bc-438f-b0cf-e9f1793286c5',
  operator: 'f2966f18-5def-4986-be1b-ee3443ed3db5',
  finance: '74601e2d-91a9-4d56-9d11-9f73176c134e',
  viewer: 'b9e2245c-27fb-4ed3-9647-37dbee31b871',
} as const;

export const PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS = {
  procurementCase: '24c313db-2e6a-4e32-a884-a8d31cc324dc',
  commercialDocument: '731a652d-a4df-40b2-a276-4c32482201e2',
  documentLine: 'cfa4531b-3536-4816-a85e-b20803f35fbf',
  expense: '504791aa-c620-4e23-a40e-77d70f06269c',
} as const;

export const PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS = {
  procurementCase: 'b458d32e-9fbb-4c08-a3e0-8ddada18b82b',
  commercialDocument: '498ddb03-c711-43b7-8f43-87c0ebd1bf3e',
  documentLine: '00dfdab0-8f9a-4ce6-a9ff-56be2ef191c9',
  expense: 'da77a413-6641-49ff-82e5-44490c97d057',
} as const satisfies Record<PashxMabObjectName, string>;

export const PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS = {
  procurementCase: {
    aggregateVersion: '0bb64745-c4f8-42d7-8549-eab372a54917',
  },
  commercialDocument: {
    documentType: '6358e709-68e0-4201-a018-5280a56810da',
    lifecycleStatus: '6520f22a-c285-4696-b30b-4f1b5b920d50',
    aggregateVersion: 'e04f162c-4e4f-4555-ab49-8e184aefa218',
    procurementCaseRecordId: 'a2cd35f4-cdac-4d94-9209-395219e64f3c',
    supplierRecordId: '2bc7bacb-0154-4ca8-9efc-a6a79f13670f',
    issueDate: '0cad3e8a-2516-4fb4-8668-bf03539dddbb',
    currency: '6e5f46be-cd05-4968-b90a-96eb3d77de04',
  },
} as const;

export const PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS = {
  commercialDocument: {
    documentType: {
      vendorPurchaseOrder: '7b3a1a60-43a4-4e27-bd48-511c40bc5e08',
    },
    lifecycleStatus: {
      draft: 'a2c99ae4-a467-4c9f-b478-a197086987f3',
    },
  },
} as const;

export const PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS = {
  createVendorPurchaseOrder: '0ec28600-7d4c-4296-b9de-62bf21cce135',
} as const;

export const PASHX_MAB_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS = {
  createVendorPurchaseOrder: 'ab414759-26a9-4e8e-adcc-3bb05095b684',
} as const;

export type PashxMabObjectName =
  keyof typeof PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS;

export type PashxMabObjectUniversalIdentifier =
  (typeof PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS)[PashxMabObjectName];

export const PASHX_MAB_OBJECT_NAMES = Object.freeze(
  Object.keys(PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS) as PashxMabObjectName[],
);
