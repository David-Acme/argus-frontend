import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PagedViewKey } from '@/core/services/view-cache-coordinator.service';
import { viewCacheCoordinatorService } from '@/core/services/view-cache-coordinator.service';
import type { RemoteFeed, RemoteFeedSnapshot } from '@/core/services/paging';
import type { InfiniteFooter, PagedRows } from '@/core/types';
import { infiniteFooter } from '@/shared/libs/infinite-list';
import { useViewCacheValue } from './use-cached-rows';
import type { RemoteResourceStatus } from './use-remote-resource';

export type InfiniteSource = {
  count: number;
  hasMore: boolean;
  loadMore?: () => Promise<boolean>;
  endAfter?: number;
};

export type InfiniteListState = {
  footer: InfiniteFooter;
  loading: boolean;
  onEndReached: () => void;
  retry: () => void;
};

const SETTLE_MS = 1500;
const DEFAULT_END_AFTER = 20;
const NO_ROWS: readonly never[] = [];

export function useInfiniteList({
  count,
  hasMore,
  loadMore,
  endAfter = DEFAULT_END_AFTER,
}: InfiniteSource): InfiniteListState {
  const [failed, setFailed] = useState(false);
  const [awaiting, setAwaiting] = useState<number | null>(null);
  const [inFlight, setInFlight] = useState(false);
  const running = useRef(false);

  const run = useCallback(async () => {
    if (!loadMore || running.current) return;
    running.current = true;
    setInFlight(true);
    const started = count;
    const ok = await loadMore().catch(() => false);
    setFailed(!ok);
    if (ok) {
      setAwaiting(started);
      return;
    }
    running.current = false;
    setInFlight(false);
  }, [count, loadMore]);

  const onEndReached = useCallback(() => {
    if (hasMore && !failed) void run();
  }, [failed, hasMore, run]);

  const retry = useCallback(() => {
    setFailed(false);
    void run();
  }, [run]);

  useEffect(() => {
    if (awaiting === null) return;
    const settle = () => {
      running.current = false;
      setAwaiting(null);
      setInFlight(false);
    };
    if (count !== awaiting || !hasMore) {
      settle();
      return;
    }
    const timer = setTimeout(settle, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [awaiting, count, hasMore]);

  return {
    footer: infiniteFooter({ count, hasMore, failed, endAfter }),
    loading: inFlight,
    onEndReached,
    retry,
  };
}

export function usePagedView<T, S extends PagedRows<T> = PagedRows<T>>(
  key: PagedViewKey,
  scope: string,
  enabled = true
) {
  const cached = useViewCacheValue<S>(key, scope);
  const snapshot = enabled ? cached : null;
  const loadMore = useCallback(
    () => viewCacheCoordinatorService.extendPages(key, scope),
    [key, scope]
  );

  useEffect(() => {
    if (!enabled) return;
    viewCacheCoordinatorService.watchPages(key, scope);
    return () => viewCacheCoordinatorService.releasePages(key, scope);
  }, [enabled, key, scope]);

  return {
    snapshot,
    rows: snapshot?.rows ?? (NO_ROWS as readonly T[]),
    hasMore: snapshot?.hasMore ?? false,
    loadMore,
  };
}

export function useRemoteFeed<T, C>(feed: RemoteFeed<T, C>, scope: string, enabled = true) {
  const snapshot = useViewCacheValue<RemoteFeedSnapshot<T, C>>(feed.key, scope);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    setFailed(!(await feed.refresh(scope)));
  }, [feed, scope]);

  const loadMore = useCallback(() => feed.loadMore(scope), [feed, scope]);

  const mutate = useCallback(
    (update: (rows: readonly T[]) => readonly T[]) => feed.mutate(scope, update),
    [feed, scope]
  );

  useFocusEffect(
    useCallback(() => {
      if (enabled) void reload();
    }, [enabled, reload])
  );

  useEffect(() => {
    if (enabled) feed.focus(scope);
  }, [enabled, feed, scope]);

  const status: RemoteResourceStatus = !enabled
    ? 'idle'
    : snapshot != null
      ? 'ready'
      : failed
        ? 'failed'
        : 'loading';

  return {
    rows: enabled && snapshot ? snapshot.rows : (NO_ROWS as readonly T[]),
    hasMore: enabled && snapshot?.next != null,
    status,
    reload,
    loadMore,
    mutate,
  };
}
