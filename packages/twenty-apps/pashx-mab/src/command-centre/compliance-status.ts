export const isAcceptedComplianceException = (
  complianceStatus: string | null,
): boolean =>
  complianceStatus === 'REJECTED' || complianceStatus === 'RETRYABLE_FAILURE';
