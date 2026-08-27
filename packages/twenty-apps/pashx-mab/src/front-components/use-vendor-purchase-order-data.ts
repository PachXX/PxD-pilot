import { useEffect, useState } from 'react';
import { CoreApiClient } from 'twenty-client-sdk/core';

export type PashxSupplier = Readonly<{ id: string; name: string }>;
type ProcurementCase = Readonly<{ id: string; aggregateVersion: number }>;
type QueryData = Readonly<{
  companies?: Readonly<{
    edges?: readonly Readonly<{ node: PashxSupplier }>[];
  }>;
  procurementCases?: Readonly<{
    edges?: readonly Readonly<{ node: ProcurementCase }>[];
  }>;
}>;

export const useVendorPurchaseOrderData = ({
  procurementCaseRecordId,
  loadError,
  selectionError,
}: {
  procurementCaseRecordId: string | undefined;
  loadError: string;
  selectionError: string;
}): Readonly<{
  companies: readonly PashxSupplier[];
  expectedVersion: number | undefined;
  loading: boolean;
  loadStatus: string;
}> => {
  const [companies, setCompanies] = useState<readonly PashxSupplier[]>([]);
  const [expectedVersion, setExpectedVersion] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [loadStatus, setLoadStatus] = useState('');

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (procurementCaseRecordId === undefined) {
        setLoadStatus(selectionError);
        setLoading(false);
        return;
      }

      try {
        const data = (await new CoreApiClient().query({
          companies: {
            __args: { first: 100, orderBy: { name: 'AscNullsLast' } },
            edges: { node: { id: true, name: true } },
          },
          procurementCases: {
            __args: {
              filter: { id: { eq: procurementCaseRecordId } },
              first: 1,
            },
            edges: { node: { id: true, aggregateVersion: true } },
          },
        })) as QueryData;
        const caseRecord = data.procurementCases?.edges?.[0]?.node;

        if (caseRecord === undefined) {
          throw new Error(loadError);
        }

        setCompanies(data.companies?.edges?.map(({ node }) => node) ?? []);
        setExpectedVersion(caseRecord.aggregateVersion);
      } catch {
        setLoadStatus(loadError);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [procurementCaseRecordId, loadError, selectionError]);

  return { companies, expectedVersion, loading, loadStatus };
};
