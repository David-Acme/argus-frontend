import { useState } from 'react';
import { storageService } from '@/core/services/storage';
import { SETTINGS_MODE_STORAGE_KEY } from '@/features/settings/constants/settings-profiles';

export type SettingsMode = 'simple' | 'advanced';

function storedMode(): SettingsMode {
  return storageService.getString(SETTINGS_MODE_STORAGE_KEY) === 'advanced' ? 'advanced' : 'simple';
}

export function useSettingsMode() {
  const [mode, setMode] = useState<SettingsMode>(storedMode);

  const choose = (next: SettingsMode) => {
    setMode(next);
    storageService.set(SETTINGS_MODE_STORAGE_KEY, next);
  };

  return { mode, choose };
}
