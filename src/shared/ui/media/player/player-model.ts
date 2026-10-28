import { formatDuration } from '@/shared/libs/duration';

export const formatPlayerTime = formatDuration;

export type PlayerStatus = 'loading' | 'ready' | 'playing' | 'ended' | 'error';

export type SeekSide = 'back' | 'forward';

export type TapZone = SeekSide | 'centre';

export type SeekStreak = { side: SeekSide; count: number; at: number };

export type SkipInput = { positionMs: number; deltaMs: number; durationMs: number };

export type ScrubInput = { x: number; width: number; durationMs: number };

export type ControlsInput = {
  status: PlayerStatus;
  scrubbing: boolean;
  shownUntil: number;
  now: number;
};

export const PLAYER_SPEEDS = [0.5, 1, 1.5, 2] as const;

export type PlayerSpeed = (typeof PLAYER_SPEEDS)[number];

export const SEEK_STEP_MS = 10_000;

export const SEEK_STREAK_MS = 700;

export const CONTROLS_HIDE_MS = 3000;

export const RESUME_MIN_MS = 2000;

export const RESUME_TAIL_MS = 1500;

export const BUFFERING_DELAY_MS = 300;

export type LoadingLook = 'poster' | 'skeleton' | 'none';

export type LoadingInput = { painted: boolean; poster: boolean };

export function loadingLook({ painted, poster }: LoadingInput): LoadingLook {
  if (painted) return 'none';
  return poster ? 'poster' : 'skeleton';
}

export const isBuffering = (status: PlayerStatus, painted: boolean): boolean =>
  painted && status === 'loading';

const SIDE_ZONE = 0.35;

export function clampTime(ms: number, durationMs: number): number {
  if (!Number.isFinite(ms)) return 0;
  return Math.min(Math.max(0, ms), Math.max(0, durationMs));
}

export function skipTarget({ positionMs, deltaMs, durationMs }: SkipInput): number {
  return clampTime(positionMs + deltaMs, durationMs);
}

export function scrubTime({ x, width, durationMs }: ScrubInput): number {
  if (width <= 0) return 0;
  return clampTime((x / width) * durationMs, durationMs);
}

export function fractionOf(ms: number, durationMs: number): number {
  return durationMs > 0 ? clampTime(ms, durationMs) / durationMs : 0;
}

export function tapZone(x: number, width: number): TapZone {
  if (width <= 0) return 'centre';
  if (x < width * SIDE_ZONE) return 'back';
  return x > width * (1 - SIDE_ZONE) ? 'forward' : 'centre';
}

export function nextStreak(previous: SeekStreak | null, side: SeekSide, now: number): SeekStreak {
  const continues =
    previous !== null && previous.side === side && now - previous.at <= SEEK_STREAK_MS;
  return { side, count: continues ? previous.count + 1 : 1, at: now };
}

export const streakSeconds = (streak: SeekStreak): number => (streak.count * SEEK_STEP_MS) / 1000;

export function controlsShown({ status, scrubbing, shownUntil, now }: ControlsInput): boolean {
  if (status !== 'playing' || scrubbing) return true;
  return now < shownUntil;
}

export function nextSpeed(speed: number): PlayerSpeed {
  const at = PLAYER_SPEEDS.findIndex((candidate) => candidate === speed);
  return PLAYER_SPEEDS[(at + 1) % PLAYER_SPEEDS.length] ?? 1;
}

const resumed = new Map<string, number>();

export function rememberPosition(key: string, positionMs: number, durationMs: number): void {
  const worth = positionMs >= RESUME_MIN_MS && positionMs < durationMs - RESUME_TAIL_MS;
  if (worth) resumed.set(key, positionMs);
  else resumed.delete(key);
}

export function resumePosition(key: string): number {
  return resumed.get(key) ?? 0;
}
