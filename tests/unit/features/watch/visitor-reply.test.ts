import { describe, expect, test } from 'bun:test';
import { readWatchReply, WATCH_REPLY_MAX_CHARS, WATCH_ROUTES } from '@/core/contracts/watch.contract';
import {
  canReply,
  visitorConsentOf,
  visitorMessageOf,
  watchNotificationAction,
  watchReplyOutcome,
} from '@/features/watch/model/watch-notification';

const NOW = Date.UTC(2026, 9, 19, 10, 0, 0);
const seconds = (ms: number) => Math.floor(ms / 1000);

const visitorData = (patch: Record<string, unknown> = {}) => ({
  kind: 'watch_message',
  conversationId: 'a'.repeat(32),
  cameraId: 4,
  cameraName: 'Puerta',
  visitorConsent: 'unanswered',
  replyUntil: seconds(NOW) + 600,
  ...patch,
});

describe('a visitor message', () => {
  test('is read from a watch_message notification with its window in milliseconds', () => {
    expect(visitorMessageOf('watch_message', visitorData())).toEqual({
      conversationId: 'a'.repeat(32),
      cameraName: 'Puerta',
      replyUntil: (seconds(NOW) + 600) * 1000,
      consent: 'unanswered',
    });
    expect(visitorMessageOf('watch_busy', visitorData())).toBeNull();
    expect(visitorMessageOf('watch_message', visitorData({ conversationId: '  ' }))).toBeNull();
    expect(watchNotificationAction('watch_message', visitorData())).toBeNull();
  });

  test('can be answered only while replyUntil is in the future', () => {
    const message = visitorMessageOf('watch_message', visitorData());
    expect(message && canReply(message, NOW)).toBe(true);
    expect(message && canReply(message, NOW + 601_000)).toBe(false);
    const closed = visitorMessageOf('watch_message', visitorData({ replyUntil: undefined }));
    expect(closed?.replyUntil).toBeNull();
    expect(closed && canReply(closed, NOW)).toBe(false);
  });

  test('shows the consent the visitor gave, and nothing it does not know', () => {
    expect(visitorConsentOf({ visitorConsent: 'granted' })).toBe('granted');
    expect(visitorConsentOf({ visitorConsent: 'declined' })).toBe('declined');
    expect(visitorConsentOf({ visitorConsent: 'unanswered' })).toBe('unanswered');
    expect(visitorConsentOf({ visitorConsent: 'maybe' })).toBeNull();
    expect(visitorConsentOf({})).toBeNull();
  });
});

describe('the reply', () => {
  test('posts to the visitor conversation on argus-sync, within what a camera may say', () => {
    expect(WATCH_ROUTES.reply('a'.repeat(32))).toBe(`/rtc/watch/${'a'.repeat(32)}/reply`);
    expect(WATCH_REPLY_MAX_CHARS).toBe(300);
  });

  test('reads queued or said with the time it is held until', () => {
    expect(readWatchReply({ state: 'queued', replyUntil: 1_800_000_000 })).toEqual({
      state: 'queued',
      replyUntil: 1_800_000_000_000,
    });
    expect(readWatchReply({ state: 'said', replyUntil: 1_800_000_000 })?.state).toBe('said');
    expect(readWatchReply({ state: 'heard', replyUntil: 1 })).toBeNull();
  });

  test('names each refusal the server gives', () => {
    expect(watchReplyOutcome({ ok: true, status: 200, info: { state: 'said' } })).toBe('said');
    expect(watchReplyOutcome({ ok: true, status: 200, info: { state: 'queued' } })).toBe('queued');
    expect(watchReplyOutcome({ ok: false, status: 404, info: null })).toBe('gone');
    expect(watchReplyOutcome({ ok: false, status: 410, info: null })).toBe('closed');
    expect(watchReplyOutcome({ ok: false, status: 422, info: null })).toBe('too-long');
    expect(watchReplyOutcome({ ok: false, status: 503, info: null })).toBe('failed');
  });
});
