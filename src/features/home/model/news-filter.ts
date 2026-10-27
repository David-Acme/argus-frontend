import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { MODULE_IDS } from '@/shared/constants';
import { NEWS_THREAD_REPLIES } from '@/features/home/constants/news.constant';
import { moduleOfNotification } from '@/features/home/model/notification-modules';
import { isThreadRead } from '@/features/home/model/notification-threads';
import type { NotificationThread } from '@/features/home/model/notification-threads';

export type NewsFilter = 'all' | 'security' | 'pending';

export type NewsLink =
  | { kind: 'none' }
  | { kind: 'waiting' }
  | { kind: 'open'; row: INotificationPreviewCacheRow }
  | { kind: 'gone' };

type FilterThread = Pick<NotificationThread, 'kind' | 'latest' | 'unreadIds'>;

const WATCH_PREFIX = 'watch_';

export function isSecurityThread(thread: Pick<NotificationThread, 'kind' | 'latest'>): boolean {
  if (moduleOfNotification(thread.latest) === MODULE_IDS.surveillance) return true;
  return thread.kind?.startsWith(WATCH_PREFIX) ?? false;
}

export function newsFilters(security: boolean): NewsFilter[] {
  return security ? ['all', 'security', 'pending'] : ['all', 'pending'];
}

export function filterNews<T extends FilterThread>(threads: readonly T[], filter: NewsFilter): T[] {
  if (filter === 'security') return threads.filter(isSecurityThread);
  if (filter === 'pending') return threads.filter((thread) => !isThreadRead(thread));
  return [...threads];
}

export function threadReplies(
  thread: Pick<NotificationThread, 'entries'>,
  limit: number = NEWS_THREAD_REPLIES
): readonly INotificationPreviewCacheRow[] {
  return thread.entries.slice(1, 1 + limit);
}

export function newsLinkOf(
  threads: readonly Pick<NotificationThread, 'entries'>[],
  notificationId: string | undefined,
  synced: boolean
): NewsLink {
  if (!notificationId) return { kind: 'none' };
  for (const thread of threads) {
    const row = thread.entries.find((entry) => entry.id === notificationId);
    if (row) return { kind: 'open', row };
  }
  return synced ? { kind: 'gone' } : { kind: 'waiting' };
}
