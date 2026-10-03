import { useCallback, useEffect } from 'react';
import { settingsService } from '@/features/settings/services/settings.service';
import type { SettingsOverview, SettingsOwner, SettingsOwnerName } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { toastServiceError } from '@/shared/libs/service-error';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { hasInstallingChoice } from '@/features/settings/model/tts-preview';

type SettingsChangeInput = {
  owner: SettingsOwnerName;
  key: string;
  value: string;
};

const EMPTY: SettingsOverview = { owners: [] };
const INSTALL_POLL_MS = 4000;

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

const loadOverview = () => settingsService.overview();

export function useSettings() {
  const { data, status, reload, mutate } = useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.settingsOverview,
    load: loadOverview,
  });
  const installing = hasInstallingChoice(data ?? EMPTY);

  const change = useCallback(
    async (input: SettingsChangeInput) => {
      let before = EMPTY;
      mutate((previous) => {
        before = previous ?? EMPTY;
        return withValue(before, input);
      });
      const result = await settingsService.update(input.owner, [{ key: input.key, value: input.value }]);
      if (result.ok && result.info) {
        const { catalog } = result.info;
        mutate((latest) => withCatalog(latest ?? EMPTY, catalog));
        return true;
      }
      mutate(() => before);
      toastServiceError(result.errors);
      return false;
    },
    [mutate]
  );

  useEffect(() => {
    if (!installing) return;
    const timer = setInterval(() => void reload(), INSTALL_POLL_MS);
    return () => clearInterval(timer);
  }, [installing, reload]);

  return {
    overview: data ?? EMPTY,
    loading: status === 'loading',
    failed: status === 'failed',
    reload,
    change,
  };
}
