import { create } from 'zustand';
import { storageService } from '@/core/services/storage';
import { HAPTICS_STORAGE_KEY, REDUCE_EFFECTS_STORAGE_KEY } from '@/shared/constants';
import { setFeedbackEnabled, useEffectsOverrides } from '@/shared/theme';

export type DevicePreferences = { reduceEffects: boolean; haptics: boolean };

export type DevicePreferenceControls = DevicePreferences & {
  setReduceEffects: (next: boolean) => void;
  setHaptics: (next: boolean) => void;
};

export function readDevicePreferences(): DevicePreferences {
  return {
    reduceEffects: storageService.getBoolean(REDUCE_EFFECTS_STORAGE_KEY) === true,
    haptics: storageService.getBoolean(HAPTICS_STORAGE_KEY) !== false,
  };
}

const useHaptics = create<{ haptics: boolean }>(() => ({ haptics: true }));

export function applyDevicePreferences(): void {
  const { reduceEffects, haptics } = readDevicePreferences();
  useEffectsOverrides.setState({ reduceEffects });
  useHaptics.setState({ haptics });
  setFeedbackEnabled(haptics);
}

export function useDevicePreferences(): DevicePreferenceControls {
  const reduceEffects = useEffectsOverrides((state) => state.reduceEffects);
  const haptics = useHaptics((state) => state.haptics);
  const setReduceEffects = (next: boolean) => {
    storageService.set(REDUCE_EFFECTS_STORAGE_KEY, next);
    useEffectsOverrides.setState({ reduceEffects: next });
  };
  const setHaptics = (next: boolean) => {
    storageService.set(HAPTICS_STORAGE_KEY, next);
    useHaptics.setState({ haptics: next });
    setFeedbackEnabled(next);
  };
  return { reduceEffects, haptics, setReduceEffects, setHaptics };
}
