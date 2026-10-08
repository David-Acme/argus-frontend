export const LOGIN_QR_ROUTE = '/login?method=qr';

export type LoginEntryInput = {
  isNative: boolean;
  method?: string;
};

export type LoginEntry = 'face' | 'qr';

export function loginEntry({ isNative, method }: LoginEntryInput): LoginEntry {
  if (method === 'qr') return 'qr';
  return isNative ? 'face' : 'qr';
}

export type LoginPollInput = {
  status: string;
  accessToken?: string | null;
  refreshToken?: string | null;
};

export type LoginPollOutcome = 'approved' | 'expired' | 'waiting';

export function loginPollOutcome({ status, accessToken, refreshToken }: LoginPollInput): LoginPollOutcome {
  if (status === 'expired') return 'expired';
  if (status !== 'approved') return 'waiting';
  return accessToken && refreshToken ? 'approved' : 'waiting';
}
