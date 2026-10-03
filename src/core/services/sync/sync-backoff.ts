import { WS_RECONNECT_BASE_MS, WS_RECONNECT_MAX_MS } from '@/shared/constants';

export const withJitter = (waitMs: number, random: () => number = Math.random): number =>
  Math.round(waitMs / 2 + (random() * waitMs) / 2);

export const backoffDelay = (attempt: number, random: () => number = Math.random): number =>
  withJitter(Math.min(WS_RECONNECT_BASE_MS * 2 ** attempt, WS_RECONNECT_MAX_MS), random);
