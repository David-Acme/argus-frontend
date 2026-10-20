import type { LegendListRef } from '@legendapp/list/react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import {
  followNewItems,
  olderWindowStart,
  threadItems,
  threadWindow,
  type ThreadItem,
} from '@/features/conversations/model/thread-list';

export type ThreadListInput = {
  rows: readonly IConversationMessageCacheRow[];
  startOfDay: (at: number) => number;
  typing: boolean;
  reduceMotion: boolean;
};

export type ThreadListState = {
  listRef: RefObject<LegendListRef | null>;
  items: readonly ThreadItem[];
  hasOlder: boolean;
  loadOlder: () => void;
  atEnd: boolean;
  unseen: number;
  goToLatest: () => void;
};

export function useThreadList({
  rows,
  startOfDay,
  typing,
  reduceMotion,
}: ThreadListInput): ThreadListState {
  const listRef = useRef<LegendListRef | null>(null);
  const [oldestAt, setOldestAt] = useState<number | null>(() => threadWindow(rows, null).oldestAt);
  const [atEnd, setAtEnd] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const atEndRef = useRef(true);
  const lastKey = useRef<string | null>(null);
  const unseenRef = useRef(0);
  const view = useMemo(() => threadWindow(rows, oldestAt), [rows, oldestAt]);
  const items = useMemo(
    () => threadItems({ rows: view.rows, startOfDay, typing }),
    [startOfDay, typing, view.rows]
  );
  const { hasOlder, oldestAt: windowOldestAt } = view;

  const loadOlder = useCallback(() => {
    if (!hasOlder) return;
    setOldestAt(olderWindowStart(rows, windowOldestAt));
  }, [hasOlder, rows, windowOldestAt]);

  const goToLatest = useCallback(() => {
    void listRef.current?.scrollToEnd({ animated: !reduceMotion });
  }, [reduceMotion]);

  const remember = useCallback((count: number) => {
    unseenRef.current = count;
    setUnseen(count);
  }, []);

  useEffect(() => {
    const state = listRef.current?.getState();
    if (!state) return;
    return state.listen('isWithinMaintainScrollAtEndThreshold', (value) => {
      atEndRef.current = value;
      setAtEnd(value);
      if (value && unseenRef.current > 0) remember(0);
    });
  }, [remember]);

  useEffect(() => {
    const decision = followNewItems({
      items,
      lastKey: lastKey.current,
      unseen: unseenRef.current,
      atEnd: atEndRef.current,
    });
    lastKey.current = decision.lastKey;
    if (decision.unseen !== unseenRef.current) remember(decision.unseen);
    if (decision.jump) requestAnimationFrame(goToLatest);
  }, [goToLatest, items, remember]);

  return { listRef, items, hasOlder, loadOlder, atEnd, unseen, goToLatest };
}
