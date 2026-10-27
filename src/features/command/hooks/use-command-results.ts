import { useEffect, useState } from 'react';
import type { ISearchHitCacheRow } from '@/core/interfaces';
import type { SearchKind } from '@/core/types';
import { SEARCH_PAGE_SIZE, VIEW_CACHE_KEYS } from '@/shared/constants';
import {
  useInfiniteList,
  usePagedView,
  type InfiniteListState,
} from '@/shared/hooks/use-infinite-list';
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
  const [settled, setSettled] = useState(query);
  const words = searchWords(settled);
  const kinds = scopeKinds(scope, allowed);
  const active = enabled && words.length > 0 && kinds.length > 0;
  const key = active ? encodeSearchScope({ kinds, words, since }) : IDLE_SCOPE;
  const paged = usePagedView<ISearchHitCacheRow>(VIEW_CACHE_KEYS.commandSearch, key, active);
  const ready = paged.snapshot !== null;
  const paging = useInfiniteList({
    count: paged.rows.length,
    hasMore: ready && paged.hasMore,
    loadMore: paged.loadMore,
    endAfter: SEARCH_PAGE_SIZE,
  });

  useEffect(() => {
    if (query === settled) return;
    const timer = setTimeout(() => setSettled(query), COMMAND_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, settled]);

  return {
    matches: active ? groupEntries(searchEntries(paged.rows, openedAt)) : [],
    paging,
    pending: searchWords(query).length > 0 && (query !== settled || (active && !ready)),
  };
}
