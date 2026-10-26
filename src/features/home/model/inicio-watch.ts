import type { GuardEnvironment, GuardMode } from '@/core/types';

export type WatchedCamera = { id: string; name: string };

export type WatchInput = {
  environments: readonly Pick<GuardEnvironment, 'effectiveMode' | 'cameraIds'>[];
  cameras: readonly WatchedCamera[];
  shown: number;
};

export type WatchSummary = { count: number; names: readonly string[]; more: number };

export type WakeRule = 'unknown' | 'insists' | 'danger';

export type WatchTitle = 'tonight' | 'away';

const WAKE: Readonly<Record<Exclude<GuardMode, 'home'>, WakeRule>> = {
  night: 'unknown',
  away: 'insists',
  armed: 'danger',
};

export function watchedCameras({ environments, cameras, shown }: WatchInput): WatchSummary | null {
  const ids = new Set(
    environments
      .filter((environment) => environment.effectiveMode !== 'home')
      .flatMap((environment) => environment.cameraIds.map(String))
  );
  const watched = cameras.filter((camera) => ids.has(camera.id));
  if (watched.length === 0) return null;
  return {
    count: watched.length,
    names: watched.slice(0, shown).map((camera) => camera.name),
    more: Math.max(0, watched.length - shown),
  };
}

export function wakeRuleOf(mode: GuardMode | null): WakeRule | null {
  if (mode === null || mode === 'home') return null;
  return WAKE[mode];
}

export function watchTitleOf(mode: GuardMode | null): WatchTitle | null {
  if (mode === 'night') return 'tonight';
  return mode === 'away' || mode === 'armed' ? 'away' : null;
}
