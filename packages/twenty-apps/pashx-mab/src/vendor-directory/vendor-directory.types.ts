import type { PashxProcurementCaseStage } from 'pashx-mab-contract';

export type VendorDirectoryVendorRecord = Readonly<{
  id: string;
  name: string;
  vendorId: string | null;
  commercialRegistrationNumber: string | null;
  vatRegistrationNumber: string | null;
}>;

export type VendorDirectoryCaseRecord = Readonly<{
  id: string;
  name: string;
  stage: PashxProcurementCaseStage | null;
  aggregateVersion: number;
}>;

export type VendorDirectoryDocumentRecord = Readonly<{
  id: string;
  name: string;
  procurementCaseRecordId: string;
  documentType: string | null;
  lifecycleStatus: string | null;
  supplierRecordId: string | null;
}>;

export type VendorDirectoryResult = Readonly<{
  vendors: readonly VendorDirectoryVendorRecord[];
  cases: readonly VendorDirectoryCaseRecord[];
  documents: readonly VendorDirectoryDocumentRecord[];
  isPartial: boolean;
  asOf: string;
}>;

export type VendorDirectoryRow = Readonly<{
  vendor: VendorDirectoryVendorRecord;
  openSupplierRfqCount: number;
  finalizedSupplierRfqCount: number;
  vendorQuoteCount: number;
  activeCaseNames: readonly string[];
}>;

export type RfqEligibleCase = Readonly<{
  id: string;
  name: string;
  stage: PashxProcurementCaseStage;
  aggregateVersion: number;
}>;
