import assert from 'node:assert/strict';
import test from 'node:test';

import { MAB_COMPANY_SOURCES, MAB_DOCUMENT_SOURCES } from '../src/metadata-import/mab-metadata-source';
import { planMabCompanyImport } from '../src/metadata-import/plan-company-import';

test('approved MI1 manifest contains companies and staged documents only', () => {
  assert.equal(MAB_COMPANY_SOURCES.length, 10);
  assert.equal(MAB_COMPANY_SOURCES.filter(({ roles }) => roles.includes('CUSTOMER')).length, 3);
  assert.equal(MAB_COMPANY_SOURCES.filter(({ roles }) => roles.includes('SUPPLIER')).length, 7);
  assert.equal(MAB_DOCUMENT_SOURCES.length, 24);
  assert.ok(MAB_COMPANY_SOURCES.every(({ commercialRegistrationNumber }) => commercialRegistrationNumber.length > 0));
});

test('plans creates when no authoritative identifier or ambiguous name exists', () => {
  const source = MAB_COMPANY_SOURCES[0];
  assert.ok(source);
  assert.equal(planMabCompanyImport([source], [])[0]?.action, 'CREATE');
});

test('matches repeated imports by stable source key and becomes a no-op', () => {
  const source = MAB_COMPANY_SOURCES[0];
  assert.ok(source);
  const result = planMabCompanyImport([source], [{ id: 'company-1', name: source.name, commercialRegistrationNumber: source.commercialRegistrationNumber, vatRegistrationNumber: source.vatRegistrationNumber, mabMetadataSourceKey: source.sourceKey, mabBusinessRoles: source.roles }])[0];
  assert.equal(result?.action, 'SKIP');
});

test('updates one verified CR match but never merges an unverified name match', () => {
  const source = MAB_COMPANY_SOURCES[0];
  assert.ok(source);
  const verified = planMabCompanyImport([source], [{ id: 'verified', name: 'Legacy spelling', commercialRegistrationNumber: source.commercialRegistrationNumber, vatRegistrationNumber: null, mabMetadataSourceKey: null, mabBusinessRoles: [] }])[0];
  assert.equal(verified?.action, 'UPDATE');
  const unverified = planMabCompanyImport([source], [{ id: 'name-only', name: source.name, commercialRegistrationNumber: null, vatRegistrationNumber: null, mabMetadataSourceKey: null, mabBusinessRoles: [] }])[0];
  assert.equal(unverified?.action, 'CONFLICT');
});

test('fails closed when identifiers point at more than one company', () => {
  const source = MAB_COMPANY_SOURCES[0];
  assert.ok(source);
  const result = planMabCompanyImport([source], [
    { id: 'by-cr', name: 'First', commercialRegistrationNumber: source.commercialRegistrationNumber, vatRegistrationNumber: null, mabMetadataSourceKey: null, mabBusinessRoles: [] },
    { id: 'by-source', name: 'Second', commercialRegistrationNumber: null, vatRegistrationNumber: null, mabMetadataSourceKey: source.sourceKey, mabBusinessRoles: [] },
  ])[0];
  assert.equal(result?.action, 'CONFLICT');
});
