import type { IProjectTaskCacheRow, IProjectTasksPage } from '@/core/interfaces';

const CLOSED = new Set(['done', 'canceled']);

export function projectTasksPageOf(tasks: readonly IProjectTaskCacheRow[]): IProjectTasksPage {
  const done = tasks.filter((task) => CLOSED.has(task.status));
  const counted = tasks.filter((task) => task.status !== 'canceled');
  return {
    rows: done,
    hasMore: false,
    open: tasks.filter((task) => !CLOSED.has(task.status)),
    doneTotal: done.length,
    progress: {
      done: counted.filter((task) => task.status === 'done').length,
      total: counted.length,
    },
  };
}

const NO_PAGING = {
  footer: 'none' as const,
  loading: false,
  onEndReached: () => undefined,
  retry: () => undefined,
};

export function pagedViewStub(read: (key: string, scope?: string) => readonly unknown[]) {
  const usePagedView = (key: string, scope: string) => {
    const snapshot = projectTasksPageOf(read(key, scope) as IProjectTaskCacheRow[]);
    return {
      snapshot,
      rows: snapshot.rows,
      hasMore: false,
      loadMore: () => Promise.resolve(false),
    };
  };
  return {
    usePagedList: (key: string, scope: string) => ({
      ...usePagedView(key, scope),
      paging: NO_PAGING,
    }),
    usePagedView: (key: string, scope: string) => {
      const snapshot = projectTasksPageOf(read(key, scope) as IProjectTaskCacheRow[]);
      return {
        snapshot,
        rows: snapshot.rows,
        hasMore: false,
        loadMore: () => Promise.resolve(false),
      };
    },
    useInfiniteList: () => ({
      footer: 'none' as const,
      loading: false,
      onEndReached: () => undefined,
      retry: () => undefined,
    }),
  };
}
