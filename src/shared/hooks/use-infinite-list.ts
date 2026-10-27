import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PagedViewKey } from '@/core/services/view-cache-coordinator.service';
import { viewCacheCoordinatorService } from '@/core/services/view-cache-coordinator.service';
import type { RemoteFeed, RemoteFeedSnapshot } from '@/core/services/paging';
import { createReloadGate, matchesResourceMatch, resourceMatchKey, resourceSignal } from '@/core/services/sync/resource-signal';
import type { InfiniteFooter, PagedRows, ResourceMatch } from '@/core/types';
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
const NO_RESOURCES: readonly ResourceMatch[] = [];

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

export function useRemoteFeed<T, C>(
  feed: RemoteFeed<T, C>,
  scope: string,
  enabled = true,
  resources: readonly ResourceMatch[] = []
) {
  const snapshot = useViewCacheValue<RemoteFeedSnapshot<T, C>>(feed.key, scope);
  const [failed, setFailed] = useState(false);
  const resourcesRef = useRef(resources);

  const run = useCallback(async () => {
    setFailed(!(await feed.refresh(scope)));
  }, [feed, scope]);

  const gateRef = useRef<{ run: () => Promise<void>; reload: () => Promise<void> } | null>(null);

  const reload = useCallback((): Promise<void> => {
    if (gateRef.current?.run !== run) gateRef.current = { run, reload: createReloadGate(run) };
    return gateRef.current.reload();
  }, [run]);

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

  const resourceKey = resources.map(resourceMatchKey).join('|');

  useEffect(() => {
    resourcesRef.current = resources;
  }, [resources]);

  useEffect(() => {
    if (!enabled || resourceKey === '') return undefined;
    return resourceSignal.onChanged((notice) => {
      if (!matchesResourceMatch(resourcesRef.current, notice)) return;
      void reload();
    });
  }, [enabled, reload, resourceKey]);

  useEffect(() => {
    if (!enabled) return undefined;
    return resourceSignal.onReconnected(() => {
      void reload();
    });
  }, [enabled, reload]);

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

export type PagedListOptions = { enabled?: boolean; endAfter?: number };

export function usePagedList<T, S extends PagedRows<T> = PagedRows<T>>(
  key: PagedViewKey,
  scope: string,
  { enabled = true, endAfter }: PagedListOptions = {}
) {
  const view = usePagedView<T, S>(key, scope, enabled);
  const paging = useInfiniteList({
    count: view.rows.length,
    hasMore: view.snapshot !== null && view.hasMore,
    loadMore: view.loadMore,
    endAfter,
  });
  return { ...view, paging };
}

export type FeedListOptions = PagedListOptions & {
  resources?: readonly ResourceMatch[];
  waiting?: boolean;
};

export function useFeedList<T, C>(
  feed: RemoteFeed<T, C>,
  scope: string,
  { enabled = true, endAfter, resources = NO_RESOURCES, waiting = false }: FeedListOptions = {}
) {
  const list = useRemoteFeed(feed, scope, enabled, resources);
  const paging = useInfiniteList({
    count: list.rows.length,
    hasMore: waiting || list.hasMore,
    loadMore: list.loadMore,
    endAfter,
  });
  return { ...list, paging };
}
