import { createPashxUnexpectedErrorLog } from 'src/modules/pashx-mab/utils/pashx-unexpected-error-log.util';

describe('createPashxUnexpectedErrorLog', () => {
  it('records an unexpected error message and stack with its correlation id', () => {
    const error = new TypeError('createdByName is required');
    error.stack =
      'TypeError: createdByName is required\n    at persistence.ts:1:1';

    expect(
      createPashxUnexpectedErrorLog({
        error,
        correlationId: 'correlation-id',
      }),
    ).toEqual({
      message:
        'PashX Vendor PO command failed; correlationId=correlation-id; errorType=TypeError; errorMessage=createdByName is required',
      stack: error.stack,
    });
  });

  it('does not serialize a non-Error value that could contain request payload data', () => {
    const thrownValue = {
      request: { supplierRecordId: 'sensitive-supplier-id' },
      token: 'sensitive-token',
    };

    const log = createPashxUnexpectedErrorLog({
      error: thrownValue,
      correlationId: 'correlation-id',
    });

    expect(log).toEqual({
      message:
        'PashX Vendor PO command failed; correlationId=correlation-id; errorType=unknown; errorMessage=Non-Error value thrown',
    });
    expect(log.message).not.toContain('sensitive-supplier-id');
    expect(log.message).not.toContain('sensitive-token');
  });
});
