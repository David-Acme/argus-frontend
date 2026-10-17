import { describe, expect, test } from 'bun:test';
import { notificationReadCalls, readBatches } from '@/core/services/notification';

const episode = 'guard:episode:41';

describe('reading a whole thread', () => {
  test('a thread is one request for its key, whatever the page loaded', () => {
    expect(notificationReadCalls({ threadKey: episode, ids: ['30', '10'] })).toEqual([
      { path: '/notification/thread/guard%3Aepisode%3A41/read', body: {} },
    ]);
    expect(notificationReadCalls({ threadKey: 'a b/c', ids: [] })).toEqual([
      { path: '/notification/thread/a%20b%2Fc/read', body: {} },
    ]);
  });

  test('the thread route takes the empty JSON body its ValidJsonFilter asks for', () => {
    const [call] = notificationReadCalls({ threadKey: episode, ids: [] });
    expect(call?.body).toEqual({});
    expect(Object.keys(call?.body ?? {})).toEqual([]);
  });

  test('a row without a thread key reads by id, batched like a read-all', () => {
    const ids = Array.from({ length: 1201 }, (_, index) => String(index + 1));
    const calls = notificationReadCalls({ threadKey: null, ids });
    expect(calls.map((call) => call.path)).toEqual([
      '/notification/read',
      '/notification/read',
      '/notification/read',
    ]);
    expect(calls.map((call) => call.body)).toEqual(readBatches(ids).map((batch) => ({ ids: batch })));
  });

  test('nothing to read sends nothing', () => {
    expect(notificationReadCalls({ threadKey: null, ids: [] })).toEqual([]);
  });
});
