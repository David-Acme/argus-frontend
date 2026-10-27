export type LiveLevels = { seq: number; values: readonly number[] };

export type WaveBox = { width: number; height: number; pitch: number };

export const LIVE_EMPTY: LiveLevels = { seq: 0, values: [] };

export const LIVE_EASE_MS = 70;

export const LIVE_MIN_SHARE = 0.08;

export function pushLevel(live: LiveLevels, level: number, kept: number): LiveLevels {
  return { seq: live.seq + 1, values: [...live.values, level].slice(-kept) };
}

export function wholeSecondsOf(shownMs: number, elapsedMs: number): number {
  return Math.floor(shownMs / 1000) === Math.floor(elapsedMs / 1000) ? shownMs : elapsedMs;
}

export function easeToward(
  current: number,
  target: number,
  dtMs: number,
  tauMs: number = LIVE_EASE_MS
): number {
  'worklet';
  if (dtMs <= 0) return current;
  return target + (current - target) * Math.exp(-dtMs / tauMs);
}

export function scrollShare(sinceMs: number, tickMs: number): number {
  'worklet';
  if (tickMs <= 0) return 1;
  return Math.min(1, Math.max(0, sinceMs / tickMs));
}

export function liveBarX(box: WaveBox, fromEnd: number, share: number): number {
  'worklet';
  return box.width - (fromEnd + share) * box.pitch;
}

export function liveBarHeight(box: WaveBox, level: number): number {
  'worklet';
  return Math.max(LIVE_MIN_SHARE, Math.min(1, level)) * box.height;
}

export function liveBarCount(box: WaveBox): number {
  'worklet';
  return box.pitch > 0 ? Math.ceil(box.width / box.pitch) + 1 : 0;
}

export function playedShare(
  positionMs: number,
  sinceMs: number,
  speed: number,
  durationMs: number
): number {
  'worklet';
  if (durationMs <= 0) return 0;
  return Math.min(1, Math.max(0, (positionMs + Math.max(0, sinceMs) * speed) / durationMs));
}
