import type { LegendListRef } from '@legendapp/list/react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import { arrivedWhileAway, followNewItems, threadItems, type ThreadItem } from '@/features/conversations/model/thread-list';

export type ThreadListInput = {
  rows: readonly IConversationMessageCacheRow[];
  startOfDay: (at: number) => number;
  typing: boolean;
  reduceMotion: boolean;
  live: boolean;
  newest: IConversationMessageCacheRow | null;
  hasOlder: boolean;
  loadOlder: () => Promise<boolean>;
  loadNewer: () => Promise<boolean>;
  toLatest: () => void;
};

export type ThreadListState = {
  listRef: RefObject<LegendListRef | null>;
  items: readonly ThreadItem[];
  loadingOlder: boolean;
  onScroll: () => void;
  atEnd: boolean;
  unseen: number;
  goToLatest: () => void;
};

export function useThreadList({
  rows,
  startOfDay,
  typing,
  reduceMotion,
  live,
  newest,
  hasOlder,
  loadOlder,
  loadNewer,
  toLatest,
}: ThreadListInput): ThreadListState {
  const listRef = useRef<LegendListRef | null>(null);
  const [atEnd, setAtEnd] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const atEndRef = useRef(true);
  const lastKey = useRef<string | null>(null);
  const unseenRef = useRef(0);
  const newestRef = useRef<string | null>(newest?.id ?? null);
  const pendingLatest = useRef(false);
  const loadingNewer = useRef(false);
  const olderInFlight = useRef(false);
  const ready = useRef(false);
  const startArmed = useRef(true);
  const items = useMemo(() => threadItems({ rows, startOfDay, typing }), [rows, startOfDay, typing]);

  const remember = useCallback((count: number) => {
    unseenRef.current = count;
    setUnseen(count);
  }, []);

  const scrollToEnd = useCallback(() => {
    void listRef.current?.scrollToEnd({ animated: !reduceMotion });
  }, [reduceMotion]);

  const goToLatest = useCallback(() => {
    if (live) {
      scrollToEnd();
      return;
    }
    pendingLatest.current = true;
    remember(0);
    toLatest();
  }, [live, remember, scrollToEnd, toLatest]);

  const older = useCallback(() => {
    if (!hasOlder || olderInFlight.current) return;
    olderInFlight.current = true;
    setLoadingOlder(true);
    void loadOlder().finally(() => {
      olderInFlight.current = false;
      setLoadingOlder(false);
    });
  }, [hasOlder, loadOlder]);

  const newerPage = useCallback(() => {
    if (live || loadingNewer.current) return;
    loadingNewer.current = true;
    void loadNewer().finally(() => {
      loadingNewer.current = false;
    });
  }, [live, loadNewer]);

  const onScroll = useCallback(() => {
    const state = listRef.current?.getState();
    if (!state) return;
    if (!ready.current) {
      ready.current = state.isWithinMaintainScrollAtEndThreshold;
      return;
    }
    if (!state.isNearStart) startArmed.current = true;
    else if (startArmed.current) {
      startArmed.current = false;
      older();
    }
    if (state.isNearEnd) newerPage();
  }, [newerPage, older]);

  useEffect(() => {
    const state = listRef.current?.getState();
    if (!state) return;
    const stopEnd = state.listen('isWithinMaintainScrollAtEndThreshold', (value) => {
      atEndRef.current = value;
      setAtEnd(value);
      if (value && unseenRef.current > 0) remember(0);
    });
    return stopEnd;
  }, [remember]);

  useEffect(() => {
    const arrived = arrivedWhileAway({ live, previous: newestRef.current, newest });
    newestRef.current = newest?.id ?? null;
    if (arrived > 0) remember(unseenRef.current + arrived);
  }, [live, newest, remember]);

  useEffect(() => {
    const decision = followNewItems({
      live,
      items,
      lastKey: lastKey.current,
      unseen: unseenRef.current,
      atEnd: atEndRef.current && live,
    });
    lastKey.current = decision.lastKey;
    if (decision.unseen !== unseenRef.current) remember(decision.unseen);
    if (live && pendingLatest.current) {
      pendingLatest.current = false;
      requestAnimationFrame(scrollToEnd);
      return;
    }
    if (decision.jump) requestAnimationFrame(scrollToEnd);
  }, [items, live, remember, scrollToEnd]);

  return { listRef, items, loadingOlder, onScroll, atEnd, unseen, goToLatest };
}
