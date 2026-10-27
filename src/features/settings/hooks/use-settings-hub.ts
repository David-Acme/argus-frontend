import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import type { ServiceChange } from '@/features/settings/components/service-detail';
import { useSettings } from '@/features/settings/hooks/use-settings';
import { useSettingsProfiles } from '@/features/settings/hooks/use-settings-profiles';
import { homeNameSettingOf } from '@/features/settings/model/home-name';
import { serviceOwners } from '@/features/settings/model/services';

export function useSettingsHub() {
  const { has } = useCapabilities();
  const owner = has(CAPABILITY.settingsManage);
  const settings = useSettings({ enabled: owner });
  const profiles = useSettingsProfiles({ enabled: owner, onCatalogs: settings.replaceCatalogs });
  const owners = serviceOwners(settings.overview);
  const household = homeNameSettingOf(settings.overview);
  const change: ServiceChange = (target, changes) =>
    void settings.change({ owner: target.service, changes });
  return { settings, profiles, owners, household, change };
}

export type SettingsHub = ReturnType<typeof useSettingsHub>;
