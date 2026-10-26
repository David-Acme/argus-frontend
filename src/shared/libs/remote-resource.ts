import type { RemoteResourceStatus } from '@/shared/hooks/use-remote-resource';
import type { Resource, ResourceRetry } from '@/shared/ui/resource-view';

export type ResourceInput<T> = {
  data: T | null | undefined;
  status: RemoteResourceStatus;
  retry: ResourceRetry;
  empty?: (data: T) => boolean;
};

export function resourceOf<T>({ data, status, retry, empty }: ResourceInput<T>): Resource<T> {
  if (data != null) return empty?.(data) ? { status: 'empty' } : { status: 'ready', data };
  return status === 'failed' ? { status: 'failed', retry } : { status: 'loading' };
}
