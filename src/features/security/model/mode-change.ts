import type { GuardMode } from '@/core/types';

const MODE_RANK: Readonly<Record<GuardMode, number>> = {
  home: 0,
  night: 1,
  away: 2,
  armed: 3,
};

type ModedEnvironment = {
  id: number;
  mode: GuardMode;
};

export function modeLowers(
  mode: GuardMode,
  environments: readonly ModedEnvironment[] | null | undefined,
  targetId?: number
): boolean {
  if (mode === 'home') return true;
  return (environments ?? []).some(
    (environment) =>
      (targetId === undefined || environment.id === targetId) && MODE_RANK[mode] < MODE_RANK[environment.mode]
  );
}

export function modeExpectsProtection(mode: GuardMode): boolean {
  return MODE_RANK[mode] > MODE_RANK.home;
}

export function scopeMode(
  environments: readonly ModedEnvironment[] | null | undefined,
  targetId?: number
): GuardMode | null {
  const scoped = (environments ?? []).filter(
    (environment) => targetId === undefined || environment.id === targetId
  );
  const first = scoped[0];
  if (!first) return null;
  return scoped.every((environment) => environment.mode === first.mode) ? first.mode : null;
}

export function undoTarget(
  environments: readonly ModedEnvironment[] | null | undefined,
  next: GuardMode,
  targetId?: number
): GuardMode | null {
  const previous = scopeMode(environments, targetId);
  return previous === null || previous === next ? null : previous;
}
