import { useCallback, useEffect, useMemo } from 'react';
import { settingsService } from '@/features/settings/services/settings.service';
import type { SettingChange, SettingsOverview, SettingsOwner, SettingsOwnerName } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { toastServiceError } from '@/shared/libs/service-error';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { withActiveOwners } from '@/features/settings/model/settings-modules';
import { hasInstallingChoice } from '@/features/settings/model/tts-preview';
import {
  SETTING_LENSES,
  settingRows,
  withCatalogs,
  withSettingRows,
} from '@/features/settings/model/settings-profiles';

type SettingsChangeInput = {
  owner: SettingsOwnerName;
  changes: readonly SettingChange[];
};

type UseSettingsOptions = {
  enabled?: boolean;
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
            settings: owner.settings.map((setting) => {
              const change = input.changes.find((candidate) => candidate.key === setting.key);
              return change ? { ...setting, value: change.value } : setting;
            }),
          }
    ),
  };
}

const loadOverview = () => settingsService.overview();

export function useSettings({ enabled = true }: UseSettingsOptions = {}) {
  const { data, status, reload, mutate } = useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.settingsOverview,
    load: loadOverview,
    enabled,
  });
  const base = data ?? EMPTY;
  const installing = hasInstallingChoice(base);
  const rows = useMemo(() => settingRows(base), [base]);
  const { rows: merged } = useOptimisticRows(rows, SETTING_LENSES);
  const { moduleActive } = useCapabilities();
  const overview = useMemo(
    () => withActiveOwners(merged === rows ? base : withSettingRows(base, merged), moduleActive),
    [base, merged, moduleActive, rows]
  );

  const change = useCallback(
    async (input: SettingsChangeInput) => {
      let before = EMPTY;
      mutate((previous) => {
        before = previous ?? EMPTY;
        return withValue(before, input);
      });
      const result = await settingsService.update(input.owner, input.changes);
      if (result.ok && result.info) {
        const { catalog } = result.info;
        mutate((latest) => withCatalogs(latest ?? EMPTY, [catalog]));
        return true;
      }
      mutate(() => before);
      toastServiceError(result.errors);
      return false;
    },
    [mutate]
  );

  const replaceCatalogs = useCallback(
    (catalogs: readonly SettingsOwner[]) =>
      mutate((latest) => withCatalogs(latest ?? EMPTY, catalogs)),
    [mutate]
  );

  useEffect(() => {
    if (!installing) return;
    const timer = setInterval(() => void reload(), INSTALL_POLL_MS);
    return () => clearInterval(timer);
  }, [installing, reload]);

  return {
    overview,
    loading: status === 'loading',
    failed: status === 'failed',
    reload,
    change,
    replaceCatalogs,
  };
}
