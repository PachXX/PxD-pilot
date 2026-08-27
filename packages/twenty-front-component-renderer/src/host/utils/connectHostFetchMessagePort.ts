import { type HostFetchFunction } from '@/types/HostFetchFunction';
import { type HostFetchMessage } from '@/types/HostFetchMessage';
import { buildClonableErrorPayload } from '@/utils/buildClonableErrorPayload';

export const connectHostFetchMessagePort = (
  port: MessagePort,
  hostFetch: HostFetchFunction,
): void => {
  port.addEventListener('message', async (event: MessageEvent<unknown>) => {
    const message = event.data as Partial<HostFetchMessage>;

    if (message.type !== 'request' || typeof message.id !== 'number') {
      return;
    }

    try {
      const result = await hostFetch(message.input!);
      port.postMessage({
        type: 'success',
        id: message.id,
        result,
      } satisfies HostFetchMessage);
    } catch (error) {
      port.postMessage({
        type: 'failure',
        id: message.id,
        error: buildClonableErrorPayload(error),
      } satisfies HostFetchMessage);
    }
  });

  port.start();
};
