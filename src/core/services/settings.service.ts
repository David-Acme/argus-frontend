import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import type {
  SettingChange,
  SettingsOverview,
  SettingsOwnerName,
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
}

export const settingsService = new SettingsService();
