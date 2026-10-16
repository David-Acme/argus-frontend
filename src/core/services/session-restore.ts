import type { IAuthUser } from '@/core/interfaces';
import type { NetPairedInstance } from '@/core/types';

export type StoredSessionReading = {
  instance: NetPairedInstance | null;
  accessToken: string | null;
  refreshToken: string | null;
  deviceCredential: string | null;
  user: IAuthUser | null;
};

export type RestoreDecision =
  | { kind: 'session' }
  | { kind: 'absent' }
  | { kind: 'partial'; reason: 'missing-instance' | 'missing-tokens' | 'missing-user' };

export const RESTORE_RETRY_CAP_MS = 30_000;
const RESTORE_RETRY_BASE_MS = 1_000;

export function decideRestore(reading: StoredSessionReading): RestoreDecision {
  const { instance, accessToken, refreshToken, deviceCredential, user } = reading;
  if (instance && accessToken && refreshToken && user) return { kind: 'session' };
  if (!instance && !accessToken && !refreshToken && !deviceCredential && !user) return { kind: 'absent' };
  if (!instance) return { kind: 'partial', reason: 'missing-instance' };
  if (!accessToken || !refreshToken) return { kind: 'partial', reason: 'missing-tokens' };
  return { kind: 'partial', reason: 'missing-user' };
}

export function restoreRetryDelayMs(attempt: number): number {
  return Math.min(RESTORE_RETRY_CAP_MS, RESTORE_RETRY_BASE_MS * 2 ** Math.max(0, attempt - 1));
}
