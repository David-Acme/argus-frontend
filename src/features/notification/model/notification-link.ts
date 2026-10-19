import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { validCounterpartId } from '@/core/services/conversation';

export type NotificationLinkTarget =
  | { kind: 'open'; href: string }
  | { kind: 'waiting' }
  | { kind: 'home' };

const IN_APP_PATH = /^\/(?!\/)[A-Za-z0-9/_-]{0,200}$/;

const HOUSEHOLD_MESSAGE_KIND = 'household_message';

function conversationHrefOf(data: Readonly<Record<string, unknown>>): string | null {
  if (data.kind !== HOUSEHOLD_MESSAGE_KIND) return null;
  const counterpartId = validCounterpartId(data.counterpartId) ?? validCounterpartId(data.fromUserId);
  return counterpartId === null ? null : `/conversations/${counterpartId}`;
}

export function notificationHrefOf(data: Readonly<Record<string, unknown>>): string {
  const conversation = conversationHrefOf(data);
  if (conversation !== null) return conversation;
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
