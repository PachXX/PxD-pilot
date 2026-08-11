import { QueryFailedError } from 'typeorm';

import { findConflictingRecord } from 'src/engine/api/graphql/workspace-query-runner/utils/find-conflicting-record.util';
import { handleDuplicateKeyError } from 'src/engine/api/graphql/workspace-query-runner/utils/handle-duplicate-key-error.util';
import { TwentyORMExceptionCode } from 'src/engine/twenty-orm/exceptions/twenty-orm.exception';

jest.mock(
  'src/engine/api/graphql/workspace-query-runner/utils/find-conflicting-record.util',
  () => ({ findConflictingRecord: jest.fn() }),
);

const findConflictingRecordMock = findConflictingRecord as jest.Mock;

describe('handleDuplicateKeyError', () => {
  it('preserves the sanitized conflicting field without retaining the conflicting value', async () => {
    const driverError = Object.assign(new Error('duplicate key'), {
      code: '23505',
      detail: 'Key (name)=(MAB-PO-2026-0001) already exists.',
    });
    const error = Object.assign(
      new QueryFailedError('INSERT INTO _commercialDocument', [], driverError),
      { detail: driverError.detail },
    );

    findConflictingRecordMock.mockResolvedValue(null);

    const result = await handleDuplicateKeyError(
      error,
      { nameSingular: 'commercialDocument' } as never,
      {} as never,
      {} as never,
    );

    expect(result.code).toBe(TwentyORMExceptionCode.DUPLICATE_ENTRY_DETECTED);
    expect(result.conflictingFieldName).toBe('name');
    expect(JSON.stringify(result)).not.toContain('MAB-PO-2026-0001');
  });
});
