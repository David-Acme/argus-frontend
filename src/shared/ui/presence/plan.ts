import type { PerfTier } from '@/shared/theme/effects';
import { particleCount } from './engine/engine';
import { CLIMB_SECONDS } from './engine/pace';
import type { PresenceState } from './engine/types';

export type RenderPlan = {
  tier: PerfTier;
  size: number;
  count: number;
  trails: boolean;
  activeFps: number;
  restFps: number;
  still: boolean;
  leanWhileScrolling: boolean;
  watch: boolean;
  climbWork: number;
  patience: number;
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
    activeFps: 120,
    restFps: 30,
    leanWhileScrolling: true,
  },
  mid: {
    share: 1,
    ceiling: 560,
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

export type Adaptation = { ceiling: PerfTier; drops: number };

export type PlanInput = {
  size: number;
  tier: PerfTier;
  reduceMotion: boolean;
  adaptation?: Adaptation;
};

const MAX_BACKOFF = 4;
const RANK: Record<PerfTier, number> = { low: 0, mid: 1, high: 2 };
const CLIMB_WORK: Record<PerfTier, number> = { low: 1 / 240, mid: 1 / 100, high: 0 };

function climbWork(tier: PerfTier, adaptation: Adaptation | undefined): number {
  if (!adaptation || RANK[tier] >= RANK[adaptation.ceiling]) return 0;
  return CLIMB_WORK[tier];
}

export function planFor({ size, tier, reduceMotion, adaptation }: PlanInput): RenderPlan {
  const rule = tierRules[tier];
  const full = particleCount(size);
  const icon = full === 0;
  return {
    tier,
    size,
    count: Math.min(rule.ceiling, Math.round(full * rule.share)),
    trails: rule.trails && !icon,
    activeFps: icon ? Math.min(ICON_FPS, rule.activeFps) : rule.activeFps,
    restFps: icon ? Math.min(ICON_FPS, rule.restFps) : rule.restFps,
    still: reduceMotion,
    leanWhileScrolling: rule.leanWhileScrolling,
    watch: adaptation !== undefined && !reduceMotion,
    climbWork: climbWork(tier, adaptation),
    patience: CLIMB_SECONDS * 2 ** Math.min(MAX_BACKOFF, adaptation?.drops ?? 0),
  };
}

const RESTING: ReadonlySet<PresenceState> = new Set(['idle', 'watch', 'sleep', 'off']);

export function isResting(state: PresenceState): boolean {
  return RESTING.has(state);
}
