import { isNonEmptyString } from '@sniptt/guards';
import { CustomError, getURLSafely, isDefined } from 'twenty-shared/utils';

import { resolveHostFetchRedirectMode } from '@/host/utils/resolveHostFetchRedirectMode';
import { serializeResponseToHostFetchResult } from '@/host/utils/serializeResponseToHostFetchResult';
import { type HostFetchFunction } from '@/types/HostFetchFunction';
import { type HostFetchInput } from '@/types/HostFetchInput';
import { type HostFetchPolicy } from '@/types/HostFetchPolicy';
import { type HostFetchResult } from '@/types/HostFetchResult';

export const createHostFetchEnforcingPolicy = (
  hostFetchPolicy: HostFetchPolicy,
  options?: { timeoutMs?: number },
): HostFetchFunction => {
  const allowedOriginSet = new Set(hostFetchPolicy.allowedOrigins);
  const fileStorageRedirectableUrlSet = new Set(
    hostFetchPolicy.fileStorageRedirectableUrls,
  );

  return async (input: HostFetchInput): Promise<HostFetchResult> => {
    const requestOrigin = getURLSafely(input.url)?.origin;

    if (!isDefined(requestOrigin) || !allowedOriginSet.has(requestOrigin)) {
      throw new CustomError(
        `Front component host fetch blocked for disallowed origin: ${input.url}`,
        'FRONT_COMPONENT_HOST_FETCH_BLOCKED_ORIGIN',
      );
    }

    const requestMethod = isNonEmptyString(input.method)
      ? input.method.toUpperCase()
      : 'GET';

    const abortController = new AbortController();
    const timeoutMs = options?.timeoutMs ?? 30_000;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;

    try {
      const request = fetch(input.url, {
        method: requestMethod,
        headers: input.headers,
        body: input.body,
        credentials: 'omit',
        redirect: resolveHostFetchRedirectMode(
          requestMethod,
          input.url,
          fileStorageRedirectableUrlSet,
        ),
        signal: abortController.signal,
      });
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = globalThis.setTimeout(() => {
          abortController.abort();
          reject(
            new CustomError(
              `Front component host fetch timed out after ${timeoutMs} ms`,
              'FRONT_COMPONENT_HOST_FETCH_TIMEOUT',
            ),
          );
        }, timeoutMs);
      });
      const response = await Promise.race([request, timeout]);

      return serializeResponseToHostFetchResult(response);
    } finally {
      if (isDefined(timeoutId)) {
        globalThis.clearTimeout(timeoutId);
      }
    }
  };
};
