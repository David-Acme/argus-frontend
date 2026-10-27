import { describe, expect, mock, test } from 'bun:test';
import { renderHook } from '@testing-library/react';
import type { IConversationMessageCacheRow, IConversationThreadCache } from '@/core/interfaces';
import '../../../shared/ui/translation-stub';

const row = (id: number): IConversationMessageCacheRow => ({
  id: String(id),
  counterpartId: 0,
  counterpartName: '',
  direction: id % 2 === 0 ? 'in' : 'out',
  kind: 'turn',
  body: `Línea ${id}`,
  leg: null,
  state: 'delivered',
  messageKey: `k${id}`,
  replyToKey: null,
  result: null,
  via: null,
  receipt: null,
  voiceNote: null,
  isRead: true,
  createdAt: id * 1000,
});

const stored = new Map<string, unknown>();

const NO_SUMMARIES: readonly unknown[] = [];

const PAGE: IConversationThreadCache = {
  rows: Array.from({ length: 30 }, (_, index) => row(index + 1)),
  hasOlder: true,
  live: true,
};

mock.module('@/core/services/view-cache.service', () => ({
  viewCacheService: {
    subscribe: () => () => undefined,
    valueSnapshot: (key: string, scope?: string) => stored.get(`${key}|${scope ?? ''}`) ?? null,
    rowsSnapshot: () => NO_SUMMARIES,
  },
}));
mock.module('@/core/services/view-cache-coordinator.service', () => ({
  viewCacheCoordinatorService: {
    watchPages: () => undefined,
    releasePages: () => undefined,
    extendPages: () => Promise.resolve(false),
    resetPages: () => undefined,
  },
}));
mock.module('@/core/services/conversation.service', () => ({ conversationService: {} }));
mock.module('@/core/stores', () => ({
  useAuthStore: (select: (state: { user: { id: number } }) => unknown) =>
    select({ user: { id: 7 } }),
}));
mock.module('@/shared/libs/optimistic-action', () => ({
  runOptimistic: () => Promise.resolve(null),
}));
mock.module('@/shared/hooks/use-optimistic-rows', () => ({
  useOptimisticRows: (rows: readonly IConversationMessageCacheRow[]) => ({ rows }),
}));
mock.module('expo-router', () => ({ useIsFocused: () => false }));

const { useConversationThread } =
  await import('@/features/conversations/hooks/use-conversation-thread');

describe('opening a thread', () => {
  test('its first render already holds the cached tail, read synchronously, with no effect and no await', () => {
    stored.set('conversation.thread|0', PAGE);
    const renders: number[] = [];
    renderHook(() => {
      const thread = useConversationThread(0);
      renders.push(thread.messages.length);
      return thread;
    });
    expect(renders[0]).toBe(30);
    expect(renders.every((count) => count === 30)).toBe(true);
  });

  test('a thread never opened on this device paints its empty frame at once', () => {
    const { result } = renderHook(() => useConversationThread(9));
    expect(result.current.messages).toEqual([]);
    expect(result.current.loaded).toBe(false);
  });
});
