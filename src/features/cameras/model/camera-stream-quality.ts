import type { ICameraVideoProfile } from '@/core/interfaces';
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

export const MIN_CHOOSABLE_FPS = 10;

export function frameRateChoices(video: Pick<ICameraVideoProfile, 'frameRate' | 'frameRates'> | null): number[] {
  if (!video) return [];
  const rates = new Set(video.frameRates.filter((fps) => fps >= MIN_CHOOSABLE_FPS));
  if (video.frameRate > 0) rates.add(video.frameRate);
  return [...rates].sort((left, right) => left - right);
}
