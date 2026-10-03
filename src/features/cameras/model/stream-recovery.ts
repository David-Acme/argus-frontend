import type { CameraStreamState } from '@/core/types';
import {
  CAMERA_STREAM_BUSY_RETRY_MS,
  CAMERA_STREAM_OFFLINE_AFTER_ATTEMPTS,
  CAMERA_STREAM_RECONNECT_BASE_MS,
  CAMERA_STREAM_RECONNECT_MAX_MS,
} from '@/features/cameras/constants';

export type SubscribeRefusal = 'retry' | 'busy' | 'final';

const FINAL_STATUSES = new Set([400, 401, 403, 404]);
const BUSY_STATUSES = new Set([429]);

export function refusalOf(status: number | undefined): SubscribeRefusal {
  if (status != null && FINAL_STATUSES.has(status)) return 'final';
  if (status != null && BUSY_STATUSES.has(status)) return 'busy';
  return 'retry';
}

export function retryDelayMs(attempt: number, refusal: SubscribeRefusal, jitter: number): number {
  if (refusal === 'busy') return CAMERA_STREAM_BUSY_RETRY_MS;
  const exponent = Math.max(0, attempt - 1);
  const base = Math.min(CAMERA_STREAM_RECONNECT_MAX_MS, CAMERA_STREAM_RECONNECT_BASE_MS * 2 ** exponent);
  const spread = Math.min(Math.max(jitter, 0), 1) * 0.2 * base;
  return Math.round(base - spread);
}

export function stateAfterFailure(attempt: number): CameraStreamState {
  return attempt >= CAMERA_STREAM_OFFLINE_AFTER_ATTEMPTS ? 'offline' : 'reconnecting';
}

export function isStalled(lastMediaAt: number, now: number, stallMs: number): boolean {
  return lastMediaAt > 0 && now - lastMediaAt >= stallMs;
}
