import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { notificationThreadKey } from '@/core/services/notification';
import { callKindOf, callReminderIdOf } from '@/features/voice/model/incoming-surface';
import type { CallKind } from '@/features/voice/model/incoming-surface';

export type MissedCall = {
  notificationId: string;
  threadKey: string | null;
  title: string;
  body: string;
  kind: CallKind;
  reminderId: number | null;
  at: number;
};

export type MissedCallAction = 'view' | 'mark-done' | 'call-back';

export type LatestMissedInput = {
  rows: readonly INotificationPreviewCacheRow[];
  now: number;
  windowMs: number;
  dismissed: ReadonlySet<string>;
};

export type MissedActionsInput = {
  kind: CallKind;
  reminderLinked: boolean;
};

const urgencyOf = (data: Readonly<Record<string, unknown>>): string | undefined =>
  typeof data.urgency === 'string' ? data.urgency : undefined;

export function latestMissedCall({
  rows,
  now,
  windowMs,
  dismissed,
}: LatestMissedInput): MissedCall | null {
  const row = rows
    .filter(
      (entry) =>
        entry.data.kind === 'call' &&
        !entry.isRead &&
        !dismissed.has(entry.id) &&
        now - entry.createdAt <= windowMs
    )
    .reduce<INotificationPreviewCacheRow | null>(
      (newest, entry) => (newest === null || entry.createdAt > newest.createdAt ? entry : newest),
      null
    );
  if (row === null) return null;
  return {
    notificationId: row.id,
    threadKey: notificationThreadKey(row.data),
    title: row.title.trim(),
    body: row.body.trim(),
    kind: callKindOf(urgencyOf(row.data)),
    reminderId: callReminderIdOf(row.data),
    at: row.createdAt,
  };
}

export function missedCallActions({
  kind,
  reminderLinked,
}: MissedActionsInput): MissedCallAction[] {
  return kind === 'reminder' && reminderLinked ? ['mark-done', 'call-back'] : ['view', 'call-back'];
}

export function minutesAgo(at: number, now: number): number {
  return Math.max(0, Math.floor((now - at) / 60_000));
}
