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

export type SessionOrigin = 'lan' | 'loopback' | 'tunnel' | 'external' | 'unknown';

export type DeviceLoginDetails = {
  challengeId: string;
  platform: SessionPlatform;
  deviceName: string;
  origin: SessionOrigin;
  ipAddress: string;
  createdAt: number;
  expiresAt: number;
};

export type AuthSessionList = {
  sessions: AuthSession[];
};

export type SessionRevokeScope = 'others' | 'all';

export type SessionRevokeResult = {
  revoked: string[];
  current: boolean;
};

export type UserSessions = {
  userId: number;
  sessions: AuthSession[];
};

export type UserSessionsOverview = {
  users: UserSessions[];
};

export type SessionRevokeCause =
  | 'logout'
  | 'revoked'
  | 'refreshTokenReuse'
  | 'revokedByOwner'
  | 'accountDisabled';

export type SessionSignal =
  | { reason: 'sessionRevoked'; sessionId: string; cause: SessionRevokeCause | null }
  | { reason: 'sessionsChanged' }
  | { reason: 'userSessionsChanged'; userId: number };

export type SessionEndNotice =
  | 'closed-here'
  | 'closed-everywhere'
  | 'closed-by-owner'
  | 'account-disabled';
