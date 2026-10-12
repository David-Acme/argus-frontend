import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { ResourceNotice } from '@/core/types';

const connectListeners = new Set<() => void>();
const disconnectListeners = new Set<() => void>();
let frameListener: ((message: { info: unknown }) => void) | null = null;

mock.module('@/core/services/sync', () => ({
  synchronizeService: {
    on: (_operation: number, listener: (message: { info: unknown }) => void) => {
      frameListener = listener;
      return () => {
        frameListener = null;
      };
    },
    onConnect: (listener: () => void) => {
      connectListeners.add(listener);
      return () => connectListeners.delete(listener);
    },
    onDisconnect: (listener: () => void) => {
      disconnectListeners.add(listener);
      return () => disconnectListeners.delete(listener);
    },
  },
}));

const { bindResourceSignal } = await import('@/core/services/sync/resource-signal-binding');
const { resourceSignal } = await import('@/core/services/sync/resource-signal');

const fireConnect = (): void => {
  for (const listener of connectListeners) listener();
};

const fireDisconnect = (): void => {
  for (const listener of disconnectListeners) listener();
};

describe('the resource signal binding', () => {
  beforeEach(() => {
    bindResourceSignal();
  });

  test('the first connect after a mount is not a reconnect', () => {
    let reloads = 0;
    const stop = resourceSignal.onReconnected(() => {
      reloads += 1;
    });

    fireConnect();

    expect(reloads).toBe(0);
    stop();
  });

  test('a connect after a disconnect reloads once, and a repeat connect does not', () => {
    let reloads = 0;
    const stop = resourceSignal.onReconnected(() => {
      reloads += 1;
    });

    fireDisconnect();
    fireConnect();
    expect(reloads).toBe(1);

    fireConnect();
    expect(reloads).toBe(1);

    fireDisconnect();
    fireConnect();
    expect(reloads).toBe(2);
    stop();
  });

  test('a resource frame reaches the signal, and an unreadable one is dropped', () => {
    const seen: ResourceNotice[] = [];
    const stop = resourceSignal.onChanged((notice) => seen.push(notice));

    frameListener?.({ info: { domain: 'guard', scope: 'incidents', ids: [4] } });
    frameListener?.({ info: { domain: 'gate', scope: 'incidents' } });
    frameListener?.({ info: null });
    resourceSignal.flush();

    expect(seen).toEqual([{ domain: 'guard', scope: 'incidents', ids: [4] }]);
    stop();
  });
});
