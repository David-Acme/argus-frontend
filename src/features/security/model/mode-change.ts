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
