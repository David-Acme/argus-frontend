import { useCallback } from 'react';
import type { CallPreferences, CallPreferencesPatch } from '@/core/types';
import { callPreferencesService } from '@/features/voice/services/call-preferences.service';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toastServiceError } from '@/shared/libs/service-error';

const load = () => callPreferencesService.read();

export function useCallPreferences() {
  const { t } = useTranslation();
  const { data, status, mutate, reload } = useRemoteResource<CallPreferences>({
    cacheKey: VIEW_CACHE_KEYS.callPreferences,
    load,
  });

  const update = useCallback(
    async (patch: CallPreferencesPatch) => {
      mutate((previous) => (previous ? { ...previous, ...patch } : previous));
      const result = await callPreferencesService.update(patch);
      if (!result.ok || !result.info) {
        toastServiceError(result.errors, t('screens.voice.preferences.save-failed'));
        void reload();
        return;
      }
      const saved = result.info;
      mutate(() => saved);
    },
    [mutate, reload, t]
  );

  return { preferences: data, status, update, reload };
}
