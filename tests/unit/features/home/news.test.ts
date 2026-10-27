import { describe, expect, test } from 'bun:test';
import type { INotificationPreviewCacheRow } from '@/core/interfaces';
import { notificationHrefOf } from '@/features/notification/model/notification-link';
import {
  NEWS_ROUTE,
  NEWS_STACK_LIMIT,
  newsActionOf,
  newsAvatarOf,
  newsLimit,
  newsPressable,
  newsStampOf,
  newsTargetOf,
  newsWordsOf,
} from '@/features/home/model/news';
import {
  groupNotifications,
  type NotificationThread,
} from '@/features/home/model/notification-threads';

function row(
  id: string,
  data: Record<string, unknown> = {},
  extra: Partial<INotificationPreviewCacheRow> = {}
): INotificationPreviewCacheRow {
  return {
    id,
    type: 'system',
    title: `title ${id}`,
    body: `body ${id}`,
    isRead: false,
    data,
    createdAt: 1000,
    ...extra,
  };
}

const ALWAYS = () => true;

const NEVER = () => false;

function threadOf(
  data: Record<string, unknown>,
  extra: Partial<INotificationPreviewCacheRow> = {}
): NotificationThread {
  const [thread] = groupNotifications([row('1', data, extra)]);
  if (!thread) throw new Error('no thread');
  return thread;
}

describe('how many news items a section shows', () => {
  test('the phone and tablet card shows the latest five', () => {
    expect(newsLimit(false, 760)).toBe(NEWS_STACK_LIMIT);
    expect(newsLimit(false, 1440)).toBe(5);
  });

  test('a desktop column shows as many as its height fits: 8, 11 and 14 at the three reference heights', () => {
    expect(newsLimit(true, 820)).toBe(8);
    expect(newsLimit(true, 1080)).toBe(11);
    expect(newsLimit(true, 1440)).toBe(14);
  });

  test('a short desktop window never shows fewer than the phone card', () => {
    expect(newsLimit(true, 300)).toBe(5);
  });

  test('«Ver todo» opens the full feed', () => {
    expect(NEWS_ROUTE).toBe('/notification');
  });
});

describe('the avatar of a news item', () => {
  test('a kind names its glyph, and an unknown kind falls back to the bell', () => {
    expect(newsAvatarOf(threadOf({ kind: 'guard_tamper' }))).toEqual({
      icon: 'eyeoff',
      tone: 'default',
    });
    expect(newsAvatarOf(threadOf({ kind: 'agenda_event' })).icon).toBe('cal');
    expect(newsAvatarOf(threadOf({ kind: 'watch_confirm' })).icon).toBe('shieldok');
    expect(newsAvatarOf(threadOf({ kind: 'something_new' })).icon).toBe('bell');
    expect(newsAvatarOf(threadOf({})).icon).toBe('bell');
  });

  test('what Argus itself says shows Estela instead of a glyph', () => {
    expect(newsAvatarOf(threadOf({ kind: 'assistant_task' }))).toEqual({
      argus: true,
      tone: 'default',
    });
    expect(newsAvatarOf(threadOf({ kind: 'guard_digest' }))).toEqual({
      argus: true,
      tone: 'default',
    });
  });

  test('a summary after the quiet hours shows the moon', () => {
    expect(newsAvatarOf(threadOf({ kind: 'guard_digest', phase: 'after_quiet' })).icon).toBe(
      'moon'
    );
  });

  test('urgency colours the well, and a module request is the accent', () => {
    expect(newsAvatarOf(threadOf({ kind: 'guard_episode', urgency: 'critical' }))).toEqual({
      icon: 'alert',
      tone: 'alert',
    });
    expect(newsAvatarOf(threadOf({ kind: 'guard_episode', urgency: 'time-sensitive' })).tone).toBe(
      'attn'
    );
    expect(newsAvatarOf(threadOf({ kind: 'module_request', moduleId: 'productivity' }))).toEqual({
      icon: 'user',
      tone: 'accent',
    });
  });
});

describe('the words of a news item', () => {
  test('the title says who and the body says what', () => {
    expect(newsWordsOf({ title: ' Carlos ', body: 'Quiere usar la agenda.' }, 'Argus')).toEqual({
      who: 'Carlos',
      text: 'Quiere usar la agenda.',
    });
  });

  test('a notification without a body is Argus saying its title', () => {
    expect(newsWordsOf({ title: 'Modo Noche activado', body: '  ' }, 'Argus')).toEqual({
      who: 'Argus',
      text: 'Modo Noche activado',
    });
  });

  test('a sight notice replaces the stored title with its own', () => {
    expect(newsWordsOf({ title: 'raw', body: 'Patio' }, 'Argus', 'La cámara no ve')).toEqual({
      who: 'La cámara no ve',
      text: 'Patio',
    });
  });
});

describe('where a news item leads and what it offers', () => {
  test('a missed call offers to call Argus back, never to rejoin the call that ended', () => {
    const thread = threadOf({ kind: 'call', callId: 'call-42' });
    expect(newsTargetOf(thread, notificationHrefOf)).toBe('/call');
    expect(newsActionOf(thread, '/call', ALWAYS)).toBe('call-back');
  });

  test('a missed reminder call calls back about its reminder', () => {
    const thread = threadOf({
      kind: 'call',
      callId: 'call-43',
      category: 'reminder',
      urgency: 'active',
      reminderId: 9,
    });
    expect(newsTargetOf(thread, notificationHrefOf)).toBe('/call?purpose=call_back&reminderId=9');
  });

  test('a household message opens the conversation and offers a reply', () => {
    const thread = threadOf({ kind: 'household_message', counterpartId: 7 });
    const target = newsTargetOf(thread, notificationHrefOf);
    expect(target).toBe('/conversations/7');
    expect(newsActionOf(thread, target, ALWAYS)).toBe('reply');
  });

  test('an episode with a link offers «Revisar»; without a link it offers nothing', () => {
    const linked = threadOf({ kind: 'guard_episode', url: '/security/3' });
    expect(newsActionOf(linked, newsTargetOf(linked, notificationHrefOf), ALWAYS)).toBe('review');
    const bare = threadOf({ kind: 'guard_episode' });
    expect(newsTargetOf(bare, notificationHrefOf)).toBeNull();
    expect(newsActionOf(bare, null, ALWAYS)).toBeNull();
  });

  test('a module request offers to turn the module on only while that can run', () => {
    const request = threadOf({ kind: 'module_request', moduleId: 'productivity' });
    expect(newsActionOf(request, null, (moduleId) => moduleId === 'productivity')).toBe('module');
    expect(newsActionOf(request, null, NEVER)).toBeNull();
  });

  test('a link that leaves the app is no target', () => {
    expect(newsTargetOf(threadOf({ url: 'https://example.com' }), notificationHrefOf)).toBeNull();
  });

  test('a row is pressable while it leads somewhere or is still unread', () => {
    expect(newsPressable({ unreadIds: [] }, '/agenda')).toBe(true);
    expect(newsPressable({ unreadIds: ['1'] }, null)).toBe(true);
    expect(newsPressable({ unreadIds: [] }, null)).toBe(false);
  });
});

describe('when a news item happened', () => {
  const now = new Date(2026, 9, 26, 15, 0).getTime();

  test('today, yesterday, this week and older are told apart by local day', () => {
    expect(newsStampOf(new Date(2026, 9, 26, 0, 5).getTime(), now)?.kind).toBe('today');
    expect(newsStampOf(new Date(2026, 9, 25, 23, 59).getTime(), now)?.kind).toBe('yesterday');
    expect(newsStampOf(new Date(2026, 9, 20, 9, 0).getTime(), now)?.kind).toBe('week');
    expect(newsStampOf(new Date(2026, 9, 19, 9, 0).getTime(), now)?.kind).toBe('older');
  });

  test('a clock running behind the server still reads as today, and no time is no stamp', () => {
    expect(newsStampOf(now + 60_000, now)?.kind).toBe('today');
    expect(newsStampOf(0, now)).toBeNull();
  });
});
