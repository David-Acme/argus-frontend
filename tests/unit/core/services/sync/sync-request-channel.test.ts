import { afterEach, describe, expect, jest, test } from 'bun:test';
import { backoffDelay, withJitter } from '@/core/services/sync/sync-backoff';
import { SyncRequestChannel } from '@/core/services/sync/sync-request-channel';
import { SYNC_RESPONSE_TIMEOUT_MS, WS_RECONNECT_MAX_MS } from '@/shared/constants';

afterEach(() => {
  jest.useRealTimers();
});

const channelWith = (timeouts: string[]) =>
  new SyncRequestChannel({
    isOpen: () => true,
    send: () => undefined,
    onTimeout: (reason) => timeouts.push(reason),
  });

describe('sync request channel', () => {
  test('an unanswered request is rejected and recycles the socket', async () => {
    jest.useFakeTimers();
    const timeouts: string[] = [];
    const channel = channelWith(timeouts);
    const pending = channel.requestSync({} as never);
    jest.advanceTimersByTime(SYNC_RESPONSE_TIMEOUT_MS);
    await expect(pending).rejects.toThrow('Synchronization response timeout');
    expect(timeouts).toEqual(['Synchronization response timeout']);
  });

  test('a reply resolves the pending request and nothing recycles', async () => {
    const timeouts: string[] = [];
    const channel = channelWith(timeouts);
    const pending = channel.requestAudit('user', { findLast: true });
    channel.resolveAudit('user', { info: [], watermarkId: 5 });
    expect(await pending).toEqual({ info: [], watermarkId: 5 });
    expect(timeouts).toEqual([]);
  });
});

describe('withJitter', () => {
  test('waits between half and all of the backoff', () => {
    expect(withJitter(2000, () => 0)).toBe(1000);
    expect(withJitter(2000, () => 1)).toBe(2000);
    expect(withJitter(2000, () => 0.5)).toBe(1500);
  });

  test('the backoff doubles and stops at the ceiling', () => {
    expect(backoffDelay(1, () => 1)).toBe(2 * backoffDelay(0, () => 1));
    expect(backoffDelay(30, () => 1)).toBe(WS_RECONNECT_MAX_MS);
  });
});
