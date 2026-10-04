import type { CameraStreamQuality, CameraStreamState } from '@/core/types';

export type QualityContext = {
  wide: boolean;
  native: boolean;
};

export type StallHistory = readonly number[];

export const QUALITY_STORAGE_PREFIX = 'cameras.quality.';
export const STALL_WINDOW_MS = 60_000;
export const STALLS_BEFORE_FALLBACK = 2;

export function defaultQuality({ wide, native }: QualityContext): CameraStreamQuality {
  return native && !wide ? 'sub' : 'main';
}

export function storedQuality(value: string | null): CameraStreamQuality | null {
  return value === 'main' || value === 'sub' ? value : null;
}

export function isStall(previous: CameraStreamState | null, next: CameraStreamState): boolean {
  return previous === 'live' && (next === 'reconnecting' || next === 'offline');
}

export function recordStall(history: StallHistory, now: number): StallHistory {
  return [...history.filter((at) => now - at < STALL_WINDOW_MS), now];
}

export function shouldFallBack(quality: CameraStreamQuality, history: StallHistory): boolean {
  return quality === 'main' && history.length >= STALLS_BEFORE_FALLBACK;
}
