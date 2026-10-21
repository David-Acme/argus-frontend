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

type TierRule = { share: number; trails: boolean; activeFps: number; restFps: number; leanWhileScrolling: boolean };

export const tierRules: Record<PerfTier, TierRule> = {
  high: { share: 1, trails: true, activeFps: 60, restFps: 30, leanWhileScrolling: true },
  mid: { share: 1, trails: false, activeFps: 60, restFps: 30, leanWhileScrolling: true },
  low: { share: 0.5, trails: false, activeFps: 30, restFps: 30, leanWhileScrolling: false },
};

export type PlanInput = { size: number; tier: PerfTier; reduceMotion: boolean };

export function planFor({ size, tier, reduceMotion }: PlanInput): RenderPlan {
  const rule = tierRules[tier];
  const full = particleCount(size);
  return {
    size,
    count: Math.round(full * rule.share),
    trails: rule.trails && full > 0,
    activeFps: rule.activeFps,
    restFps: rule.restFps,
    still: reduceMotion,
    leanWhileScrolling: rule.leanWhileScrolling,
  };
}

const RESTING: ReadonlySet<PresenceState> = new Set(['idle', 'watch', 'sleep', 'off']);

export function frameInterval(plan: RenderPlan, resting: boolean): number {
  'worklet';
  return 1 / (resting ? plan.restFps : plan.activeFps);
}

export function isResting(state: PresenceState): boolean {
  return RESTING.has(state);
}
