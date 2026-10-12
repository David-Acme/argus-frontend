import { describe, expect, mock, test } from 'bun:test';

type AppStateListener = (state: string) => void;
const appStateListeners = new Set<AppStateListener>();
const removed = new Set<AppStateListener>();

mock.module('react-native', () => ({
  Platform: {
    OS: 'web',
    select: <T,>(options: { web?: T; default?: T }) => options.web ?? options.default,
  },
  AppState: {
    currentState: 'active',
    addEventListener: (_event: string, listener: AppStateListener) => {
      appStateListeners.add(listener);
      return {
        remove: () => {
          appStateListeners.delete(listener);
          removed.add(listener);
        },
      };
    },
  },
}));

const { watchReconnectOpportunities } = await import('@/core/services/sync/sync-reconnect-watch');

describe('the reconnect watch', () => {
  test('coming to the foreground retries and staying in the background does not', () => {
    let retries = 0;
    const stop = watchReconnectOpportunities(() => {
      retries += 1;
    });
    const listener = [...appStateListeners][0];

    listener?.('background');
    expect(retries).toBe(0);
    listener?.('active');
    expect(retries).toBe(1);

    stop();
    expect(removed.size).toBe(1);
    expect(appStateListeners.size).toBe(0);
  });

  test('the web online event retries, and a second install is a no-op', () => {
    let retries = 0;
    const first = watchReconnectOpportunities(() => {
      retries += 1;
    });
    const second = watchReconnectOpportunities(() => {
      retries += 1;
    });
    expect(appStateListeners.size).toBe(1);

    globalThis.dispatchEvent(new Event('online'));
    expect(retries).toBe(1);

    first();
    second();
  });
});
