import type { INotificationPreviewCacheRow } from '@/core/interfaces';

export const NOTIFICATION_URGENCIES = ['passive', 'active', 'time_sensitive', 'critical'] as const;

export type NotificationUrgency = (typeof NOTIFICATION_URGENCIES)[number];

export const NOTIFICATION_PHASES = [
  'opened',
  'escalated',
  'resolved',
  'daily',
  'after_quiet',
] as const;

export type NotificationPhase = (typeof NOTIFICATION_PHASES)[number];

export type NotificationThread = {
  key: string;
  latest: INotificationPreviewCacheRow;
  entries: readonly INotificationPreviewCacheRow[];
  unreadIds: readonly string[];
  urgency: NotificationUrgency | null;
  phase: NotificationPhase | null;
  kind: string | null;
};

type NotificationRow = Pick<INotificationPreviewCacheRow, 'id' | 'isRead' | 'data'>;

function textField(row: NotificationRow, field: string): string | null {
  const value = row.data[field];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function member<T extends string>(vocabulary: readonly T[], value: string | null): T | null {
  return vocabulary.find((entry) => entry === value) ?? null;
}

export function threadKeyOf(row: NotificationRow): string {
  const threadKey = textField(row, 'threadKey');
  return threadKey ? `thread:${threadKey}` : `row:${row.id}`;
}

export function urgencyOf(row: NotificationRow): NotificationUrgency | null {
  return member(NOTIFICATION_URGENCIES, textField(row, 'urgency')?.replace(/-/g, '_') ?? null);
}

export function phaseOf(row: NotificationRow): NotificationPhase | null {
  return member(NOTIFICATION_PHASES, textField(row, 'phase')?.replace(/-/g, '_') ?? null);
}

function highestUrgency(rows: readonly NotificationRow[]): NotificationUrgency | null {
  return rows.reduce<NotificationUrgency | null>((highest, row) => {
    const urgency = urgencyOf(row);
    if (urgency === null) return highest;
    if (highest === null) return urgency;
    return NOTIFICATION_URGENCIES.indexOf(urgency) > NOTIFICATION_URGENCIES.indexOf(highest)
      ? urgency
      : highest;
  }, null);
}

function toThread(
  key: string,
  entries: readonly INotificationPreviewCacheRow[]
): NotificationThread | null {
  const [latest] = entries;
  if (!latest) return null;
  return {
    key,
    latest,
    entries,
    unreadIds: entries.filter((entry) => !entry.isRead).map((entry) => entry.id),
    urgency: highestUrgency(entries),
    phase: phaseOf(latest),
    kind: textField(latest, 'kind'),
  };
}

export function groupNotifications(
  rows: readonly INotificationPreviewCacheRow[]
): NotificationThread[] {
  const byKey = new Map<string, INotificationPreviewCacheRow[]>();
  for (const row of rows) {
    const key = threadKeyOf(row);
    const entries = byKey.get(key);
    if (entries) entries.push(row);
    else byKey.set(key, [row]);
  }
  return [...byKey].flatMap(([key, entries]) => toThread(key, entries) ?? []);
}

export function isThreadRead(thread: Pick<NotificationThread, 'unreadIds'>): boolean {
  return thread.unreadIds.length === 0;
}

export function unreadThreadCount(
  threads: readonly Pick<NotificationThread, 'unreadIds'>[],
  unreadTotal: number,
  synced: readonly Pick<INotificationPreviewCacheRow, 'isRead'>[]
): number {
  const unreadInWindow = synced.reduce((total, row) => total + (row.isRead ? 0 : 1), 0);
  const unreadThreads = threads.reduce(
    (total, thread) => total + (isThreadRead(thread) ? 0 : 1),
    0
  );
  return unreadThreads + Math.max(0, unreadTotal - unreadInWindow);
}

export function unreadIdsOf(threads: readonly Pick<NotificationThread, 'unreadIds'>[]): string[] {
  return threads.flatMap((thread) => thread.unreadIds);
}
