import type { SafetyStatus } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { SAFETY_RESOURCES } from '@/features/safety/model/safety';
import { safetyService } from '@/features/safety/services/safety.service';

const load = () => safetyService.status();

export function useAppSirenEnabled(): boolean | undefined {
  const { data } = useRemoteResource<SafetyStatus>({
    cacheKey: VIEW_CACHE_KEYS.safetyStatus,
    load,
    resources: SAFETY_RESOURCES,
  });
  return data?.appSirenEnabled;
}
