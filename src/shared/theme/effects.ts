import * as Device from 'expo-device';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { IS_ANDROID } from '@/shared/constants';
import { readSystemFlag, watchSystemFlag, type SystemFlag } from './system-flags';

export const perfTiers = ['low', 'mid', 'high'] as const;

export type PerfTier = (typeof perfTiers)[number];

export type HardwareProfile = {
  android: boolean;
  apiLevel: number | null;
  totalMemory: number | null;
};

const GIB = 1024 ** 3;
const ANDROID_12_API = 31;
const LOW_MEMORY_GIB = 4;
const MID_MEMORY_GIB = 6;

export function resolvePerfTier(profile: HardwareProfile, reduceEffects: boolean): PerfTier {
  if (reduceEffects) return 'low';
  if (!profile.android) return 'high';
  const memoryGib = profile.totalMemory === null ? null : profile.totalMemory / GIB;
  if (profile.apiLevel !== null && profile.apiLevel < ANDROID_12_API) return 'low';
  if (memoryGib !== null && memoryGib < LOW_MEMORY_GIB) return 'low';
  if (memoryGib !== null && memoryGib < MID_MEMORY_GIB) return 'mid';
  return 'high';
}

export const hardwareProfile: HardwareProfile = {
  android: IS_ANDROID,
  apiLevel: typeof Platform.Version === 'number' ? Platform.Version : null,
  totalMemory: Device.totalMemory,
};

type EffectsOverrides = {
  reduceEffects: boolean;
  reduceMotion: boolean | null;
  reduceTransparency: boolean | null;
  perfTier: PerfTier | null;
};

export const useEffectsOverrides = create<EffectsOverrides>(() => ({
  reduceEffects: false,
  reduceMotion: null,
  reduceTransparency: null,
  perfTier: null,
}));

function useAccessibilityFlag(flag: SystemFlag): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    void readSystemFlag(flag).then((value) => {
      if (active) setEnabled(value);
    });
    const stop = watchSystemFlag(flag, setEnabled);
    return () => {
      active = false;
      stop();
    };
  }, [flag]);
  return enabled;
}

export type Effects = {
  perfTier: PerfTier;
  reduceMotion: boolean;
  reduceTransparency: boolean;
};

export function useEffects(): Effects {
  const overrides = useEffectsOverrides();
  const systemMotion = useAccessibilityFlag('reduceMotion');
  const systemTransparency = useAccessibilityFlag('reduceTransparency');
  const perfTier = overrides.perfTier ?? resolvePerfTier(hardwareProfile, overrides.reduceEffects);
  return {
    perfTier,
    reduceMotion: overrides.reduceMotion ?? systemMotion,
    reduceTransparency: overrides.reduceTransparency ?? (systemTransparency || perfTier === 'low'),
  };
}
