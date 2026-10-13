import { describe, expect, test } from 'bun:test';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { applyIntents, OptimisticRegistry } from '@/shared/libs/optimistic';
import {
  NOTIFICATION_LENSES,
  removalRefusal,
  threadDeleteIntents,
  threadIdsOf,
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
  test('a thread is deleted by one intent per entry it shows', () => {
    const [thread] = groupNotifications(feed);
    if (!thread) throw new Error('expected the episode thread');
    expect(threadIdsOf(thread)).toEqual(['30', '10']);
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

describe('a removal the server refused in part', () => {
  test('only the refused ids come back, under the given title', () => {
    expect(removalRefusal({ refused: ['10'] }, 'Some updates could not be deleted')).toEqual({
      recordIds: ['10'],
      title: 'Some updates could not be deleted',
    });
  });

  test('nothing refused is no refusal', () => {
    expect(removalRefusal({ refused: [] }, 'unused')).toBeNull();
  });
});
