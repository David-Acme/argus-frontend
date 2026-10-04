import type {
  AuthSession,
  IconName,
  SessionPlatform,
  UserSessionsOverview,
} from '@/core/types';
import { defineLens, type OptimisticLens } from '@/shared/libs/optimistic';

export type SessionGroupKey = 'mobile' | 'desktop' | 'other';

export type SessionGroup = {
  key: SessionGroupKey;
  sessions: readonly AuthSession[];
};

export type SessionOverview = {
  current: AuthSession | null;
  groups: readonly SessionGroup[];
  others: readonly AuthSession[];
};

export type SessionActivity =
  | { kind: 'now' }
  | { kind: 'minutes'; count: number }
  | { kind: 'hours'; count: number }
  | { kind: 'days'; count: number }
  | { kind: 'date' };

const ACTIVE_NOW_S = 120;
const MINUTE_S = 60;
const HOUR_S = 3_600;
const DAY_S = 86_400;
const RELATIVE_DAYS = 7;

const GROUP_ORDER: readonly SessionGroupKey[] = ['mobile', 'desktop', 'other'];

export const SESSION_PLATFORM_ICONS: Readonly<Record<SessionPlatform, IconName>> = {
  android: 'smartphone',
  ios: 'smartphone',
  desktop: 'laptop',
  web: 'globe',
  unknown: 'monitor-smartphone',
};

export const SESSION_GROUP_ICONS: Readonly<Record<SessionGroupKey, IconName>> = {
  mobile: 'smartphone',
  desktop: 'monitor',
  other: 'monitor-smartphone',
};

export const sessionLens: OptimisticLens<AuthSession> = defineLens<AuthSession, object>({
  table: 'session',
  recordIdOf: (session) => session.id,
  patch: (session) => session,
});

export const SESSION_LENSES: readonly OptimisticLens<AuthSession>[] = [sessionLens];

export type UserSessionRow = AuthSession & { userId: number };

export type ConnectedUser = {
  userId: number;
  sessions: readonly AuthSession[];
  lastSeenAt: number;
  groups: readonly SessionGroupKey[];
};

export const USER_SESSION_LENSES: readonly OptimisticLens<UserSessionRow>[] = [
  defineLens<UserSessionRow, object>({
    table: 'session',
    recordIdOf: (session) => session.id,
    patch: (session) => session,
  }),
];

export function groupOf(platform: SessionPlatform): SessionGroupKey {
  if (platform === 'android' || platform === 'ios') return 'mobile';
  if (platform === 'desktop' || platform === 'web') return 'desktop';
  return 'other';
}

const byRecentActivity = (left: AuthSession, right: AuthSession): number =>
  right.lastSeenAt - left.lastSeenAt ||
  right.createdAt - left.createdAt ||
  left.id.localeCompare(right.id);

export function overviewOf(sessions: readonly AuthSession[]): SessionOverview {
  const current = sessions.find((session) => session.current) ?? null;
  const others = sessions.filter((session) => !session.current).sort(byRecentActivity);
  const groups = GROUP_ORDER.map((key) => ({
    key,
    sessions: others.filter((session) => groupOf(session.platform) === key),
  })).filter((group) => group.sessions.length > 0);
  return { current, groups, others };
}

export function activityOf(lastSeenAt: number, nowSeconds: number): SessionActivity {
  const elapsed = Math.max(0, nowSeconds - lastSeenAt);
  if (elapsed < ACTIVE_NOW_S) return { kind: 'now' };
  if (elapsed < HOUR_S) return { kind: 'minutes', count: Math.floor(elapsed / MINUTE_S) };
  if (elapsed < DAY_S) return { kind: 'hours', count: Math.floor(elapsed / HOUR_S) };
  if (elapsed < RELATIVE_DAYS * DAY_S) return { kind: 'days', count: Math.floor(elapsed / DAY_S) };
  return { kind: 'date' };
}

export function sessionRowsOf(overview: UserSessionsOverview | null): UserSessionRow[] {
  if (!overview) return [];
  return overview.users.flatMap((user) =>
    user.sessions.map((session) => ({ ...session, userId: user.userId }))
  );
}

export function connectedUsersOf(rows: readonly UserSessionRow[]): ConnectedUser[] {
  const byUser = new Map<number, UserSessionRow[]>();
  for (const row of rows) {
    const list = byUser.get(row.userId);
    if (list) list.push(row);
    else byUser.set(row.userId, [row]);
  }
  return [...byUser.entries()]
    .map(([userId, sessions]) => {
      const ordered = [...sessions].sort(byRecentActivity);
      return {
        userId,
        sessions: ordered,
        lastSeenAt: ordered[0]?.lastSeenAt ?? 0,
        groups: GROUP_ORDER.filter((key) => ordered.some((session) => groupOf(session.platform) === key)),
      };
    })
    .sort((left, right) => right.lastSeenAt - left.lastSeenAt || left.userId - right.userId);
}

export function withoutSessions(
  overview: UserSessionsOverview | null,
  revoked: readonly string[]
): UserSessionsOverview | null {
  if (!overview || revoked.length === 0) return overview;
  const gone = new Set(revoked);
  return {
    users: overview.users
      .map((user) => ({ ...user, sessions: user.sessions.filter((session) => !gone.has(session.id)) }))
      .filter((user) => user.sessions.length > 0),
  };
}
