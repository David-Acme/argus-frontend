import type { PerfTier } from '@/shared/theme/effects';
import { particleCount } from './engine/engine';
import type { PresenceState } from './engine/types';

export type RenderPlan = {
  size: number;
  count: number;
  trails: boolean;
  activeFps: number;
  restFps: number;
  still: boolean;
  leanWhileScrolling: boolean;
};

type TierRule = {
  share: number;
  ceiling: number;
  trails: boolean;
  activeFps: number;
  restFps: number;
  leanWhileScrolling: boolean;
};

export const tierRules: Record<PerfTier, TierRule> = {
  high: {
    share: 1,
    ceiling: 560,
    trails: true,
    activeFps: 60,
    restFps: 30,
    leanWhileScrolling: true,
  },
  mid: {
    share: 1,
    ceiling: 320,
    trails: true,
    activeFps: 60,
    restFps: 30,
    leanWhileScrolling: true,
  },
  low: {
    share: 0.5,
    ceiling: 560,
    trails: false,
    activeFps: 30,
    restFps: 30,
    leanWhileScrolling: false,
  },
};

const ICON_FPS = 30;

export type PlanInput = { size: number; tier: PerfTier; reduceMotion: boolean };

export function planFor({ size, tier, reduceMotion }: PlanInput): RenderPlan {
  const rule = tierRules[tier];
  const full = particleCount(size);
  const icon = full === 0;
  return {
    size,
    count: Math.min(rule.ceiling, Math.round(full * rule.share)),
    trails: rule.trails && !icon,
    activeFps: icon ? Math.min(ICON_FPS, rule.activeFps) : rule.activeFps,
    restFps: rule.restFps,
    still: reduceMotion,
    leanWhileScrolling: rule.leanWhileScrolling,
  };
}

const RESTING: ReadonlySet<PresenceState> = new Set(['idle', 'watch', 'sleep', 'off']);

export function isResting(state: PresenceState): boolean {
  return RESTING.has(state);
}
