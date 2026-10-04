export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

export type SessionRefreshOutcome = 'refreshed' | 'rejected' | 'unavailable';

export type SessionCredential = {
  accessToken: string | null;
  version: number;
};

export type ClientPlatform = 'android' | 'ios' | 'desktop' | 'web';

export type ClientIdentity = {
  platform: ClientPlatform;
  appVersion: string;
  deviceName: string | null;
};
