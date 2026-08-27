type PashxUnexpectedErrorLog = Readonly<{
  message: string;
  stack?: string;
}>;

export const createPashxUnexpectedErrorLog = ({
  error,
  correlationId,
}: {
  error: unknown;
  correlationId: string;
}): PashxUnexpectedErrorLog => {
  if (!(error instanceof Error)) {
    return {
      message: `PashX Vendor PO command failed; correlationId=${correlationId}; errorType=unknown; errorMessage=Non-Error value thrown`,
    };
  }

  return {
    message: `PashX Vendor PO command failed; correlationId=${correlationId}; errorType=${error.name}; errorMessage=${error.message}`,
    ...(error.stack === undefined ? {} : { stack: error.stack }),
  };
};
