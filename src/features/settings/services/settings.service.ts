import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import type {
  ProfileApplyResult,
  SettingChange,
  SettingsOverview,
  SettingsOwnerName,
  SettingsProfiles,
  SettingsUpdateResult,
} from '@/core/types';

class SettingsService {
  overview(): Promise<IServiceResponse<SettingsOverview>> {
    return httpService.get<SettingsOverview>('/settings');
  }

  update(
    owner: SettingsOwnerName,
    changes: readonly SettingChange[]
  ): Promise<IServiceResponse<SettingsUpdateResult>> {
    return httpService.patch<SettingsUpdateResult>(`/settings/${owner}`, { changes });
  }

  profiles(): Promise<IServiceResponse<SettingsProfiles>> {
    return httpService.get<SettingsProfiles>('/settings/profiles');
  }

  revertRecommended(): Promise<IServiceResponse<ProfileApplyResult>> {
    return httpService.post<ProfileApplyResult>('/settings/profiles/recommended/revert', {});
  }

  applyProfile(id: string): Promise<IServiceResponse<ProfileApplyResult>> {
    return httpService.post<ProfileApplyResult>(
      `/settings/profiles/${encodeURIComponent(id)}/apply`,
      {}
    );
  }
}

export const settingsService = new SettingsService();
