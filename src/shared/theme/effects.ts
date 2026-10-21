import * as Device from 'expo-device';
import { useEffect } from 'react';
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

type SystemFlags = Record<SystemFlag, boolean>;

const useSystemFlags = create<SystemFlags>(() => ({
  reduceMotion: false,
  reduceTransparency: false,
}));

const SYSTEM_FLAGS: readonly SystemFlag[] = ['reduceMotion', 'reduceTransparency'];

let listening = false;

function setSystemFlag(flag: SystemFlag, enabled: boolean): void {
  useSystemFlags.setState(
    flag === 'reduceMotion' ? { reduceMotion: enabled } : { reduceTransparency: enabled }
  );
}

function listenToSystemFlags(): void {
  if (listening) return;
  listening = true;
  for (const flag of SYSTEM_FLAGS) {
    readSystemFlag(flag)
      .then((enabled) => setSystemFlag(flag, enabled))
      .catch(() => undefined);
    watchSystemFlag(flag, (enabled) => setSystemFlag(flag, enabled));
  }
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
