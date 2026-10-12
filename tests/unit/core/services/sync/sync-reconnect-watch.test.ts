import { describe, expect, mock, test } from 'bun:test';

type AppStateListener = (state: string) => void;
type NetworkState = {
  isConnected?: boolean;
  isInternetReachable?: boolean;
  type?: string;
};
type NetworkListener = (state: NetworkState) => void;
const appStateListeners = new Set<AppStateListener>();
const removedAppState = new Set<AppStateListener>();
const networkListeners = new Set<NetworkListener>();
const removedNetwork = new Set<NetworkListener>();
let installedState: NetworkState = {
  isConnected: true,
  isInternetReachable: true,
  type: 'WIFI',
};

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
          removedAppState.add(listener);
        },
      };
    },
  },
}));

mock.module('expo-network', () => ({
  getNetworkStateAsync: async () => installedState,
  addNetworkStateListener: (listener: NetworkListener) => {
    networkListeners.add(listener);
    return {
      remove: () => {
        networkListeners.delete(listener);
        removedNetwork.add(listener);
      },
    };
  },
}));

const { watchReconnectOpportunities } = await import('@/core/services/sync/sync-reconnect-watch');

const fireAppState = (state: string): void => {
  for (const listener of appStateListeners) listener(state);
};

const fireNetwork = (state: NetworkState): void => {
  for (const listener of networkListeners) listener(state);
};

const settled = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('the reconnect watch', () => {
  test('coming to the foreground retries and staying in the background does not', async () => {
    let retries = 0;
    const removedBefore = removedAppState.size;
    const stop = watchReconnectOpportunities(() => {
      retries += 1;
    });
    await settled();

    fireAppState('background');
    expect(retries).toBe(0);
    fireAppState('active');
    expect(retries).toBe(1);

    stop();
    expect(removedAppState.size).toBe(removedBefore + 1);
    expect(appStateListeners.size).toBe(0);
  });

  test('a network that returns retries once, and repeats of the same state do not', async () => {
    let retries = 0;
    const stop = watchReconnectOpportunities(() => {
      retries += 1;
    });
    await settled();

    fireNetwork({ isConnected: true, isInternetReachable: true });
    expect(retries).toBe(0);

    fireNetwork({ isConnected: false, isInternetReachable: false });
    expect(retries).toBe(0);
    fireNetwork({ isConnected: false, isInternetReachable: false });
    expect(retries).toBe(0);

    fireNetwork({ isConnected: true, isInternetReachable: true });
    expect(retries).toBe(1);
    fireNetwork({ isConnected: true, isInternetReachable: true });
    expect(retries).toBe(1);

    stop();
  });

  test('a local network with no internet at all still fires on the return', async () => {
    let retries = 0;
    const stop = watchReconnectOpportunities(() => {
      retries += 1;
    });
    await settled();

    fireNetwork({ isConnected: false, isInternetReachable: false, type: 'WIFI' });
    expect(retries).toBe(0);

    fireNetwork({ isConnected: true, isInternetReachable: false, type: 'WIFI' });
    expect(retries).toBe(1);

    stop();
  });

  test('an interface change while connected fires once, and a repeat of it does not', async () => {
    let retries = 0;
    const stop = watchReconnectOpportunities(() => {
      retries += 1;
    });
    await settled();

    fireNetwork({ isConnected: true, isInternetReachable: true, type: 'WIFI' });
    expect(retries).toBe(0);

    fireNetwork({ isConnected: true, isInternetReachable: true, type: 'CELLULAR' });
    expect(retries).toBe(1);

    fireNetwork({ isConnected: true, isInternetReachable: true, type: 'CELLULAR' });
    expect(retries).toBe(1);

    fireNetwork({ isConnected: true, isInternetReachable: true, type: 'ETHERNET' });
    expect(retries).toBe(2);

    stop();
  });

  test('a watch installed while the network is down still sees it return', async () => {
    let retries = 0;
    installedState = { isConnected: false, isInternetReachable: false };
    const stop = watchReconnectOpportunities(() => {
      retries += 1;
    });
    await settled();

    fireNetwork({ isConnected: true, isInternetReachable: true });

    expect(retries).toBe(1);
    installedState = { isConnected: true, isInternetReachable: true };
    stop();
  });

  test('after the cleanup nothing fires, and a second install is a no-op', async () => {
    let retries = 0;
    const removedBefore = removedNetwork.size;
    const first = watchReconnectOpportunities(() => {
      retries += 1;
    });
    const second = watchReconnectOpportunities(() => {
      retries += 1;
    });
    await settled();
    expect(appStateListeners.size).toBe(1);
    expect(networkListeners.size).toBe(1);

    first();
    second();
    expect(removedNetwork.size).toBe(removedBefore + 1);

    fireAppState('active');
    fireNetwork({ isConnected: false, isInternetReachable: false });
    fireNetwork({ isConnected: true, isInternetReachable: true });

    expect(retries).toBe(0);
    expect(networkListeners.size).toBe(0);
  });
});
