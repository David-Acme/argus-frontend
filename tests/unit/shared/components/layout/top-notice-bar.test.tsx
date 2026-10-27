import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { Text } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import '../../ui/translation-stub';

const state = { offline: false, retries: 0 };

mock.module('@/shared/components/layout/use-offline-notice', () => ({
  useOfflineNotice: () => state.offline,
}));
mock.module('@/shared/components/layout/use-watchdog-notice', () => ({
  useWatchdogNotice: () => ({ kind: 'none' }),
}));
mock.module('@/shared/components/layout/use-route-status', () => ({
  useRouteStatus: () => 'remote-unavailable',
  useRelayRefusalAlert: () => undefined,
}));
mock.module('@/core/services/sync/synchronize.service', () => ({
  synchronizeService: {
    ensureConnected: async () => {
      state.retries += 1;
      return true;
    },
  },
}));

mock.module('@/core/stores', async () => ({
  ...(await import('@/core/stores/toast.store')),
  ...(await import('@/core/stores/offline-toast.store')),
}));

const { TopNoticeBar } = await import('@/shared/components/layout/top-notice-bar');
const { useToastStore } = await import('@/core/stores/toast.store');

function Top() {
  const insets = useContext(SafeAreaInsetsContext);
  return <Text>{`top ${insets?.top ?? 'none'}`}</Text>;
}

function show() {
  return render(
    <SafeAreaInsetsContext.Provider value={{ top: 24, right: 0, bottom: 0, left: 0 }}>
      <TopNoticeBar>
        <Top />
      </TopNoticeBar>
    </SafeAreaInsetsContext.Provider>
  );
}

afterEach(() => {
  state.offline = false;
  state.retries = 0;
  act(() => useToastStore.getState().clear());
});

describe('TopNoticeBar', () => {
  test('online, it draws nothing and the screen keeps the status bar inset', () => {
    show();
    expect(screen.getByText('top 24')).toBeDefined();
    expect(screen.queryByText('No encuentro a Argus')).toBeNull();
  });

  test('offline, a one-line pill takes its own row, the screen below drops the inset, and nothing opens over the content', () => {
    state.offline = true;
    show();
    expect(screen.getByText('top 0')).toBeDefined();
    expect(screen.getAllByText('No encuentro a Argus')).toHaveLength(1);
    expect(useToastStore.getState().items).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(state.retries).toBe(1);
  });

  test('the pill opens its details on demand', () => {
    state.offline = true;
    show();
    fireEvent.click(screen.getByRole('button', { name: 'No encuentro a Argus' }));
    expect(useToastStore.getState().items.map((item) => item.title)).toEqual([
      'No encuentro a Argus',
    ]);
  });
});
