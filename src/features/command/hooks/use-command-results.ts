import { useEffect } from 'react';
import type { ISearchHitCacheRow, ISearchHitsCacheValue } from '@/core/interfaces';
import type { SearchKind } from '@/core/types';
import { SEARCH_PAGE_SIZE, VIEW_CACHE_KEYS } from '@/shared/constants';
import { usePagedList, type InfiniteListState } from '@/shared/hooks/use-infinite-list';
import { useSettled } from '@/shared/hooks/use-settled';
import { encodeSearchScope, searchWords } from '@/shared/libs/text-search';
import { COMMAND_SEARCH_DEBOUNCE_MS } from '@/features/command/constants/command.constant';
import { searchEntries } from '@/features/command/model/command-entries';
import {
  groupEntries,
  scopeKinds,
  type SearchMatches,
  type SearchScopeKey,
} from '@/features/command/model/command-search';

export type CommandResultsInput = {
  query: string;
  scope: SearchScopeKey;
  allowed: ReadonlySet<SearchKind>;
  enabled: boolean;
  openedAt: number;
  since: number;
};

export type CommandResults = {
  matches: SearchMatches[];
  paging: InfiniteListState;
  pending: boolean;
};

const IDLE_SCOPE = '';

export function useCommandResults({
  query,
  scope,
  allowed,
  enabled,
  openedAt,
  since,
}: CommandResultsInput): CommandResults {
  const settled = useSettled(query, COMMAND_SEARCH_DEBOUNCE_MS);
  const words = searchWords(settled);
  const kinds = scopeKinds(scope, allowed);
  const active = enabled && words.length > 0 && kinds.length > 0;
  const key = active ? encodeSearchScope({ kinds, words, since }) : IDLE_SCOPE;
  const paged = usePagedList<ISearchHitCacheRow, ISearchHitsCacheValue>(
    VIEW_CACHE_KEYS.commandSearch,
    key,
    { enabled: active, endAfter: SEARCH_PAGE_SIZE }
  );
  const ready = paged.snapshot !== null;
  const scanned = paged.snapshot?.scanned ?? 0;
  const scanning = active && ready && paged.hasMore && paged.rows.length < SEARCH_PAGE_SIZE;
  const { loadMore } = paged;

  useEffect(() => {
    if (scanning) void loadMore();
  }, [loadMore, scanned, scanning]);

  return {
    matches: active ? groupEntries(searchEntries(paged.rows, openedAt)) : [],
    paging: paged.paging,
    pending:
      searchWords(query).length > 0 && (query !== settled || (active && (!ready || scanning))),
  };
}
