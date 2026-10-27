import type { PerfTier } from '@/shared/theme';

export const PREVIEW_LIVE_CAP: Readonly<Record<PerfTier, number>> = { low: 2, mid: 4, high: 6 };

export const PREVIEW_LINGER_MS = 3000;

export const PREVIEW_VIEWPORT_MS = 1000;

export const PREVIEW_REVEAL_MS = 250;

export const PREVIEW_ANSWER_TIMEOUT_MS = 5000;
