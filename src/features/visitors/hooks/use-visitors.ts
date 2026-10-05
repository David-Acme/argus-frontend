import { useCallback, useEffect, useMemo, useState } from 'react';
import type { VisitorSettings, VisitorSummary } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useInfiniteList, useRemoteFeed } from '@/shared/hooks/use-infinite-list';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { RemoteFeedSnapshot } from '@/core/services/paging';
import { VISITOR_PAGE_SIZE, VISITOR_SEARCH_DEBOUNCE_MS } from '@/features/visitors/constants';
import {
  filterVisitors,
  mergedInto,
  patchVisitor,
  VISITOR_ALL_SCOPE,
  visitorFeedScope,
  withoutVisitors,
  type VisitorQuery,
} from '@/features/visitors/model/visitor';
import {
  type VisitorUpdate,
  visitorFeed,
  visitorService,
} from '@/features/visitors/services/visitor.service';

export type RenameVisitorInput = {
  visitor: VisitorSummary;
  update: VisitorUpdate;
};

export type MergeVisitorsInput = {
  target: VisitorSummary;
  sourceIds: number[];
};

const loadSettings = () => visitorService.settings();

const NO_VISITORS: readonly VisitorSummary[] = [];

export function useVisitorFeed({ filter, search }: VisitorQuery) {
  const [settled, setSettled] = useState(search);
  const scope = visitorFeedScope({ filter, search: settled });
  const feed = useRemoteFeed(visitorFeed, scope);
  const base = useViewCacheValue<RemoteFeedSnapshot<VisitorSummary, unknown>>(
    visitorFeed.key,
    VISITOR_ALL_SCOPE
  );
  const pending = feed.status === 'loading' || settled !== search;
  const rows = useMemo(
    () => (pending ? filterVisitors(base?.rows ?? NO_VISITORS, filter, search) : feed.rows),
    [base, feed.rows, filter, pending, search]
  );
  const paging = useInfiniteList({
    count: feed.rows.length,
    hasMore: pending || feed.hasMore,
    loadMore: feed.loadMore,
    endAfter: VISITOR_PAGE_SIZE,
  });

  useEffect(() => {
    if (search === settled) return;
    const timer = setTimeout(() => setSettled(search), VISITOR_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, settled]);

  return {
    rows,
    paging,
    status: feed.status,
    known: base != null || feed.status === 'ready',
    reload: feed.reload,
  };
}

export function useVisitors() {
  const { t } = useTranslation();
  const settings = useRemoteResource<VisitorSettings>({
    cacheKey: VIEW_CACHE_KEYS.visitorSettings,
    load: loadSettings,
  });
  const { run, pending } = useServiceAction();
  const { reload: reloadSettings, mutate: mutateSettings } = settings;

  const reload = useCallback(async () => {
    await Promise.all([visitorFeed.refresh(VISITOR_ALL_SCOPE), reloadSettings()]);
  }, [reloadSettings]);

  const update = useCallback(
    async ({ visitor, update: change }: RenameVisitorInput) => {
      const result = await run({
        call: async () => {
          const undo = visitorFeed.mutateAll((rows) => patchVisitor(rows, visitor.id, change));
          const answer = await visitorService.update(visitor.id, change);
          if (!answer.ok) undo();
          return answer;
        },
        errorTitle: t('screens.visitors.save-error'),
      });
      return result?.info ?? null;
    },
    [run, t]
  );

  const remove = useCallback(
    async (visitor: VisitorSummary, label: string) => {
      const result = await run({
        confirm: {
          title: t('screens.visitors.delete-title', { name: label }),
          description: t('screens.visitors.delete-description'),
          confirmLabel: t('screens.visitors.delete'),
          intent: 'danger',
        },
        call: async () => {
          const undo = visitorFeed.mutateAll((rows) => withoutVisitors(rows, [visitor.id]));
          const answer = await visitorService.remove(visitor.id);
          if (!answer.ok) undo();
          return answer;
        },
        success: t('screens.visitors.deleted', { name: label }),
        errorTitle: t('screens.visitors.delete-error'),
      });
      return result !== null;
    },
    [run, t]
  );

  const merge = useCallback(
    async ({ target, sourceIds }: MergeVisitorsInput) => {
      const result = await run({
        confirm: {
          title: t('screens.visitors.merge-title'),
          description: t('screens.visitors.merge-description'),
          confirmLabel: t('screens.visitors.merge'),
          intent: 'warning',
        },
        call: async () => {
          const undo = visitorFeed.mutateAll((rows) => mergedInto(rows, target, sourceIds));
          const answer = await visitorService.merge(target.id, sourceIds);
          if (!answer.ok) undo();
          return answer;
        },
        success: t('screens.visitors.merged'),
        errorTitle: t('screens.visitors.merge-error'),
      });
      if (result) void visitorFeed.refresh(VISITOR_ALL_SCOPE);
      return result?.info ?? null;
    },
    [run, t]
  );

  const setRetention = useCallback(
    async (days: number) => {
      let before: VisitorSettings | null = null;
      const result = await run({
        call: async () => {
          mutateSettings((previous) => {
            before = previous;
            return previous ? { ...previous, unnamedRetentionDays: days } : previous;
          });
          const answer = await visitorService.updateSettings(days);
          if (!answer.ok) mutateSettings(() => before);
          return answer;
        },
        errorTitle: t('screens.visitors.retention-error'),
      });
      return result !== null;
    },
    [mutateSettings, run, t]
  );

  return {
    settings: settings.data,
    pending,
    reload,
    update,
    remove,
    merge,
    setRetention,
  };
}
