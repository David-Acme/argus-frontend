import { useCallback, useState } from 'react';
import type { ProximityMe } from '@/core/types';
import { proximityService } from '@/features/proximity/services/proximity.service';
import { beaconService } from '@/core/services/beacon';
import { MODULE_IDS, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toast } from '@/shared/libs/toast';
import { toastServiceError } from '@/shared/libs/service-error';

const load = () => proximityService.me();

export function useProximityEnabled(): boolean {
  const { moduleActive } = useCapabilities();
  return moduleActive(MODULE_IDS.surveillance);
}

export function useProximityMe() {
  const enabled = useProximityEnabled();
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const { data, status, mutate, reload } = useRemoteResource<ProximityMe>({
    cacheKey: VIEW_CACHE_KEYS.proximityMe,
    load,
    enabled,
  });

  const setBle = useCallback(
    async (value: boolean): Promise<boolean> => {
      if (value && !beaconService.permissionGranted() && !(await beaconService.requestPermission())) {
        toast.error(t('screens.proximity.ble.permission-denied'));
        return false;
      }
      let before: ProximityMe | null = null;
      mutate((previous) => {
        before = previous;
        return previous ? { ...previous, ble: { ...previous.ble, enabled: value } } : previous;
      });
      setPending(true);
      const result = await proximityService.setBle(value);
      setPending(false);
      if (!result.ok || !result.info) {
        mutate(() => before);
        toastServiceError(result.errors, t('screens.proximity.ble.save-failed'));
        return false;
      }
      const saved = result.info;
      mutate(() => saved);
      return true;
    },
    [mutate, t]
  );

  return { me: data, status, reload, setBle, pending, enabled };
}
