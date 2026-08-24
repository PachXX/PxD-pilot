export const PASHX_MAB_APPLICATION_UNIVERSAL_IDENTIFIER =
  '058263f0-1cc0-42e7-94a1-b4beb688e771';

export const PASHX_MAB_ROLE_UNIVERSAL_IDENTIFIERS = {
  admin: '7f8eadb1-18bc-438f-b0cf-e9f1793286c5',
  operator: 'f2966f18-5def-4986-be1b-ee3443ed3db5',
  finance: '74601e2d-91a9-4d56-9d11-9f73176c134e',
  viewer: 'b9e2245c-27fb-4ed3-9647-37dbee31b871',
  evidenceAgent: '084b5f16-b6a8-45f7-81e6-997599bcf22c',
} as const;

export const PASHX_MAB_AGENT_UNIVERSAL_IDENTIFIERS = {
  evidenceAnalyst: '1c16737f-83e5-4ba9-90fa-443346fd1d47',
  procurementTriage: 'a1fad882-cb41-47a3-a0f3-315adc4480c9',
} as const;

export const PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS = {
  procurementCase: '24c313db-2e6a-4e32-a884-a8d31cc324dc',
  commercialDocument: '731a652d-a4df-40b2-a276-4c32482201e2',
  documentLine: 'cfa4531b-3536-4816-a85e-b20803f35fbf',
  expense: '504791aa-c620-4e23-a40e-77d70f06269c',
  approvalRequest: '8b99a415-4af6-4f52-997c-26c7b47485a2',
  operationalInsight: '4b3383ff-7b9d-4ba2-9c03-234046b32207',
} as const;

export const PASHX_MAB_LABEL_FIELD_UNIVERSAL_IDENTIFIERS = {
  procurementCase: 'b458d32e-9fbb-4c08-a3e0-8ddada18b82b',
  commercialDocument: '498ddb03-c711-43b7-8f43-87c0ebd1bf3e',
  documentLine: '00dfdab0-8f9a-4ce6-a9ff-56be2ef191c9',
  expense: 'da77a413-6641-49ff-82e5-44490c97d057',
  approvalRequest: '2cf7fec1-f39d-40c8-8a52-e3327516b851',
  operationalInsight: 'de5e9b26-0243-4133-b27e-72c0e25a6e33',
} as const satisfies Record<PashxMabObjectName, string>;

export const PASHX_MAB_FIELD_UNIVERSAL_IDENTIFIERS = {
  company: {
    commercialRegistrationNumber: 'b7f169d6-3f1d-4085-937e-91d9a69820ec',
    vatRegistrationNumber: '0a090827-70b6-4e38-aeab-f560d9d28bbc',
    mabBusinessRoles: 'b1e3142f-36c6-4211-b6dc-0325ead41682',
    mabMetadataSourceKey: '0113bced-e441-47ef-a7b4-8f26a12eefaf',
  },
  approvalRequest: {
    status: '21256ed6-562a-4c93-a575-6609f50b1a64',
    requestedActionCode: 'a5c470f1-59cf-4a3a-8de7-34110c7c739a',
    payloadDigest: '4eee346b-6850-4fa3-8488-5da8f6527f0c',
    sourceRecordIds: '3ebe3d4a-927a-4704-adda-028999831a61',
    requesterRecordId: '8bc9d9b2-0762-43b4-ab18-36a21777cbc8',
    approverRecordId: 'e140fe9d-600b-42ef-821f-2f4069d6b8c6',
    requestedAt: 'c99fc01f-1c08-4977-9624-bc2e3e008341',
    decidedAt: 'd277b633-3f3a-411b-a7af-659dba4aa788',
    decisionActorRecordId: 'ec08d88b-5f22-42ff-b1d1-b31e062e1dd9',
    decisionNote: '170fcb7e-10d5-40bf-913e-b2a526195e5f',
    auditEventId: 'b5756557-6c81-41d1-a651-764e1686121a',
    idempotencyKey: 'b760717a-043e-4e88-8d7e-b884694dcc62',
  },
  operationalInsight: {
    insightType: '5e61c15c-21c0-401c-aae4-4e937d84d0f1',
    lifecycleStatus: 'fb6d1e3f-b034-41d8-8f2d-90a0deac037d',
    narrative: '0e797907-43db-459d-9c8b-f8d2dbf94f18',
    sourceRecordIds: '10a38ba0-ec3e-4868-aed2-f46058a279d5',
    generatorVersion: 'e4b7070c-817e-4313-8db1-c19e4567b234',
    generatedAt: 'a3d8164d-1503-4aa4-b4cf-5dd3109bc902',
    confidence: 'cdfbf360-ebee-418c-bb8b-a1b8f1f8170e',
  },
  procurementCase: {
    aggregateVersion: '0bb64745-c4f8-42d7-8549-eab372a54917',
    customerRecordId: '0bd916b6-4253-4991-b1e9-53b414e25479',
    projectName: '3a1b97c5-c4d0-4541-bfc4-cf203b743b86',
    ownerRecordId: '10ffff0c-8ae8-4799-aaf5-777caa985a84',
    stage: '41fe396d-2815-4da7-ac1c-0e5bc64b4e57',
    nextActionCode: '6af335e9-22a0-42a7-a554-2af443730306',
    actionDueAt: 'a4058383-7150-472d-9b79-1505491c2d50',
    blockedReasonCode: '10cd7e7d-08fb-4d45-81ff-e446c8273e3e',
    deliveryStatus: 'd0b2a56c-9f51-4a3f-b6c7-2f1c64a8d3e2',
    deliveryDueAt: 'e7a1f30d-5c24-4b77-9d58-8a2b1e6c4f09',
  },
  commercialDocument: {
    documentType: '6358e709-68e0-4201-a018-5280a56810da',
    lifecycleStatus: '6520f22a-c285-4696-b30b-4f1b5b920d50',
    aggregateVersion: 'e04f162c-4e4f-4555-ab49-8e184aefa218',
    procurementCaseRecordId: 'a2cd35f4-cdac-4d94-9209-395219e64f3c',
    supplierRecordId: '2bc7bacb-0154-4ca8-9efc-a6a79f13670f',
    issueDate: '0cad3e8a-2516-4fb4-8668-bf03539dddbb',
    currency: '6e5f46be-cd05-4968-b90a-96eb3d77de04',
    totalAmount: '2163b287-a6f8-4926-ba6b-0ac2b3504a45',
    complianceStatus: '5325c958-afdb-44d8-a82f-eefe0478d5df',
  },
  expense: {
    amount: '14a73261-5a3b-4266-a976-d627e302e695',
    approvalStatus: '30ff7914-6850-44f4-b570-aafc26319bc6',
    procurementCaseRecordId: 'a293ff99-b031-453c-a4f2-2140f67eb950',
    incurredDate: 'b4a60420-8ef5-4dfc-bba2-2e3fba6a07e7',
  },
} as const;

export const PASHX_MAB_FIELD_OPTION_UNIVERSAL_IDENTIFIERS = {
  company: {
    mabBusinessRoles: {
      customer: '3e0773f5-f7b0-4140-a784-5595f463a500',
      supplier: '3b3b0d79-68dd-4f72-ba05-7d2f236479f7',
    },
  },
  approvalRequest: {
    status: {
      pending: '11009ee3-2212-471d-9643-8a8f18defaa7',
      approved: 'aa5c5456-e2d1-4948-88d0-426b84350313',
      rejected: 'd5915320-61de-4b6f-aad1-47f18917e1e0',
      cancelled: '1518a050-2ac4-48f5-98f5-2fb0c81490d4',
    },
  },
  operationalInsight: {
    insightType: {
      observation: '7a3aa5c8-eeb2-43c0-ab3a-4b5e5bf4f0e6',
      suggestion: 'eef7383e-7613-48ad-a01f-2b6dce0ddaee',
      dataQuality: 'bce2270b-b9e6-4eca-a44a-0783aa432a3e',
    },
  },
  procurementCase: {
    stage: {
      intake: 'd22713e8-fdac-49c5-9002-283d5463a813',
      sourcing: 'ff2d0463-c328-4419-acf1-33e2d97f0e83',
      quoted: 'a6af5289-96bb-46bd-b40b-cc17375aaf7b',
      customerOrder: '2eb3abcc-ea50-4b49-a136-d821b40d6913',
      vendorOrder: '07da8345-23fc-433f-9e2c-ba895792ed35',
      delivery: '2e1ef13c-5cc6-4d8b-a15c-2ec2585519f5',
      invoicing: '6348a2da-70e9-4f87-8a59-8b95bac452ed',
      closed: 'a6f681fb-3089-406b-bda7-6bdda8e83450',
      cancelled: '9e0a7549-35a0-49bd-87b2-f2b9a8ec6af0',
    },
    nextActionCode: {
      reviewDraftDocument: '838b88db-49f9-4877-bc7f-d0af5a8a93e4',
      reviewPendingExpense: '97d0b0b3-2bc3-44dd-b78f-ecbb3c366135',
      completeCaseData: '2efe4f54-a216-4b8d-85ac-5baf8abd576b',
      completeDocumentData: '029ea75f-3221-48d1-81c5-49251572e431',
      resolveComplianceException: '26089f7f-a11d-4f56-b34b-290b410dcfe3',
    },
    blockedReasonCode: {
      awaitingCustomerInput: 'f3f887f4-cb3f-43ec-a4c7-3fb1484da482',
      awaitingSupplierResponse: '252fcfec-b8be-4279-a9cb-91ce8fcd7cf6',
      awaitingInternalDecision: 'fb19ad99-0610-41dc-b642-f0ef52e3c9af',
      externalDependency: '632d3635-eba9-4e99-9bb9-a08bfa28aa83',
    },
    deliveryStatus: {
      notStarted: 'c1e8b2a4-7f60-4d2e-9a35-3e7b0d5f1c46',
      partial: 'a94f3d71-6c85-4a1e-b2d4-5f8c1e7a0b93',
      full: '8b2c6e50-4d91-4f3a-a7b8-1e6d9c2f5a74',
    },
  },
  commercialDocument: {
    documentType: {
      customerRfq: '7f00d684-e588-46ac-9d46-bd7952d2be5d',
      supplierRfq: 'afde2c55-fe52-4fc9-8f77-c84cefea3bfe',
      vendorQuote: '978945af-0859-444d-bedb-9b0f5a196ae0',
      customerQuote: '6f44519e-dec2-43c6-be0a-14ff13e4d48a',
      customerPurchaseOrder: 'a56c673a-4d76-4c6b-946d-6b2b7b21ea7a',
      vendorPurchaseOrder: '7b3a1a60-43a4-4e27-bd48-511c40bc5e08',
      deliveryNote: '8242001d-1a51-443b-8a70-d533cc7b1576',
      vendorInvoice: '27d47f26-245b-4b70-a9e6-38126de1bcd8',
      customerInvoice: '69261c93-2f10-467b-932b-38b02ae2570f',
      customerCreditNote: '742bdbd1-a7c4-4464-9756-49ebc01fdeff',
      vendorCreditNote: '0a47c04c-951c-40fc-a090-014aa9c9e6c4',
    },
    lifecycleStatus: {
      draft: 'a2c99ae4-a467-4c9f-b478-a197086987f3',
      finalized: '5c142dfc-cd10-420f-89f5-f554ba27e1f7',
      cancelled: 'f8ab303e-f31d-4706-a42c-4b3a1943b800',
      credited: '208bc4da-90d6-4c4d-bfc4-86580850abd8',
    },
    complianceStatus: {
      notRequired: '6c5469ce-1a23-4537-a652-01024697cb1e',
      pending: '618a7a9a-7dc0-4549-9eec-c01d2ae479b7',
      cleared: '7fc9d218-d067-4fa1-b5a9-35e1f75817ef',
      rejected: '9a82eb0e-22e8-43f3-8b0f-15603ce938c1',
    },
  },
  expense: {
    approvalStatus: {
      pending: 'cb48ec45-4296-4c48-93ed-1054081a66fd',
      approved: 'bf09e50f-eb16-408c-bf1d-a355afc6431a',
      rejected: 'c8a1924a-41e0-45fb-927f-c07dfa37508a',
    },
  },
} as const;

export const PASHX_MAB_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS = {
  createVendorPurchaseOrder: '0ec28600-7d4c-4296-b9de-62bf21cce135',
  operationalProfitabilityDashboard: '1e81794c-ebfb-42ce-9e5f-d8e07b9936c2',
  commandCentre: '89ae99fe-2032-461b-90b0-d263c64f7617',
  caseWorkflow: 'f3b8c1d5-4a2e-4f9c-9d7a-2c5e6f8a1b3d',
} as const;

export const PASHX_MAB_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS = {
  createVendorPurchaseOrder: 'ab414759-26a9-4e8e-adcc-3bb05095b684',
} as const;

export const PASHX_MAB_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS = {
  commandCentre: '52f71f82-28a2-4ecf-b444-74685868684b',
  commandCentreQueueTab: 'e2bc827a-c485-46c3-9b99-64c34cbf9c8c',
  commandCentreQueueWidget: '882d2e76-af0f-4660-a76c-4e3e28b201c9',
  operationalProfitability: 'daf057bd-668a-4c8d-8c49-f5cff3b2b208',
  operationalProfitabilityOverviewTab: 'c45fdda8-5de5-46de-a81a-fb7a184e4de2',
  operationalProfitabilityDashboardWidget:
    '54b0fb43-e678-4dc8-a0dd-2adc062fda26',
  caseWorkflow: '9c4d2e7f-1b5a-4e6d-8c3f-7a2b5d4e6f18',
  caseWorkflowOverviewTab: 'a7e3f5c2-6d8b-4f1a-9e4d-3c6b8a2f5d17',
  caseWorkflowWidget: 'b5d8f4e1-8c2a-4b7d-9f3e-5a1c6d9b2e47',
} as const;

export const PASHX_MAB_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS = {
  commandCentre: 'c18efee1-b333-4382-a7ba-22349d95c654',
  operationalProfitability: 'ee29da14-bc1c-4a5f-a630-bb243f10a307',
  caseWorkflow: 'd4f7a1c8-3b6e-4d2a-8f5c-1e9b7c3a6d24',
} as const;

export type PashxMabObjectName =
  keyof typeof PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS;

export type PashxMabObjectUniversalIdentifier =
  (typeof PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS)[PashxMabObjectName];

export const PASHX_MAB_OBJECT_NAMES = Object.freeze(
  Object.keys(PASHX_MAB_OBJECT_UNIVERSAL_IDENTIFIERS) as PashxMabObjectName[],
);
