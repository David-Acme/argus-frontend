import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { settingsService } from '@/core/services/settings.service';
import { viewCacheService } from '@/core/services/view-cache.service';
import type { SettingsOverview, SettingsOwner, SettingsOwnerName } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { toastServiceError } from '@/shared/libs/service-error';
import { useViewCacheValue } from './use-cached-rows';

type SettingsChangeInput = {
  owner: SettingsOwnerName;
  key: string;
  value: string;
};

const EMPTY: SettingsOverview = { owners: [] };

function withValue(overview: SettingsOverview, input: SettingsChangeInput): SettingsOverview {
  return {
    owners: overview.owners.map((owner) =>
      owner.service !== input.owner
        ? owner
        : {
            ...owner,
            settings: owner.settings.map((setting) =>
              setting.key === input.key ? { ...setting, value: input.value } : setting
            ),
          }
    ),
  };
}

function withCatalog(overview: SettingsOverview, catalog: SettingsOwner): SettingsOverview {
  return {
    owners: overview.owners.map((owner) => (owner.service === catalog.service ? catalog : owner)),
  };
}

export function useSettings() {
  const cached = useViewCacheValue<SettingsOverview>(VIEW_CACHE_KEYS.settingsOverview);
  const overview = cached ?? EMPTY;
  const [loading, setLoading] = useState(cached === null);
  const [failed, setFailed] = useState(false);
  const generation = useRef(0);

  const publish = useCallback((next: SettingsOverview) => {
    viewCacheService.writeValue(VIEW_CACHE_KEYS.settingsOverview, next);
  }, []);

  const load = useCallback(async () => {
    const current = generation.current + 1;
    generation.current = current;
    const result = await settingsService.overview();
    if (current !== generation.current) return;
    setFailed(!result.ok);
    if (result.ok && result.info) publish(result.info);
    setLoading(false);
  }, [publish]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const change = useCallback(
    async (input: SettingsChangeInput) => {
      const before = viewCacheService.readValue<SettingsOverview>(VIEW_CACHE_KEYS.settingsOverview) ?? EMPTY;
      generation.current += 1;
      publish(withValue(before, input));
      const result = await settingsService.update(input.owner, [{ key: input.key, value: input.value }]);
      const latest = viewCacheService.readValue<SettingsOverview>(VIEW_CACHE_KEYS.settingsOverview) ?? EMPTY;
      if (result.ok && result.info) {
        publish(withCatalog(latest, result.info.catalog));
        return true;
      }
      publish(before);
      toastServiceError(result.errors);
      return false;
    },
    [publish]
  );

  return { overview, loading, failed, reload: load, change };
}
