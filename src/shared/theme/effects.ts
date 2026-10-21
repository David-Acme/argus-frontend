import * as Device from 'expo-device';
import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { create } from 'zustand';
import { IS_ANDROID } from '@/shared/constants';

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

type SystemFlags = { reduceMotion: boolean; reduceTransparency: boolean };

const useSystemFlags = create<SystemFlags>(() => ({
  reduceMotion: false,
  reduceTransparency: false,
}));

let listening = false;

function listenToSystemFlags(): void {
  if (listening) return;
  listening = true;
  const set = (patch: Partial<SystemFlags>) => useSystemFlags.setState(patch);
  AccessibilityInfo.isReduceMotionEnabled()
    .then((reduceMotion) => set({ reduceMotion }))
    .catch(() => undefined);
  if (typeof AccessibilityInfo.isReduceTransparencyEnabled === 'function') {
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((reduceTransparency) => set({ reduceTransparency }))
      .catch(() => undefined);
  }
  AccessibilityInfo.addEventListener('reduceMotionChanged', (reduceMotion) =>
    set({ reduceMotion })
  );
  AccessibilityInfo.addEventListener('reduceTransparencyChanged', (reduceTransparency) =>
    set({ reduceTransparency })
  );
}

export type Effects = {
  perfTier: PerfTier;
  reduceMotion: boolean;
  reduceTransparency: boolean;
};

export function useEffects(): Effects {
  useEffect(listenToSystemFlags, []);
  const overrides = useEffectsOverrides();
  const systemMotion = useSystemFlags((flags) => flags.reduceMotion);
  const systemTransparency = useSystemFlags((flags) => flags.reduceTransparency);
  const perfTier = overrides.perfTier ?? resolvePerfTier(hardwareProfile, overrides.reduceEffects);
  return {
    perfTier,
    reduceMotion: overrides.reduceMotion ?? systemMotion,
    reduceTransparency: overrides.reduceTransparency ?? (systemTransparency || perfTier === 'low'),
  };
}
