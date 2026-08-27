import { type HostFetchFunction } from '@/types/HostFetchFunction';
import { type HostFetchMessage } from '@/types/HostFetchMessage';
import { type HostFetchResult } from '@/types/HostFetchResult';
import { rehydrateClonableError } from '@/utils/rehydrateClonableError';

type PendingRequest = {
  resolve: (result: HostFetchResult) => void;
  reject: (error: Error) => void;
};

export const createHostFetchFromMessagePort = (
  port: MessagePort,
): HostFetchFunction => {
  let nextRequestId = 0;
  const pendingRequests = new Map<number, PendingRequest>();

  port.addEventListener('message', (event: MessageEvent<unknown>) => {
    const message = event.data as Partial<HostFetchMessage>;

    if (
      (message.type !== 'success' && message.type !== 'failure') ||
      typeof message.id !== 'number'
    ) {
      return;
    }

    const pendingRequest = pendingRequests.get(message.id);

    if (pendingRequest === undefined) {
      return;
    }

    pendingRequests.delete(message.id);

    if (message.type === 'success') {
      const successMessage = message as Extract<
        HostFetchMessage,
        { type: 'success' }
      >;

      pendingRequest.resolve(successMessage.result);
    } else {
      const failureMessage = message as Extract<
        HostFetchMessage,
        { type: 'failure' }
      >;

      pendingRequest.reject(rehydrateClonableError(failureMessage.error));
    }
  });

  port.start();

  return (input) =>
    new Promise<HostFetchResult>((resolve, reject) => {
      const id = nextRequestId++;
      pendingRequests.set(id, { resolve, reject });
      port.postMessage({ type: 'request', id, input } satisfies HostFetchMessage);
    });
};
