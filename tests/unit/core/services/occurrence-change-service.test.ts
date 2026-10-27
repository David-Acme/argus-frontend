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
      sent.push({ method, path: new URL(url).pathname, body: body === undefined ? undefined : JSON.parse(body) });
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
const { calendarEventService } = await import('@/core/services/calendar-event.service');

registerHttpAuth({
  credential: () => ({ accessToken: null, version: 1 }),
  refreshSession: async () => 'rejected',
  clearSession: async () => undefined,
});

describe('changing one occurrence of a series', () => {
  beforeEach(() => {
    sent.length = 0;
  });

  test('an event occurrence is patched under the event, with its original start and only what changes', async () => {
    const result = await calendarEventService.changeOccurrence('9', {
      occurrence: 1791205200,
      title: 'Piano tarde',
      location: 'Casa',
      startsAt: 1791212400,
    });
    expect(result.ok).toBe(true);
    expect(sent).toEqual([
      {
        method: 'PATCH',
        path: '/calendar-event/9/occurrence',
        body: { occurrence: 1791205200, title: 'Piano tarde', location: 'Casa', startsAt: 1791212400 },
      },
    ]);
  });
});
