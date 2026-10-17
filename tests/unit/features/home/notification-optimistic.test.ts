import { describe, expect, test } from 'bun:test';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { applyIntents, OptimisticRegistry } from '@/shared/libs/optimistic';
import {
  NOTIFICATION_LENSES,
  notificationReadIntents,
  threadDeleteIntents,
  threadTargetOf,
} from '@/features/home/model/notification-optimistic';
import { groupNotifications } from '@/features/home/model/notification-threads';

function row(id: string, data: Record<string, unknown> = {}): INotificationPreviewCacheRow {
  return {
    id,
    type: 'guard',
    title: `title ${id}`,
    body: `body ${id}`,
    isRead: false,
    data,
    createdAt: Number(id) * 1000,
  };
}

const registry = () =>
  new OptimisticRegistry({ schedule: () => () => undefined, ttlMs: 60_000, graceMs: 600 });

const episode = (id: string) => row(id, { threadKey: 'guard:episode:7', kind: 'guard_episode' });

const feed = [episode('30'), row('20'), episode('10')];

describe('notification delete intents', () => {
  test('a thread is hidden by one intent per entry it shows and deleted by its thread key', () => {
    const [thread] = groupNotifications(feed);
    if (!thread) throw new Error('expected the episode thread');
    expect(threadTargetOf(thread, '1')).toEqual({ userId: '1', threadKey: 'guard:episode:7', ids: ['30', '10'] });
    expect(threadDeleteIntents(thread)).toEqual([
      { table: 'notification', kind: 'delete', recordId: '30' },
      { table: 'notification', kind: 'delete', recordId: '10' },
    ]);
  });

  test('the lens hides every deleted entry, so the thread leaves and the others stay', () => {
    const intents = registry();
    const [thread] = groupNotifications(feed);
    if (!thread) throw new Error('expected the episode thread');
    for (const intent of threadDeleteIntents(thread)) intents.begin(intent);

    const rows = applyIntents(feed, intents.snapshot(), NOTIFICATION_LENSES);
    expect(rows.map((item) => item.id)).toEqual(['20']);
    expect(groupNotifications(rows).map((item) => item.key)).toEqual(['row:20']);
  });

  test('a delete beside a read keeps the read on the row that stays', () => {
    const intents = registry();
    intents.begin({ table: 'notification', kind: 'update', recordId: '20', values: { isRead: true } });
    intents.begin({ table: 'notification', kind: 'delete', recordId: '30' });

    const rows = applyIntents(feed, intents.snapshot(), NOTIFICATION_LENSES);
    expect(rows.map((item) => [item.id, item.isRead])).toEqual([
      ['20', true],
      ['10', false],
    ]);
  });

  test('a rolled-back delete brings its row back unchanged', () => {
    const intents = registry();
    const begun = intents.begin({ table: 'notification', kind: 'delete', recordId: '20' });
    expect(applyIntents(feed, intents.snapshot(), NOTIFICATION_LENSES)).toHaveLength(2);
    intents.rollback(begun.id);
    expect(applyIntents(feed, intents.snapshot(), NOTIFICATION_LENSES)).toBe(feed);
  });

  test('an intent of another table never touches the feed', () => {
    const intents = registry();
    intents.begin({ table: 'reminder', kind: 'delete', recordId: '20' });
    expect(applyIntents(feed, intents.snapshot(), NOTIFICATION_LENSES)).toBe(feed);
  });
});

describe('notification read intents', () => {
  test('a thread read marks every unread entry the page shows, one intent each', () => {
    const [thread] = groupNotifications(feed);
    if (!thread) throw new Error('expected the episode thread');
    expect(notificationReadIntents(thread.unreadIds)).toEqual([
      { table: 'notification', kind: 'update', recordId: '30', values: { isRead: true } },
      { table: 'notification', kind: 'update', recordId: '10', values: { isRead: true } },
    ]);
  });

  test('the lens turns the whole thread read, and leaves the other thread alone', () => {
    const intents = registry();
    const [thread] = groupNotifications(feed);
    if (!thread) throw new Error('expected the episode thread');
    for (const intent of notificationReadIntents(thread.unreadIds)) intents.begin(intent);

    const rows = applyIntents(feed, intents.snapshot(), NOTIFICATION_LENSES);
    expect(rows.map((row) => [row.id, row.isRead])).toEqual([
      ['30', true],
      ['20', false],
      ['10', true],
    ]);
    expect(groupNotifications(rows).find((item) => item.key === 'thread:guard:episode:7')?.unreadIds).toEqual([]);
  });
});

describe('the thread a delete addresses', () => {
  test('a row without a thread key is its own thread, addressed by its id', () => {
    const lone = groupNotifications(feed).find((item) => item.key === 'row:20');
    if (!lone) throw new Error('expected the lone row');
    expect(threadTargetOf(lone, '1')).toEqual({ userId: '1', threadKey: null, ids: ['20'] });
  });

  test('a padded key is the trimmed key, as the server compares it', () => {
    const [padded] = groupNotifications([row('5', { threadKey: '  camera:fallback:3 ' })]);
    if (!padded) throw new Error('expected the padded thread');
    expect(padded.key).toBe('thread:camera:fallback:3');
    expect(threadTargetOf(padded, '1').threadKey).toBe('camera:fallback:3');
  });
});
