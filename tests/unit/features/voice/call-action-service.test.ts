import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { NetHttpRequest, NetHttpResult, NetPairedInstance } from '@/core/types';

type Sent = { method: string; path: string; body: unknown };

const paired: NetPairedInstance = {
  host: 'argus.local',
  ip: '192.168.18.205',
  port: 7044,
  caPem: 'pem',
  caFingerprint: 'fingerprint',
  instanceId: 'instance',
  pairedAt: 1,
  routes: {},
};

const TOKEN = 'a'.repeat(64);
const sent: Sent[] = [];
const reply: NetHttpResult = {
  status: 200,
  headers: {},
  body: JSON.stringify({ status: 200, info: { id: 9 }, errors: null }),
};

mock.module('@/core/services/net', () => ({
  netService: {
    instance: async () => paired,
    refreshAddress: async () => false,
    request: async ({ url, method, body }: NetHttpRequest) => {
      sent.push({
        method,
        path: new URL(url).pathname,
        body: body === undefined ? undefined : JSON.parse(body),
      });
      return reply;
    },
  },
}));

mock.module('@/core/services/database.service', () => ({
  DatabaseService: class {
    readonly table: string;

    constructor(table: string) {
      this.table = table;
    }
  },
}));

const { registerHttpAuth } = await import('@/core/services/http/http-auth');
const { reminderCallService } =
  await import('@/features/voice/services/call-action/call-action.service');

registerHttpAuth({
  credential: () => ({ accessToken: null, version: 1 }),
  refreshSession: async () => 'rejected',
  clearSession: async () => undefined,
});

describe('the reminder a call names', () => {
  beforeEach(() => {
    sent.length = 0;
  });

  test('En 10 min snoozes that reminder by ten minutes', async () => {
    const answer = await reminderCallService.snooze(77);
    expect(answer.ok).toBe(true);
    expect(sent).toEqual([{ method: 'POST', path: '/reminder/77/snooze', body: { minutes: 10 } }]);
  });

  test('Marcar hecho completes that reminder', async () => {
    await reminderCallService.markDone(77);
    expect(sent).toEqual([{ method: 'PATCH', path: '/reminder/77', body: { isCompleted: true } }]);
  });

  test('the lock screen sends only the push token and the action to the call-action route', async () => {
    expect(await reminderCallService.act({ token: TOKEN, action: 'done' })).toBe(200);
    expect(sent).toEqual([
      { method: 'POST', path: '/notification/call-action', body: { token: TOKEN, action: 'done' } },
    ]);
  });
});
