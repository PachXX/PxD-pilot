import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const readSource = (relativePath: string): string =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const unwantedFieldTokens = [
  'address',
  'lastContactDate',
  'lastContactItem',
  'accountOwner',
];

test('customer and supplier views contain only MAB business identity columns', () => {
  for (const source of [
    readSource('../src/views/mab-customers.view.ts'),
    readSource('../src/views/mab-suppliers.view.ts'),
  ]) {
    assert.match(source, /companyFields\.name\.universalIdentifier/);
    assert.match(source, /mabCompanyFields\.mabBusinessRoles/);
    assert.match(source, /mabCompanyFields\.commercialRegistrationNumber/);
    assert.match(source, /mabCompanyFields\.vatRegistrationNumber/);
    for (const unwantedFieldToken of unwantedFieldTokens) {
      assert.doesNotMatch(source, new RegExp(unwantedFieldToken));
    }
  }
});

test('MAB company record page excludes generic CRM contact and owner fields', () => {
  const fieldsSource = readSource(
    '../src/views/mab-company-record-page-fields.view.ts',
  );
  const layoutSource = readSource(
    '../src/page-layouts/mab-company.page-layout.ts',
  );

  assert.match(fieldsSource, /mabCompanyFields\.mabBusinessRoles/);
  assert.match(fieldsSource, /mabCompanyFields\.commercialRegistrationNumber/);
  assert.match(fieldsSource, /mabCompanyFields\.vatRegistrationNumber/);
  for (const unwantedFieldToken of unwantedFieldTokens) {
    assert.doesNotMatch(fieldsSource, new RegExp(unwantedFieldToken));
  }
  assert.match(layoutSource, /type: 'RECORD_PAGE'/);
  assert.match(layoutSource, /configurationType: 'FIELDS'/);
});
