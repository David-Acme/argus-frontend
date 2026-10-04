import { describe, expect, test } from 'bun:test';
import type { AuthSession } from '@/core/types';
import {
  activityOf,
  connectedUsersOf,
  groupOf,
  overviewOf,
  SESSION_LENSES,
  sessionInsightsOf,
  sessionRowsOf,
  withoutSessions,
} from '@/features/sessions/model/sessions';
import { applyIntents, OptimisticRegistry } from '@/shared/libs/optimistic';

const NOW = 1_790_000_000;

const session = (id: string, overrides: Partial<AuthSession> = {}): AuthSession => ({
  id: id.repeat(32).slice(0, 32),
  platform: 'android',
  deviceName: null,
  createdAt: NOW - 86_400,
  lastSeenAt: NOW - 600,
  expiresAt: NOW + 2_592_000,
  current: false,
  ...overrides,
});

describe('overviewOf', () => {
  test('this device first, then mobiles and desktops by latest activity, without empty groups', () => {
    const here = session('a', { platform: 'desktop', current: true });
    const phone = session('b', { platform: 'android', lastSeenAt: NOW - 3_600 });
    const tablet = session('c', { platform: 'ios', lastSeenAt: NOW - 60 });
    const browser = session('d', { platform: 'web', lastSeenAt: NOW - 7_200 });
    const overview = overviewOf([phone, browser, here, tablet]);
    expect(overview.current).toBe(here);
    expect(
      overview.groups.map((group) => [group.key, group.sessions.map((row) => row.id)])
    ).toEqual([
      ['mobile', [tablet.id, phone.id]],
      ['desktop', [browser.id]],
    ]);
    expect(overview.others).toHaveLength(3);
  });

  test('an unidentified platform gets its own group only when it has sessions', () => {
    const unknown = session('e', { platform: 'unknown' });
    expect(overviewOf([unknown]).groups.map((group) => group.key)).toEqual(['other']);
    expect(overviewOf([session('f', { current: true })]).groups).toEqual([]);
  });

  test('platforms fall into mobile and desktop', () => {
    expect([
      groupOf('android'),
      groupOf('ios'),
      groupOf('desktop'),
      groupOf('web'),
      groupOf('unknown'),
    ]).toEqual(['mobile', 'mobile', 'desktop', 'desktop', 'other']);
  });
});

describe('activityOf', () => {
  test('recent use reads as now, then minutes, hours, days and finally a date', () => {
    expect(activityOf(NOW - 30, NOW)).toEqual({ kind: 'now' });
    expect(activityOf(NOW + 30, NOW)).toEqual({ kind: 'now' });
    expect(activityOf(NOW - 300, NOW)).toEqual({ kind: 'minutes', count: 5 });
    expect(activityOf(NOW - 3 * 3_600 - 59, NOW)).toEqual({ kind: 'hours', count: 3 });
    expect(activityOf(NOW - 2 * 86_400, NOW)).toEqual({ kind: 'days', count: 2 });
    expect(activityOf(NOW - 8 * 86_400, NOW)).toEqual({ kind: 'date' });
  });
});

describe('optimistic session removal', () => {
  test('a pending revoke hides the row and a rollback brings it back', () => {
    const registry = new OptimisticRegistry({
      schedule: () => () => undefined,
      ttlMs: 60_000,
      graceMs: 0,
    });
    const here = session('a', { current: true });
    const phone = session('b');
    const rows = [here, phone];
    const intent = registry.begin({ table: 'session', kind: 'delete', recordId: phone.id });
    expect(applyIntents(rows, registry.snapshot(), SESSION_LENSES).map((row) => row.id)).toEqual([
      here.id,
    ]);
    registry.rollback(intent.id);
    expect(applyIntents(rows, registry.snapshot(), SESSION_LENSES)).toBe(rows);
  });
});

describe('connected devices for the owner', () => {
  const overview = {
    users: [
      { userId: 4, sessions: [session('a', { lastSeenAt: NOW - 3_600 })] },
      {
        userId: 1,
        sessions: [
          session('b', { platform: 'desktop', lastSeenAt: NOW - 7_200, current: true }),
          session('c', { platform: 'ios', lastSeenAt: NOW - 60 }),
        ],
      },
    ],
  };

  test('users come most recently active first, each with its latest device first', () => {
    const users = connectedUsersOf(sessionRowsOf(overview));
    expect(users.map((user) => user.userId)).toEqual([1, 4]);
    expect(users[0]?.sessions.map((item) => item.platform)).toEqual(['ios', 'desktop']);
    expect(users[0]?.lastSeenAt).toBe(NOW - 60);
    expect(users[0]?.groups).toEqual(['mobile', 'desktop']);
    expect(users[1]?.groups).toEqual(['mobile']);
  });

  test('no answer yet is no rows, not an error', () => {
    expect(sessionRowsOf(null)).toEqual([]);
    expect(connectedUsersOf([])).toEqual([]);
  });

  test('closed sessions leave, and a user with none left leaves with them', () => {
    const remaining = withoutSessions(overview, [session('a').id, session('b').id]);
    expect(remaining?.users.map((user) => user.userId)).toEqual([1]);
    expect(remaining?.users[0]?.sessions.map((item) => item.id)).toEqual([session('c').id]);
    expect(withoutSessions(overview, [])).toBe(overview);
    expect(withoutSessions(null, ['x'])).toBeNull();
  });
});

describe('sessionInsightsOf', () => {
  test('counts open and active-today sessions, the nearest expiry and the latest sign-ins', () => {
    const sessions = [
      session('a', { current: true, lastSeenAt: NOW - 3 * 86_400, createdAt: NOW - 10, expiresAt: NOW + 900 }),
      session('b', { lastSeenAt: NOW - 3_600, createdAt: NOW - 5_000, expiresAt: NOW + 100 }),
      session('c', { lastSeenAt: NOW - 2 * 86_400, createdAt: NOW - 90_000, expiresAt: NOW - 1 }),
    ];
    const insights = sessionInsightsOf(sessions, NOW, 2);
    expect(insights.open).toBe(3);
    expect(insights.activeToday).toBe(2);
    expect(insights.nextExpiry).toBe(NOW + 100);
    expect(insights.recentSignIns.map((item) => item.id)).toEqual(sessions.slice(0, 2).map((item) => item.id));
  });

  test('no sessions means nothing open and no expiry', () => {
    const insights = sessionInsightsOf([], NOW, 4);
    expect(insights).toEqual({ open: 0, activeToday: 0, nextExpiry: null, recentSignIns: [] });
  });
});
