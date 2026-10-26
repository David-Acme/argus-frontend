import { describe, expect, test } from 'bun:test';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import {
  latestMissedCall,
  minutesAgo,
  missedCallActions,
} from '@/features/voice/model/missed-call';

const NOW = 1_800_000_000_000;
const WINDOW = 30 * 60_000;

const row = (
  id: string,
  patch: Partial<INotificationPreviewCacheRow> = {}
): INotificationPreviewCacheRow => ({
  id,
  type: 'call',
  title: 'Llamada perdida · Pagar la luz',
  body: 'Te llamé por la luz.',
  isRead: false,
  data: {
    kind: 'call',
    callId: `call-${id}`,
    threadKey: `agenda:reminder:${id}`,
    urgency: 'active',
  },
  createdAt: NOW - 4 * 60_000,
  ...patch,
});

describe('the missed-call card', () => {
  test('shows the newest unread missed call of the last half hour', () => {
    const missed = latestMissedCall({
      rows: [
        row('1', { createdAt: NOW - 20 * 60_000 }),
        row('2'),
        row('3', { isRead: true, createdAt: NOW }),
      ],
      now: NOW,
      windowMs: WINDOW,
      dismissed: new Set(),
    });
    expect(missed).toEqual({
      notificationId: '2',
      threadKey: 'agenda:reminder:2',
      title: 'Llamada perdida · Pagar la luz',
      body: 'Te llamé por la luz.',
      kind: 'reminder',
      at: NOW - 4 * 60_000,
    });
  });

  test('ignores old calls, other notifications and a card already answered', () => {
    const input = { now: NOW, windowMs: WINDOW, dismissed: new Set(['2']) };
    expect(
      latestMissedCall({ ...input, rows: [row('1', { createdAt: NOW - 31 * 60_000 })] })
    ).toBeNull();
    expect(
      latestMissedCall({ ...input, rows: [row('4', { data: { kind: 'agenda_event' } })] })
    ).toBeNull();
    expect(latestMissedCall({ ...input, rows: [row('2')] })).toBeNull();
  });

  test('a missed alert reads as an alert', () => {
    const rows = [row('5', { data: { kind: 'call', urgency: 'critical' } })];
    expect(latestMissedCall({ rows, now: NOW, windowMs: WINDOW, dismissed: new Set() })?.kind).toBe(
      'alert'
    );
  });

  test('Devolver is always offered; Marcar hecho only for a reminder the call names', () => {
    expect(missedCallActions({ kind: 'reminder', reminderLinked: true })).toEqual([
      'mark-done',
      'call-back',
    ]);
    expect(missedCallActions({ kind: 'reminder', reminderLinked: false })).toEqual([
      'view',
      'call-back',
    ]);
    expect(missedCallActions({ kind: 'alert', reminderLinked: true })).toEqual([
      'view',
      'call-back',
    ]);
  });

  test('the age reads in whole minutes', () => {
    expect(minutesAgo(NOW - 4 * 60_000 - 59_000, NOW)).toBe(4);
    expect(minutesAgo(NOW + 1000, NOW)).toBe(0);
  });
});
