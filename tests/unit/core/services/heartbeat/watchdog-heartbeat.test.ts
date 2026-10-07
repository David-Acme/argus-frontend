import { describe, expect, test } from 'bun:test';
import { readHeartbeat } from '@/core/contracts/heartbeat.contract';
import {
  nextNoticeCheckMs,
  pingIntervalMs,
  planFor,
  readPushHeartbeat,
  watchdogNotice,
} from '@/core/services/heartbeat/heartbeat-plan';
import type { IHeartbeat } from '@/core/interfaces';

const beat = (patch: Partial<IHeartbeat> = {}): IHeartbeat => ({
  at: 1_000,
  intervalSeconds: 60,
  graceSeconds: 2700,
  socketGraceSeconds: 180,
  armed: false,
  presence: 'home',
  presenceSince: 900,
  guard: 'alive',
  guardSeenAt: 995,
  ...patch,
});

describe('heartbeat contract', () => {
  test('reads the server payload and refuses anything else', () => {
    expect(readHeartbeat(beat())).toEqual(beat());
    expect(readHeartbeat({ ...beat(), presence: 'elsewhere' })).toBeNull();
    expect(readHeartbeat({ ...beat(), armed: 'yes' })).toBeNull();
    expect(readHeartbeat(null)).toBeNull();
  });
});

describe('dead man plan', () => {
  test('an away heartbeat schedules the alarm grace seconds after it arrived', () => {
    expect(planFor({ beat: beat({ armed: true, presence: 'away' }), receivedAt: 10_000 })).toEqual({
      kind: 'arm',
      fireAt: 10_000 + 2700 * 1000,
      lastHeardAt: 10_000,
    });
  });

  test('home and unknown never leave an alarm behind', () => {
    expect(planFor({ beat: beat({ presence: 'home' }), receivedAt: 10_000 })).toEqual({ kind: 'disarm' });
    expect(planFor({ beat: beat({ presence: 'unknown' }), receivedAt: 10_000 })).toEqual({ kind: 'disarm' });
  });

  test('the socket ping follows the server cadence with a floor', () => {
    expect(pingIntervalMs(null)).toBe(60_000);
    expect(pingIntervalMs({ beat: beat({ intervalSeconds: 30 }), receivedAt: 0 })).toBe(30_000);
    expect(pingIntervalMs({ beat: beat({ intervalSeconds: 1 }), receivedAt: 0 })).toBe(15_000);
  });
});

describe('in-app notice', () => {
  const record = { beat: beat(), receivedAt: 100_000 };

  test('a short blip says nothing, a long silence names the last heartbeat', () => {
    expect(
      watchdogNotice({ record, connected: false, disconnectedAt: 110_000, now: 110_000 + 179_000 })
    ).toEqual({ kind: 'none' });
    expect(
      watchdogNotice({ record, connected: false, disconnectedAt: 110_000, now: 110_000 + 180_000 })
    ).toEqual({ kind: 'silent', since: 100_000 });
    expect(watchdogNotice({ record, connected: true, disconnectedAt: null, now: 10_000_000 })).toEqual({
      kind: 'none',
    });
  });

  test('a heartbeat remembered from long ago waits the grace from this disconnect', () => {
    const old = { beat: beat(), receivedAt: 1_000 };
    expect(watchdogNotice({ record: old, connected: false, disconnectedAt: 500_000, now: 600_000 })).toEqual({
      kind: 'none',
    });
    expect(nextNoticeCheckMs({ record: old, connected: false, disconnectedAt: 500_000, now: 600_000 })).toBe(80_000);
    expect(watchdogNotice({ record: old, connected: false, disconnectedAt: 500_000, now: 680_000 })).toEqual({
      kind: 'silent',
      since: 1_000,
    });
  });

  test('without any heartbeat the disconnect itself is the reference', () => {
    expect(watchdogNotice({ record: null, connected: false, disconnectedAt: 0, now: 180_000 })).toEqual({
      kind: 'silent',
      since: 0,
    });
    expect(nextNoticeCheckMs({ record: null, connected: true, disconnectedAt: null, now: 1 })).toBeNull();
  });
});

describe('push heartbeat', () => {
  test('finds the heartbeat in the shapes a data push arrives in', () => {
    const payload = { ...beat({ armed: true, presence: 'away' }), kind: 'heartbeat' };
    expect(readHeartbeat(readPushHeartbeat(payload))).not.toBeNull();
    expect(readHeartbeat(readPushHeartbeat({ data: payload }))).not.toBeNull();
    expect(readHeartbeat(readPushHeartbeat({ body: JSON.stringify(payload) }))).not.toBeNull();
    expect(readPushHeartbeat({ data: { kind: 'call' } })).toBeNull();
    expect(readPushHeartbeat('x')).toBeNull();
  });
});
