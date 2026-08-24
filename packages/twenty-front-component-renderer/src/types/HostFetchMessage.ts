import { type ClonableErrorPayload } from '@/types/ClonableErrorPayload';
import { type HostFetchInput } from '@/types/HostFetchInput';
import { type HostFetchResult } from '@/types/HostFetchResult';

export type HostFetchMessage =
  | { type: 'request'; id: number; input: HostFetchInput }
  | { type: 'success'; id: number; result: HostFetchResult }
  | { type: 'failure'; id: number; error: ClonableErrorPayload };
