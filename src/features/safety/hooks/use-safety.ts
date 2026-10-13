import { useCallback } from 'react';
import { t } from '@/core/i18n';
import type { ResourceMatch, SafetyPins, SafetyStatus } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { confirm } from '@/shared/libs/confirm';
import { runServiceAction } from '@/shared/libs/service-action';
import { ENABLE_REACH_WARNING_COPY, enableReachWarning } from '@/features/safety/model/safety';
import { safetyService } from '@/features/safety/services/safety.service';
import { askCurrentPin } from '@/features/safety/stores/disarm-pin.store';

const load = () => safetyService.status();

const SAFETY_RESOURCES: readonly ResourceMatch[] = [
  { domain: 'guard', scope: 'safety_pin' },
  { domain: 'guard', scope: 'duress' },
];

const currentPinIfSet = async (required: boolean): Promise<string | null | undefined> =>
  required ? askCurrentPin() : undefined;

type UseSafetyOptions = {
  enabled?: boolean;
};

export function useSafety({ enabled = true }: UseSafetyOptions = {}) {
  const { data, mutate } = useRemoteResource<SafetyStatus>({
    cacheKey: VIEW_CACHE_KEYS.safetyStatus,
    load,
    enabled,
    resources: SAFETY_RESOURCES,
  });

  const settle = useCallback(
    (next: SafetyStatus | null | undefined) => {
      if (next) mutate(() => next);
      return next != null;
    },
    [mutate]
  );

  const setDuressEnabled = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      const warning = enabled ? enableReachWarning(data?.alertsReach ?? null) : null;
      if (warning) {
        const copy = ENABLE_REACH_WARNING_COPY[warning];
        const accepted = await confirm({
          title: t(copy.title),
          description: t(copy.description),
          confirmLabel: t('screens.safety.reach.enable-confirm'),
          intent: 'warning',
        });
        if (!accepted) return false;
      }
      if (!enabled) {
        const accepted = await confirm({
          title: t('screens.safety.owner.off-title'),
          description: t('screens.safety.owner.off-description'),
          confirmLabel: t('screens.safety.owner.off-confirm'),
          intent: 'danger',
        });
        if (!accepted) return false;
      }
      const currentPin = await currentPinIfSet(!enabled && data?.hasPin === true);
      if (currentPin === null) return false;
      const previous = data;
      mutate((current) => (current ? { ...current, duressEnabled: enabled } : current));
      const result = await runServiceAction({ call: () => safetyService.setDuressEnabled(enabled, currentPin) });
      if (!result?.info) {
        mutate(() => previous);
        return false;
      }
      return settle(result.info);
    },
    [data, mutate, settle]
  );

  const confirmCurrentPin = useCallback(
    (): Promise<string | null | undefined> => currentPinIfSet(data?.hasPin === true),
    [data?.hasPin]
  );

  const savePins = useCallback(
    async (pins: SafetyPins, currentPin?: string): Promise<boolean> => {
      const result = await runServiceAction({
        call: () => safetyService.setPins(pins, currentPin),
        success: t('screens.safety.pins.saved'),
      });
      return settle(result?.info);
    },
    [settle]
  );

  const removePins = useCallback(async (): Promise<boolean> => {
    const accepted = await confirm({
      title: t('screens.safety.pins.remove-title'),
      description: t('screens.safety.pins.remove-description'),
      confirmLabel: t('screens.safety.pins.remove'),
      intent: 'danger',
    });
    if (!accepted) return false;
    const currentPin = await currentPinIfSet(data?.hasPin === true);
    if (currentPin === null) return false;
    const result = await runServiceAction({ call: () => safetyService.removePins(currentPin) });
    return settle(result?.info);
  }, [data?.hasPin, settle]);

  const savePhrase = useCallback(
    async (phrase: string, currentPin?: string): Promise<boolean> => {
      const result = await runServiceAction({
        call: () => safetyService.setPhrase(phrase, currentPin),
        success: t('screens.safety.phrase.saved'),
      });
      return settle(result?.info);
    },
    [settle]
  );

  const clearPhrase = useCallback(async (): Promise<boolean> => {
    const accepted = await confirm({
      title: t('screens.safety.phrase.remove-title'),
      description: t('screens.safety.phrase.remove-description'),
      confirmLabel: t('screens.safety.phrase.remove'),
      intent: 'danger',
    });
    if (!accepted) return false;
    const currentPin = await currentPinIfSet(data?.hasPin === true);
    if (currentPin === null) return false;
    const result = await runServiceAction({
      call: () => safetyService.setPhrase(null, currentPin),
      success: t('screens.safety.phrase.removed'),
    });
    return settle(result?.info);
  }, [data?.hasPin, settle]);

  return {
    status: data,
    setDuressEnabled,
    confirmCurrentPin,
    savePins,
    removePins,
    savePhrase,
    clearPhrase,
  };
}
