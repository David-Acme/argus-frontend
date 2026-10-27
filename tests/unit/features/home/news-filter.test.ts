import { describe, expect, test } from 'bun:test';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import {
  filterNews,
  isSecurityThread,
  newsFilters,
  newsLinkOf,
  threadReplies,
} from '@/features/home/model/news-filter';
import { groupNotifications } from '@/features/home/model/notification-threads';

const row = (
  id: string,
  data: Record<string, unknown> = {},
  isRead = true
): INotificationPreviewCacheRow => ({
  id,
  type: 'system',
  title: `Aviso ${id}`,
  body: '',
  isRead,
  data,
  createdAt: Number(id),
});

const threads = groupNotifications([
  row('5', { kind: 'guard_episode', threadKey: 'guard:episode:1' }, false),
  row('4', { kind: 'guard_episode', threadKey: 'guard:episode:1' }),
  row('3', { kind: 'guard_episode', threadKey: 'guard:episode:1' }),
  row('2', { kind: 'guard_episode', threadKey: 'guard:episode:1' }),
  row('6', { kind: 'watch_message' }),
  row('7', { kind: 'agenda_event' }, false),
  row('8'),
]);

describe('the Novedades filter', () => {
  test('Seguridad keeps camera, guard and camera conversation notices', () => {
    expect(filterNews(threads, 'security').map((thread) => thread.latest.id)).toEqual(['5', '6']);
    expect(
      isSecurityThread({ kind: 'agenda_event', latest: row('1', { kind: 'agenda_event' }) })
    ).toBe(false);
  });

  test('Pendientes keeps what is still unread, Todo keeps everything', () => {
    expect(filterNews(threads, 'pending').map((thread) => thread.latest.id)).toEqual(['5', '7']);
    expect(filterNews(threads, 'all')).toHaveLength(4);
  });

  test('without surveillance there is no Seguridad choice', () => {
    expect(newsFilters(true)).toEqual(['all', 'security', 'pending']);
    expect(newsFilters(false)).toEqual(['all', 'pending']);
  });
});

describe('a thread and its replies', () => {
  test('the latest leads and the two before it hang from its line', () => {
    const [episode] = threads;
    expect(episode ? threadReplies(episode).map((entry) => entry.id) : []).toEqual(['4', '3']);
    expect(episode ? threadReplies(episode, 5).map((entry) => entry.id) : []).toEqual([
      '4',
      '3',
      '2',
    ]);
  });
});

describe('a link to one notice', () => {
  test('a local row opens; an unknown one waits for the sync, then is gone', () => {
    expect(newsLinkOf(threads, undefined, true)).toEqual({ kind: 'none' });
    expect(newsLinkOf(threads, '3', false)).toMatchObject({ kind: 'open', row: { id: '3' } });
    expect(newsLinkOf(threads, '99', false)).toEqual({ kind: 'waiting' });
    expect(newsLinkOf(threads, '99', true)).toEqual({ kind: 'gone' });
  });
});
