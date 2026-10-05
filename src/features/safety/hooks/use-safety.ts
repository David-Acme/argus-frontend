import { useCallback } from 'react';
import { t } from '@/core/i18n';
import type { SafetyPins, SafetyStatus } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { confirm } from '@/shared/libs/confirm';
import { runServiceAction } from '@/shared/libs/service-action';
import { safetyService } from '@/features/safety/services/safety.service';

const load = () => safetyService.status();

export function useSafety() {
  const { data, mutate } = useRemoteResource<SafetyStatus>({ cacheKey: VIEW_CACHE_KEYS.safetyStatus, load });

  const settle = useCallback(
    (next: SafetyStatus | null | undefined) => {
      if (next) mutate(() => next);
      return next != null;
    },
    [mutate]
  );

  const setDuressEnabled = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (!enabled) {
        const accepted = await confirm({
          title: t('screens.safety.owner.off-title'),
          description: t('screens.safety.owner.off-description'),
          confirmLabel: t('screens.safety.owner.off-confirm'),
          intent: 'danger',
        });
        if (!accepted) return false;
      }
      const previous = data;
      mutate((current) => (current ? { ...current, duressEnabled: enabled } : current));
      const result = await runServiceAction({ call: () => safetyService.setDuressEnabled(enabled) });
      if (!result?.info) {
        mutate(() => previous);
        return false;
      }
      return settle(result.info);
    },
    [data, mutate, settle]
  );

  const savePins = useCallback(
    async (pins: SafetyPins): Promise<boolean> => {
      const result = await runServiceAction({
        call: () => safetyService.setPins(pins),
        success: t('screens.safety.pins.saved'),
      });
      return settle(result?.info);
    },
    [settle]
  );

  const removePins = useCallback(async (): Promise<boolean> => {
    const result = await runServiceAction({
      confirm: {
        title: t('screens.safety.pins.remove-title'),
        description: t('screens.safety.pins.remove-description'),
        confirmLabel: t('screens.safety.pins.remove'),
        intent: 'danger',
      },
      call: () => safetyService.removePins(),
    });
    return settle(result?.info);
  }, [settle]);

  return { status: data, setDuressEnabled, savePins, removePins };
}
