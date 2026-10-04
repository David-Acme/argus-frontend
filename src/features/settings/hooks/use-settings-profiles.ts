import { useCallback, useMemo, useState } from 'react';
import { settingsProfilesSchema } from '@/core/contracts/http.contract';
import { t, tk } from '@/core/i18n';
import type {
  ProfileApplyResult,
  SettingsOwner,
  SettingsProfile,
  SettingsProfiles,
} from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { runOptimistic, type OptimisticRefusal } from '@/shared/libs/optimistic-action';
import { settingsService } from '@/features/settings/services/settings.service';
import {
  profileIntents,
  refusedItems,
  refusedRecordIds,
  returnedCatalogs,
  type ProfileRefusedItem,
} from '@/features/settings/model/settings-profiles';
import { profileName, settingLabel } from '@/features/settings/model/profile-text';

type UseSettingsProfilesOptions = {
  enabled?: boolean;
  onCatalogs: (catalogs: readonly SettingsOwner[]) => void;
};

const REFUSAL_LIST_LIMIT = 3;

const loadProfiles = () => settingsService.profiles();

function refusalLine(item: ProfileRefusedItem): string {
  const reason =
    item.status === 'unreachable'
      ? t('screens.settings.profiles.result.reasons.unreachable')
      : tk(`screens.settings.profiles.result.reasons.${item.reason ?? 'invalid'}`);
  return `${settingLabel(item.key)}: ${reason}`;
}

function refusalOf(result: ProfileApplyResult): OptimisticRefusal | null {
  const refused = refusedItems(result);
  if (refused.length === 0) return null;
  const listed = refused.slice(0, REFUSAL_LIST_LIMIT).map(refusalLine);
  const hidden = refused.length - listed.length;
  if (hidden > 0)
    listed.push(t('screens.settings.profiles.result.more', { count: String(hidden) }));
  return {
    recordIds: refusedRecordIds(result),
    title:
      refused.length === 1
        ? t('screens.settings.profiles.result.refused-one')
        : t('screens.settings.profiles.result.refused-other', { count: String(refused.length) }),
    description: listed.join('\n'),
  };
}

function readableProfiles(data: SettingsProfiles | null): SettingsProfiles | null {
  return data !== null && settingsProfilesSchema.safeParse(data).success ? data : null;
}

export function useSettingsProfiles({ enabled = true, onCatalogs }: UseSettingsProfilesOptions) {
  const { data, status, reload } = useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.settingsProfiles,
    load: loadProfiles,
    enabled,
  });
  const [applying, setApplying] = useState<string | null>(null);
  const profiles = useMemo(() => readableProfiles(data), [data]);

  const apply = useCallback(
    async (profile: SettingsProfile) => {
      setApplying(profile.id);
      try {
        const result = await runOptimistic({
          intents: profileIntents(profile),
          call: () => settingsService.applyProfile(profile.id),
          success: t('screens.settings.profiles.result.applied', {
            name: profileName(profile.labelKey),
          }),
          errorTitle: t('screens.settings.profiles.result.failed'),
          refusals: refusalOf,
        });
        if (result?.info) onCatalogs(returnedCatalogs(result.info));
      } finally {
        setApplying(null);
        void reload();
      }
    },
    [onCatalogs, reload]
  );

  return {
    profiles,
    loading: status === 'loading' || (data !== null && profiles === null),
    failed: status === 'failed',
    applying,
    reload,
    apply,
  };
}
