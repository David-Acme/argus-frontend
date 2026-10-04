export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

export type SessionRefreshOutcome = 'refreshed' | 'rejected' | 'unavailable';

export type SessionCredential = {
  accessToken: string | null;
  version: number;
};

export type ClientPlatform = 'android' | 'ios' | 'desktop' | 'web';

export type SessionPlatform = ClientPlatform | 'unknown';

export type ClientIdentity = {
  platform: ClientPlatform;
  appVersion: string;
  deviceName: string | null;
};

export type AuthSession = {
  id: string;
  platform: SessionPlatform;
  deviceName: string | null;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
  current: boolean;
};

export type AuthSessionList = {
  sessions: AuthSession[];
};

export type SessionRevokeScope = 'others' | 'all';

export type SessionRevokeResult = {
  revoked: string[];
  current: boolean;
};

export type SessionSignal =
  | { reason: 'sessionRevoked'; sessionId: string }
  | { reason: 'sessionsChanged' };

export type SessionEndNotice = 'closed-here' | 'closed-everywhere';
