import { release, retain } from '@quilted/threads';
import { RemoteReceiver } from '@remote-dom/core/receivers';
import { useEffect, useRef } from 'react';
import { getURLSafely, isDefined } from 'twenty-shared/utils';

import { buildHostFetchPolicyFromFrontComponentUrls } from '@/host/utils/buildHostFetchPolicyFromFrontComponentUrls';
import { createFrontComponentHostThread } from '@/host/utils/createFrontComponentHostThread';
import { createHostFetchEnforcingPolicy } from '@/host/utils/createHostFetchEnforcingPolicy';
import { connectHostFetchMessagePort } from '@/host/utils/connectHostFetchMessagePort';
import { type GeometryTracker } from '@/host/types/GeometryTracker';
import { fetchComponentSource } from '@/host/utils/fetchComponentSource';
import { fetchSdkClientSources } from '@/host/utils/fetchSdkClientSources';
import { FRONT_COMPONENT_SANDBOX_DOCUMENT } from '@/remote/sandbox/generated/frontComponentSandboxDocument';
import { createFrontComponentSandboxIframe } from '@/remote/sandbox/utils/createFrontComponentSandboxIframe';
import { createFrontComponentSandboxMessageHandler } from '@/remote/sandbox/utils/createFrontComponentSandboxMessageHandler';
import { type FrontComponentThread } from '@/types/FrontComponentThread';
import { type SdkClientUrls } from '@/types/SdkClientUrls';
import { buildAuthorizationHeadersFromAccessToken } from '@/utils/buildAuthorizationHeadersFromAccessToken';
import { containsSdkClientImportSpecifier } from '@/utils/containsSdkClientImportSpecifier';

type FrontComponentWorkerEffectProps = {
  componentUrl: string;
  applicationAccessToken?: string;
  apiUrl?: string;
  functionsBaseUrl?: string;
  sdkClientUrls?: SdkClientUrls;
  applicationVariables?: Record<string, string>;
  geometryTracker: GeometryTracker;
  setReceiver: React.Dispatch<React.SetStateAction<RemoteReceiver | null>>;
  setThread: React.Dispatch<React.SetStateAction<FrontComponentThread | null>>;
  setError: React.Dispatch<React.SetStateAction<Error | null>>;
};

export const FrontComponentWorkerEffect = ({
  componentUrl,
  applicationAccessToken,
  apiUrl,
  functionsBaseUrl,
  sdkClientUrls,
  applicationVariables,
  geometryTracker,
  setReceiver,
  setThread,
  setError,
}: FrontComponentWorkerEffectProps) => {
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) {
      return;
    }

    const newReceiver = new RemoteReceiver({ retain, release });

    const sandboxIframe = createFrontComponentSandboxIframe(
      FRONT_COMPONENT_SANDBOX_DOCUMENT,
    );
    document.body.append(sandboxIframe);

    const channel = new MessageChannel();
    const hostFetchChannel = new MessageChannel();

    const hostFetchPolicy = buildHostFetchPolicyFromFrontComponentUrls({
      componentUrl,
      apiUrl,
      functionsBaseUrl,
      sdkClientUrls,
    });

    const hostFetch = createHostFetchEnforcingPolicy(hostFetchPolicy);

    connectHostFetchMessagePort(hostFetchChannel.port1, hostFetch);

    const thread = createFrontComponentHostThread({
      hostMessagePort: channel.port1,
      hostFetch,
      geometryTracker,
    });

    const handleSandboxMessage = createFrontComponentSandboxMessageHandler({
      sandboxIframe,
      workerMessagePort: channel.port2,
      workerHostFetchMessagePort: hostFetchChannel.port2,
      onSandboxError: setError,
    });

    window.addEventListener('message', handleSandboxMessage);

    setThread(thread);

    let isCancelled = false;

    const resolveComponentSourceAndRender = async () => {
      try {
        const authorizationHeaders = buildAuthorizationHeadersFromAccessToken(
          applicationAccessToken,
        );

        const componentSource = await fetchComponentSource({
          url: componentUrl,
          headers: authorizationHeaders,
        });

        if (isCancelled) {
          return;
        }

        const sdkClientSources =
          isDefined(sdkClientUrls) &&
          containsSdkClientImportSpecifier(componentSource)
            ? await fetchSdkClientSources({
                sdkClientUrls,
                headers: authorizationHeaders,
              })
            : undefined;

        if (isCancelled) {
          return;
        }

        await thread.imports.render(newReceiver.connection, {
          componentUrl,
          componentSource,
          applicationAccessToken,
          apiUrl,
          functionsBaseUrl,
          sdkClientSources,
          // API requests already carry the application bearer token and the server explicitly
          // allows the sandbox worker's opaque origin. Keep them on native worker fetch so a
          // write does not depend on a reverse call while the host is servicing remote UI work.
          // Component-storage and function origins remain behind the host policy below.
          hostFetchOrigins: hostFetchPolicy.allowedOrigins.filter(
            (origin) => origin !== getURLSafely(apiUrl ?? '')?.origin,
          ),
          applicationVariables,
          initialViewportGeometry: geometryTracker.getViewportGeometry(),
        });
      } catch (error) {
        if (!isCancelled) {
          setError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    };

    resolveComponentSourceAndRender();

    setReceiver(newReceiver);
    isInitializedRef.current = true;

    return () => {
      isCancelled = true;
      window.removeEventListener('message', handleSandboxMessage);
      setThread(null);
      channel.port1.close();
      hostFetchChannel.port1.close();
      sandboxIframe.remove();
      isInitializedRef.current = false;
    };
  }, [
    componentUrl,
    applicationAccessToken,
    apiUrl,
    functionsBaseUrl,
    sdkClientUrls,
    applicationVariables,
    geometryTracker,
    setError,
    setReceiver,
    setThread,
  ]);

  return null;
};
