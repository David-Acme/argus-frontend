import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import type { ISearchHitCacheRow, ISearchHitsCacheValue } from '@/core/interfaces';

const COCINA: ISearchHitCacheRow = {
  kind: 'camera',
  id: '1',
  title: 'Cocina',
  at: null,
  allDay: false,
  parentId: null,
  recurrenceRule: null,
};

const PAGES: readonly ISearchHitsCacheValue[] = [
  { rows: [], hasMore: true, scanned: 20 },
  { rows: [], hasMore: true, scanned: 40 },
  { rows: [COCINA], hasMore: false, scanned: 41 },
];

const loads: number[] = [];

const scan = { frozen: false };

function usePagedListStub() {
  const [page, setPage] = useState(0);
  const snapshot = PAGES[page] ?? null;
  return {
    snapshot,
    rows: snapshot?.rows ?? [],
    hasMore: snapshot?.hasMore ?? false,
    loadMore: async () => {
      loads.push(page);
      if (scan.frozen) return true;
      setPage((current) => Math.min(current + 1, PAGES.length - 1));
      return true;
    },
    paging: {
      footer: 'none',
      loading: false,
      onEndReached: () => undefined,
      retry: () => undefined,
    },
  };
}

mock.module('@/shared/hooks/use-infinite-list', () => ({ usePagedList: usePagedListStub }));
mock.module('@/shared/hooks/use-settled', () => ({ useSettled: <T,>(value: T) => value }));

const { useCommandResults } = await import('@/features/command/hooks/use-command-results');

afterEach(() => {
  loads.length = 0;
  scan.frozen = false;
});

describe('command search results', () => {
  test('pages that the fold filters out entirely are scanned past until a match shows', async () => {
    const { result } = renderHook(() =>
      useCommandResults({
        query: 'cocina',
        scope: 'all',
        allowed: new Set(['event', 'camera']),
        enabled: true,
        openedAt: 0,
        since: 0,
      })
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(loads).toEqual([0, 1]);
    expect(result.current.matches).toEqual([
      { group: 'cameras', entries: [expect.objectContaining({ kind: 'camera', title: 'Cocina' })] },
    ]);
    expect(result.current.pending).toBe(false);
  });

  test('while the scan runs, the search says it is still looking instead of finding nothing', () => {
    scan.frozen = true;
    const { result } = renderHook(() =>
      useCommandResults({
        query: 'cocina',
        scope: 'all',
        allowed: new Set(['camera']),
        enabled: true,
        openedAt: 0,
        since: 0,
      })
    );
    expect(result.current.matches).toEqual([]);
    expect(result.current.pending).toBe(true);
  });
});
