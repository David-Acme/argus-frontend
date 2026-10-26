import { mock } from 'bun:test';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import type { HomePerson } from '@/features/home/model/home-people';
import {
  groupNotifications,
  type NotificationThread,
} from '@/features/home/model/notification-threads';
import { notificationHrefOf } from '@/features/notification/model/notification-link';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import '../../../shared/ui/translation-stub';

type Feed = {
  rows: readonly INotificationPreviewCacheRow[];
  hasMore: boolean;
  loadMore: () => Promise<boolean>;
};

type People = {
  readable: boolean;
  status: 'idle' | 'loading' | 'ready' | 'failed';
  retry: () => Promise<void>;
  people: HomePerson[];
};

export const routes: string[] = [];

export const reads: string[] = [];

export const removed: string[] = [];

export const removal = { allowed: true };

export const params: { notificationId?: string } = {};

export const news = {
  readable: true,
  threads: [] as NotificationThread[],
  feed: { rows: [], hasMore: false, loadMore: async () => true } as Feed,
};

export const capabilities = { manages: true, active: false };

export const people: People = {
  readable: true,
  status: 'ready',
  retry: async () => undefined,
  people: [],
};

export function row(
  id: string,
  data: Record<string, unknown> = {},
  extra: Partial<INotificationPreviewCacheRow> = {}
): INotificationPreviewCacheRow {
  return {
    id,
    type: 'system',
    title: `Aviso ${id}`,
    body: `Texto ${id}`,
    isRead: true,
    data,
    createdAt: new Date(2026, 9, 26, 14, 35).getTime(),
    ...extra,
  };
}

export function setRows(rows: INotificationPreviewCacheRow[]): void {
  news.threads = groupNotifications(rows);
}

export function reset(): void {
  routes.length = 0;
  reads.length = 0;
  removed.length = 0;
  removal.allowed = true;
  delete params.notificationId;
  news.readable = true;
  news.threads = [];
  news.feed = { rows: [], hasMore: false, loadMore: async () => true };
  Object.assign(capabilities, { manages: true, active: false });
  Object.assign(people, { readable: true, status: 'ready', people: [] });
}

const dates = createDateFormatter('es', {
  languageTag: 'es-PE',
  regionCode: 'PE',
  uses24hourClock: true,
  firstWeekday: 2,
  timeZone: null,
});

mock.module('expo-router', () => ({
  Redirect: () => null,
  useLocalSearchParams: () => params,
  useRouter: () => ({
    push: (href: string) => routes.push(href),
    replace: (href: string) => routes.push(`replace:${href}`),
    back: () => routes.push('back'),
    canGoBack: () => true,
    setParams: () => undefined,
  }),
  useIsFocused: () => true,
}));

mock.module('@/shared/hooks/use-date-formatter', () => ({ useDateFormatter: () => dates }));

mock.module('@/features/home/hooks/use-news', () => ({
  useNews: () => ({
    readable: news.readable,
    threads: news.threads,
    feed: news.feed,
    read: (thread: NotificationThread) => reads.push(thread.key),
  }),
}));

mock.module('@/features/home/hooks/use-news-remove', () => ({
  useNewsRemove: () =>
    removal.allowed ? (thread: NotificationThread) => removed.push(thread.key) : null,
}));

mock.module('@/shared/hooks/use-capabilities', () => ({
  useCapabilities: () => ({
    has: () => capabilities.manages,
    moduleActive: () => capabilities.active,
  }),
}));

mock.module('@/features/home/hooks/use-home-people', () => ({ useHomePeople: () => people }));

mock.module('@/features/modules', () => ({
  ModuleEnableAction: ({ onDone }: { moduleId: string; onDone?: () => void }) => (
    <button onClick={() => onDone?.()}>Activar</button>
  ),
}));

mock.module('@/features/security', () => ({
  useSightNotice: () => null,
  SightNoticeActions: () => null,
}));

mock.module('@/features/watch', () => ({
  watchNotificationKind: () => null,
  WatchNotificationAction: () => null,
}));

mock.module('@/features/notification', () => ({
  notificationHrefOf,
  NotificationLinkScreen: () => <span>link-screen</span>,
}));
