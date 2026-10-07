import { describe, expect, test } from 'bun:test';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import {
  groupNotifications,
  isThreadRead,
  missedCallId,
  moduleRequestOf,
  phaseOf,
  threadKeyOf,
  unreadIdsOf,
  unreadThreadCount,
  urgencyOf,
  withUnreadSnapshot,
} from '@/features/home/model/notification-threads';
import { moduleOfNotification, notificationVisible } from '@/features/home/model/notification-modules';

function row(
  id: string,
  data: Record<string, unknown> = {},
  extra: Partial<INotificationPreviewCacheRow> = {}
): INotificationPreviewCacheRow {
  return {
    id,
    type: 'guard',
    title: `title ${id}`,
    body: `body ${id}`,
    isRead: false,
    data,
    createdAt: Number(id) * 1000,
    ...extra,
  };
}

const episode = (
  id: string,
  phase: string,
  urgency: string,
  extra: Partial<INotificationPreviewCacheRow> = {}
) => row(id, { threadKey: 'guard:episode:7', kind: 'guard_episode', phase, urgency }, extra);

describe('notification threads', () => {
  test('rows sharing a threadKey collapse into one thread led by the newest row', () => {
    const threads = groupNotifications([
      episode('30', 'escalated', 'critical'),
      row('25', {
        threadKey: 'guard:digest',
        kind: 'guard_digest',
        phase: 'daily',
        urgency: 'passive',
      }),
      episode('20', 'opened', 'active'),
    ]);

    expect(threads.map((thread) => thread.key)).toEqual([
      'thread:guard:episode:7',
      'thread:guard:digest',
    ]);
    const [first] = threads;
    expect(first?.latest.id).toBe('30');
    expect(first?.entries.map((entry) => entry.id)).toEqual(['30', '20']);
    expect(first?.phase).toBe('escalated');
    expect(first?.kind).toBe('guard_episode');
  });

  test('a thread keeps its place by its newest row', () => {
    const threads = groupNotifications([
      row('9', { threadKey: 'camera:fallback:2' }),
      episode('8', 'escalated', 'time_sensitive'),
      row('7', { threadKey: 'camera:fallback:2' }),
      episode('6', 'opened', 'active'),
    ]);
    expect(threads.map((thread) => thread.entries.map((entry) => entry.id))).toEqual([
      ['9', '7'],
      ['8', '6'],
    ]);
  });

  test('notifications without a threadKey stay on their own', () => {
    const threads = groupNotifications([
      row('3'),
      row('2', { threadKey: '  ' }),
      row('1', { cameraId: 4 }),
    ]);
    expect(threads.map((thread) => thread.key)).toEqual(['row:3', 'row:2', 'row:1']);
    expect(threads.every((thread) => thread.entries.length === 1)).toBe(true);
    expect(threads.every((thread) => thread.urgency === null && thread.phase === null)).toBe(true);
    expect(threads[0]?.kind).toBeNull();
  });

  test('a thread is styled by the highest urgency it reached', () => {
    const [thread] = groupNotifications([
      episode('3', 'escalated', 'active'),
      episode('2', 'escalated', 'critical'),
      episode('1', 'opened', 'passive'),
    ]);
    expect(thread?.urgency).toBe('critical');
  });

  test('urgency and phase accept the hyphenated spelling and ignore unknown values', () => {
    expect(urgencyOf(row('1', { urgency: 'time-sensitive' }))).toBe('time_sensitive');
    expect(urgencyOf(row('1', { urgency: 'time_sensitive' }))).toBe('time_sensitive');
    expect(urgencyOf(row('1', { urgency: 'loud' }))).toBeNull();
    expect(urgencyOf(row('1', { urgency: 3 }))).toBeNull();
    expect(phaseOf(row('1', { phase: 'after-quiet' }))).toBe('after_quiet');
    expect(phaseOf(row('1', { phase: 'resolved' }))).toBe('resolved');
    expect(phaseOf(row('1', { phase: 'later' }))).toBeNull();
    expect(threadKeyOf(row('5', { threadKey: 'guard:episode:1' }))).toBe('thread:guard:episode:1');
    expect(threadKeyOf(row('5'))).toBe('row:5');
  });

  test('read and unread are tracked per thread', () => {
    const threads = groupNotifications([
      episode('4', 'escalated', 'critical'),
      episode('3', 'opened', 'active', { isRead: true }),
      row('2', {}, { isRead: true }),
    ]);
    expect(threads.map(isThreadRead)).toEqual([false, true]);
    expect(threads[0]?.unreadIds).toEqual(['4']);
    expect(unreadIdsOf(threads)).toEqual(['4']);
  });

  test('the badge counts unread threads plus the unread rows outside the window', () => {
    const synced = [
      episode('4', 'escalated', 'critical'),
      episode('3', 'opened', 'active'),
      row('2'),
    ];
    const threads = groupNotifications(synced);
    expect(unreadThreadCount(threads, 3, synced)).toBe(2);
    expect(unreadThreadCount(threads, 5, synced)).toBe(4);

    const shown = synced.map((entry) => (entry.id === '2' ? entry : { ...entry, isRead: true }));
    expect(unreadThreadCount(groupNotifications(shown), 3, synced)).toBe(1);
    expect(unreadThreadCount(groupNotifications([]), 0, [])).toBe(0);
  });

  test('rows seen unread when the bell opened keep their highlight while it stays open', () => {
    const before = groupNotifications([
      episode('4', 'escalated', 'critical'),
      episode('3', 'opened', 'active', { isRead: true }),
      row('2'),
      row('1', {}, { isRead: true }),
    ]);
    const seen = new Set(unreadIdsOf(before));
    const read = groupNotifications([
      episode('4', 'escalated', 'critical', { isRead: true }),
      episode('3', 'opened', 'active', { isRead: true }),
      row('2', {}, { isRead: true }),
      row('1', {}, { isRead: true }),
    ]);
    expect(read.map(isThreadRead)).toEqual([true, true, true]);

    const shown = withUnreadSnapshot(read, seen);
    expect(shown.map(isThreadRead)).toEqual([false, false, true]);
    expect(shown[0]?.unreadIds).toEqual(['4']);
    expect(shown[2]).toBe(read[2]);
    expect(withUnreadSnapshot(read, new Set())).toBe(read);
  });

  test('a missed call thread names the call it reopens', () => {
    const [missed] = groupNotifications([
      row('9', { kind: 'call', callId: 'call-41', threadKey: 'call:41', urgency: 'critical' }),
    ]);
    expect(missed && missedCallId(missed)).toBe('call-41');
    const [forged] = groupNotifications([row('10', { kind: 'call', callId: '../settings' })]);
    expect(forged && missedCallId(forged)).toBeNull();
    const [other] = groupNotifications([row('11', { kind: 'guard_episode', callId: 'call-41' })]);
    expect(other && missedCallId(other)).toBeNull();
  });
});

describe('a request the assistant kept for a module that was off', () => {
  const done = row(
    '51',
    { kind: 'assistant_task', commandId: 'intent:42:done' },
    { type: 'assistant_task', title: 'Tu petición está lista', body: 'Agendé tu reunión del jueves.' }
  );
  const failed = row(
    '52',
    { kind: 'assistant_task', commandId: 'intent:43:failed' },
    { type: 'assistant_task', title: 'No pude completar tu petición', body: 'La guardé como recordatorio.' }
  );
  const coreOnly = (moduleId: string) => moduleId === 'core';

  test('is a plain text row of its own with the title and body the backend wrote and no action', () => {
    const [thread, ...others] = groupNotifications([done]);
    expect(others).toEqual([]);
    expect(thread?.key).toBe('row:51');
    expect(thread?.kind).toBe('assistant_task');
    expect(thread?.urgency).toBeNull();
    expect(thread?.phase).toBeNull();
    expect(thread?.latest.title).toBe('Tu petición está lista');
    expect(thread?.latest.body).toBe('Agendé tu reunión del jueves.');
    expect(thread && moduleRequestOf(thread)).toBeNull();
    expect(thread && missedCallId(thread)).toBeNull();
  });

  test('every request is its own thread, so a failure never hides the earlier success', () => {
    expect(groupNotifications([failed, done]).map((thread) => thread.latest.id)).toEqual(['52', '51']);
  });

  test('is core: it is shown with every optional module off', () => {
    expect(moduleOfNotification(done)).toBe('core');
    expect(notificationVisible(done, coreOnly)).toBe(true);
    expect(notificationVisible(failed, coreOnly)).toBe(true);
  });

  test('starts unread and is read once like any other row', () => {
    const threads = groupNotifications([done, failed]);
    expect(threads.every((thread) => !isThreadRead(thread))).toBe(true);
    expect(unreadIdsOf(threads)).toEqual(['51', '52']);
  });
});

describe('a notification of a type this build does not know', () => {
  const future = row(
    '60',
    { kind: 'house_summary', nested: { a: 1 }, list: [1, 2] },
    { type: 'something_new_in_the_future', title: 'Resumen', body: 'Texto nuevo' }
  );
  const odd = [
    row('61', {}, { type: 'x', title: 'Sin datos', body: '' }),
    row('62', { kind: 5, threadKey: 7, urgency: {}, phase: null }, { type: 'y', title: 'Datos raros' }),
    row('63', { kind: '   ', threadKey: '   ' }, { type: '', title: 'Vacíos' }),
  ];
  const coreOnly = (moduleId: string) => moduleId === 'core';

  test('is kept with its own title and body and nothing is dropped', () => {
    const rows = [future, ...odd];
    const threads = groupNotifications(rows);
    expect(threads).toHaveLength(rows.length);
    expect(threads.map((thread) => thread.latest.id)).toEqual(['60', '61', '62', '63']);
    expect(threads[0]?.latest.title).toBe('Resumen');
    expect(threads[0]?.latest.body).toBe('Texto nuevo');
  });

  test('has no action and no urgency or phase it could be mistaken for', () => {
    for (const thread of groupNotifications([future, ...odd])) {
      expect(moduleRequestOf(thread)).toBeNull();
      expect(missedCallId(thread)).toBeNull();
      expect(thread.urgency).toBeNull();
      expect(thread.phase).toBeNull();
    }
  });

  test('is core and never hidden, even with every optional module off', () => {
    for (const unknown of [future, ...odd]) {
      expect(moduleOfNotification(unknown)).toBe('core');
      expect(notificationVisible(unknown, coreOnly)).toBe(true);
    }
  });

  test('a kind the app does not know is shown as a plain row, not as an error', () => {
    const [thread] = groupNotifications([future]);
    expect(thread?.kind).toBe('house_summary');
    expect(thread?.key).toBe('row:60');
  });
});
