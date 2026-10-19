import { describe, expect, test } from 'bun:test';
import { RTC_ICE_ROUTE, RtcIceSource, iceCacheFresh, readIceServers } from '@/core/services/rtc-ice/rtc-ice';

const relay = {
  urls: ['turn:turn.example:3478?transport=udp', 'turns:turn.example:5349?transport=tcp'],
  username: '1800000000:7',
  credential: 'nvgSm1oHwSfK7YbCFCNNQAthpc0=',
};

const granted = (expiresAt: number, iceServers: unknown[] = [relay]) => ({
  status: 200,
  ok: true,
  info: { iceServers, expiresAt },
  errors: null,
});

describe('relay credentials', () => {
  test('a valid answer gives its relays, anything else gives none', () => {
    expect(readIceServers(granted(1800000000))).toEqual({ servers: [relay], expiresAt: 1800000000 });
    expect(readIceServers(granted(0, []))).toEqual({ servers: [], expiresAt: 0 });
    expect(readIceServers(granted(10, [{ ...relay, urls: ['http://x'] }])).servers).toEqual([]);
    expect(
      readIceServers({ status: 404, ok: false, info: null, errors: { code: 'NOT_FOUND', message: '' } }),
    ).toEqual({ servers: [], expiresAt: 0 });
  });

  test('a cache is fresh until a minute before it expires', () => {
    expect(iceCacheFresh(null, 100)).toBe(false);
    expect(iceCacheFresh({ servers: [relay], expiresAt: 1000 }, 900)).toBe(true);
    expect(iceCacheFresh({ servers: [relay], expiresAt: 1000 }, 940)).toBe(false);
    expect(iceCacheFresh({ servers: [], expiresAt: 1000 }, 100)).toBe(false);
  });

  test('the source asks once while fresh, again near the expiry, and never throws', async () => {
    const asked: string[] = [];
    let now = 1000;
    let fail = false;
    const source = new RtcIceSource(async (path) => {
      asked.push(path);
      if (fail) throw new Error('NETWORK_ERROR');
      return granted(now + 3600);
    }, () => now);
    expect(await source.servers()).toEqual([relay]);
    expect(await source.servers()).toEqual([relay]);
    expect(asked).toEqual([RTC_ICE_ROUTE]);
    now += 3590;
    expect(await source.servers()).toEqual([relay]);
    expect(asked.length).toBe(2);
    source.forget();
    fail = true;
    expect(await source.servers()).toEqual([]);
  });
});
