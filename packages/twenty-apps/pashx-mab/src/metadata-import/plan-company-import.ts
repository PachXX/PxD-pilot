import type { MabCompanySource } from './mab-metadata-source';

export type ExistingMabCompany = Readonly<{
  id: string;
  name: string;
  commercialRegistrationNumber: string | null;
  vatRegistrationNumber: string | null;
  mabMetadataSourceKey: string | null;
  mabBusinessRoles: readonly string[];
}>;

export type MabCompanyImportPlanItem = Readonly<{
  source: MabCompanySource;
  action: 'CREATE' | 'UPDATE' | 'SKIP' | 'CONFLICT';
  existingId: string | null;
  reason: string;
}>;

const normalizeIdentifier = (value: string | null): string | null => {
  const normalized = value?.replace(/\D/g, '') ?? '';
  return normalized.length > 0 ? normalized : null;
};

const normalizeName = (value: string): string =>
  value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();

export const planMabCompanyImport = (
  sources: readonly MabCompanySource[],
  existingCompanies: readonly ExistingMabCompany[],
): readonly MabCompanyImportPlanItem[] =>
  sources.map((source) => {
    const sourceCr = normalizeIdentifier(source.commercialRegistrationNumber);
    const sourceVat = normalizeIdentifier(source.vatRegistrationNumber);
    const matches = existingCompanies.filter((existing) =>
      existing.mabMetadataSourceKey === source.sourceKey ||
      (sourceCr !== null && normalizeIdentifier(existing.commercialRegistrationNumber) === sourceCr) ||
      (sourceVat !== null && normalizeIdentifier(existing.vatRegistrationNumber) === sourceVat),
    );

    if (matches.length > 1) {
      return { source, action: 'CONFLICT', existingId: null, reason: 'Multiple records match source key, CR, or VAT.' };
    }

    const existing = matches[0];
    if (existing === undefined) {
      const sameName = existingCompanies.filter(
        (candidate) => normalizeName(candidate.name) === normalizeName(source.name),
      );
      return sameName.length === 0
        ? { source, action: 'CREATE', existingId: null, reason: 'No CR/VAT/source-key match.' }
        : { source, action: 'CONFLICT', existingId: sameName[0]?.id ?? null, reason: 'Name exists without a verified CR/VAT/source-key match.' };
    }

    const expectedRoles = [...source.roles].sort();
    const actualRoles = [...existing.mabBusinessRoles].sort();
    const isComplete =
      existing.mabMetadataSourceKey === source.sourceKey &&
      normalizeIdentifier(existing.commercialRegistrationNumber) === sourceCr &&
      normalizeIdentifier(existing.vatRegistrationNumber) === sourceVat &&
      JSON.stringify(actualRoles) === JSON.stringify(expectedRoles);

    return isComplete
      ? { source, action: 'SKIP', existingId: existing.id, reason: 'Authoritative identifiers and roles already match.' }
      : { source, action: 'UPDATE', existingId: existing.id, reason: 'Verified match is missing source metadata or roles.' };
  });
