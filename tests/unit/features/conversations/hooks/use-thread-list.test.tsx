import { describe, expect, test } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import type { LegendListRef } from '@legendapp/list/react-native';
import { useThreadList } from '@/features/conversations/hooks/use-thread-list';

const input = {
  rows: [],
  startOfDay: (at: number) => at,
  typing: false,
  reduceMotion: false,
  live: true,
  newest: null,
  hasOlder: false,
  loadOlder: async () => false,
  loadNewer: async () => false,
  toLatest: () => undefined,
};

describe('the thread list', () => {
  test('once the list has drawn its rows it lands on the newest message, without animation', async () => {
    const scrolled: unknown[] = [];
    const { result } = renderHook(() => useThreadList(input));
    result.current.listRef.current = {
      scrollToEnd: (options: unknown) => {
        scrolled.push(options);
        return Promise.resolve();
      },
    } as unknown as LegendListRef;
    act(() => result.current.onLoad());
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    expect(scrolled).toEqual([{ animated: false }]);
  });
});
