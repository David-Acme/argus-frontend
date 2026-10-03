type RefreshAnswer = { status: number; body: string };

export type RefreshReading =
  | { outcome: 'rejected' | 'unavailable' }
  | { outcome: 'refreshed'; accessToken: string; refreshToken: string | null };

export function readRefreshResponse({ status, body }: RefreshAnswer): RefreshReading {
  if (status === 401 || status === 403) return { outcome: 'rejected' };
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
