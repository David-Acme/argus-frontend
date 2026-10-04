import { describe, expect, test } from 'bun:test';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import {
  groupNotifications,
  isThreadRead,
  phaseOf,
  threadKeyOf,
  unreadIdsOf,
  unreadThreadCount,
  urgencyOf,
  withUnreadSnapshot,
} from '@/features/home/model/notification-threads';

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
});
