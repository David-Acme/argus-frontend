import { describe, expect, spyOn, test } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAppActive } from '@/shared/hooks/use-app-active';

describe('useAppActive', () => {
  test('follows the app between the foreground and the background', () => {
    let listener: ((state: AppStateStatus) => void) | null = null;
    let removed = false;
    const subscribe = spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      listener = handler as (state: AppStateStatus) => void;
      return { remove: () => (removed = true) } as ReturnType<typeof AppState.addEventListener>;
    });
    const { result, unmount } = renderHook(() => useAppActive());
    expect(result.current).toBe(AppState.currentState !== 'background');
    act(() => listener?.('background'));
    expect(result.current).toBe(false);
    act(() => listener?.('active'));
    expect(result.current).toBe(true);
    unmount();
    expect(removed).toBe(true);
    subscribe.mockRestore();
  });
});
