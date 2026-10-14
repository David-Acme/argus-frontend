import type { INotificationPreviewCacheRow } from '@/core/interfaces';

export type NotificationLinkTarget =
  | { kind: 'open'; href: string }
  | { kind: 'waiting' }
  | { kind: 'home' };

const IN_APP_PATH = /^\/(?!\/)[A-Za-z0-9/_-]{0,200}$/;

export function notificationHrefOf(data: Readonly<Record<string, unknown>>): string {
  const url = typeof data.url === 'string' ? data.url.trim() : '';
  return IN_APP_PATH.test(url) ? url : '/';
}

export function notificationLinkTarget(
  rows: readonly INotificationPreviewCacheRow[],
  notificationId: string | undefined,
): NotificationLinkTarget {
  if (!notificationId) return { kind: 'home' };
  const row = rows.find((candidate) => candidate.id === notificationId);
  if (!row) return { kind: 'waiting' };
  return { kind: 'open', href: notificationHrefOf(row.data) };
}
