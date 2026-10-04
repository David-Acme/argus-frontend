import type { SessionCredential, SessionRefreshOutcome } from '@/core/types';

type RefreshAnswer = { status: number; body: string };

const ACCOUNT_DISABLED = 'ACCOUNT_DISABLED';

function refusalCodeOf(body: string): string | null {
  try {
    const envelope = JSON.parse(body) as { errors?: { code?: unknown } | null };
    const code = envelope.errors?.code;
    return typeof code === 'string' ? code : null;
  } catch {
    return null;
  }
}

export function settledRefresh(
  failed: SessionCredential | undefined,
  current: SessionCredential,
): SessionRefreshOutcome | null {
  if (!failed) return null;
  if (failed.version !== current.version) return 'unavailable';
  if (current.accessToken && current.accessToken !== failed.accessToken) return 'refreshed';
  return null;
}

export type RefreshReading =
  | { outcome: 'rejected'; accountDisabled: boolean }
  | { outcome: 'unavailable' }
  | { outcome: 'refreshed'; accessToken: string; refreshToken: string | null };

export function readRefreshResponse({ status, body }: RefreshAnswer): RefreshReading {
  if (status === 401 || status === 403)
    return { outcome: 'rejected', accountDisabled: refusalCodeOf(body) === ACCOUNT_DISABLED };
  if (status < 200 || status >= 300) return { outcome: 'unavailable' };
  try {
    const envelope = JSON.parse(body) as { info?: { accessToken?: unknown; refreshToken?: unknown } };
    const accessToken = envelope.info?.accessToken;
    const refreshToken = envelope.info?.refreshToken;
    if (typeof accessToken !== 'string' || accessToken.length === 0) return { outcome: 'unavailable' };
    return { outcome: 'refreshed', accessToken, refreshToken: typeof refreshToken === 'string' ? refreshToken : null };
  } catch {
    return { outcome: 'unavailable' };
  }
}
