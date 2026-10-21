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

export function hardwareCeiling(profile: HardwareProfile): PerfTier {
  if (!profile.android) return 'high';
  const memoryGib = profile.totalMemory === null ? null : profile.totalMemory / GIB;
  if (profile.apiLevel !== null && profile.apiLevel < ANDROID_12_API) return 'low';
  if (memoryGib !== null && memoryGib < LOW_MEMORY_GIB) return 'low';
  if (memoryGib !== null && memoryGib < MID_MEMORY_GIB) return 'mid';
  return 'high';
}

export type TierEvidence = { live: PerfTier | null };

export type TierInput = { profile: HardwareProfile; reduceEffects: boolean } & TierEvidence;

export function lowerTier(a: PerfTier, b: PerfTier): PerfTier {
  return perfTiers[Math.min(perfTiers.indexOf(a), perfTiers.indexOf(b))] ?? 'low';
}

export function needsProbe({ profile, reduceEffects }: TierInput): boolean {
  return !reduceEffects && profile.android && hardwareCeiling(profile) !== 'low';
}

export function resolvePerfTier(input: TierInput): PerfTier {
  if (input.reduceEffects) return 'low';
  const ceiling = hardwareCeiling(input.profile);
  if (input.live !== null) return lowerTier(ceiling, input.live);
  return input.profile.android ? 'low' : ceiling;
}

export const hardwareProfile: HardwareProfile = {
  android: IS_ANDROID,
  apiLevel: typeof Platform.Version === 'number' ? Platform.Version : null,
  totalMemory: Device.totalMemory,
};

export type ProbeReport = { tier: PerfTier; workMs: number; dropped: number };

type AutoTier = TierEvidence & { report: ProbeReport | null; drops: number };

export const useAutoTier = create<AutoTier>(() => ({ live: null, report: null, drops: 0 }));

export function recordProbe(report: ProbeReport): void {
  useAutoTier.setState({ live: report.tier, report });
}

export function shiftTier(from: PerfTier, step: -1 | 1): void {
  const next = perfTiers[perfTiers.indexOf(from) + step];
  if (!next) return;
  useAutoTier.setState((state) => ({ live: next, drops: state.drops + (step < 0 ? 1 : 0) }));
}

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
  adaptive: boolean;
  ceiling: PerfTier;
  drops: number;
  probing: boolean;
  reduceMotion: boolean;
  reduceTransparency: boolean;
};

export function useEffects(): Effects {
  const overrides = useEffectsOverrides();
  const systemMotion = useAccessibilityFlag('reduceMotion');
  const systemTransparency = useAccessibilityFlag('reduceTransparency');
  const evidence = useAutoTier();
  const input: TierInput = {
    profile: hardwareProfile,
    reduceEffects: overrides.reduceEffects,
    live: evidence.live,
  };
  const perfTier = overrides.perfTier ?? resolvePerfTier(input);
  const glassTier =
    overrides.perfTier ??
    resolvePerfTier({ ...input, live: input.live ?? hardwareCeiling(hardwareProfile) });
  const auto = overrides.perfTier === null;
  return {
    perfTier,
    adaptive: auto && !overrides.reduceEffects,
    ceiling: hardwareCeiling(hardwareProfile),
    drops: evidence.drops,
    probing: auto && evidence.live === null && needsProbe(input),
    reduceMotion: overrides.reduceMotion ?? systemMotion,
    reduceTransparency: overrides.reduceTransparency ?? (systemTransparency || glassTier === 'low'),
  };
}
