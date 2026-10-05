import type { CameraLiveNotice } from '@/core/types';
import { CAMERA_STREAM_POLICY_CLOSE } from '@/features/cameras/constants';

export type MediaCloseAction = 'refresh' | 'reconnect' | 'retry';

export type MediaAuthReply =
  | { kind: 'renewed'; role: string }
  | { kind: 'throttled' }
  | { kind: 'refused'; status: number };

export type MediaFrame = {
  type?: unknown;
  status?: unknown;
  error?: unknown;
  payload?: unknown;
};

const VIEWER_LIMITS: Readonly<Record<string, CameraLiveNotice>> = {
  too_many_viewers: 'viewers-total',
  too_many_viewers_for_camera: 'viewers-camera',
  too_many_viewers_for_user: 'viewers-user',
};

const DISABLED_STATUS = 409;
const THROTTLED_STATUS = 429;

export function mediaCloseAction(code: number, reason: string): MediaCloseAction {
  if (code !== CAMERA_STREAM_POLICY_CLOSE) return 'retry';
  if (reason === 'session_expired') return 'refresh';
  if (reason === 'role_changed' || reason === 'slow_consumer') return 'reconnect';
  return 'retry';
}

export function viewerLimitNotice(reason: string | null | undefined): CameraLiveNotice | null {
  if (!reason) return null;
  return VIEWER_LIMITS[reason.trim()] ?? null;
}

export function subscribeNotice(status: number | undefined, error: string | undefined): CameraLiveNotice | null {
  if (status === DISABLED_STATUS) return 'camera-disabled';
  if (status === THROTTLED_STATUS) return viewerLimitNotice(error);
  return null;
}

export function readAuthReply(frame: MediaFrame): MediaAuthReply | null {
  if (frame.type === 'camera:auth:ok') {
    const payload = frame.payload as { role?: unknown } | null | undefined;
    return { kind: 'renewed', role: typeof payload?.role === 'string' ? payload.role : '' };
  }
  if (frame.type !== 'camera:auth_error') return null;
  const status = typeof frame.status === 'number' ? frame.status : 0;
  return status === THROTTLED_STATUS ? { kind: 'throttled' } : { kind: 'refused', status };
}

export function renewalDelayMs(lastSentAt: number, now: number, intervalMs: number): number {
  if (lastSentAt <= 0) return 0;
  return Math.max(0, lastSentAt + intervalMs - now);
}

export function authFrame(token: string): string {
  return JSON.stringify({ type: 'camera:auth', payload: { token } });
}

export function rtcRefusalReason(status: number, error: { code?: string; message?: string } | null | undefined): string {
  if (viewerLimitNotice(error?.message)) return (error?.message ?? '').trim();
  return error?.code || `CAMERA_RTC_${status}`;
}
