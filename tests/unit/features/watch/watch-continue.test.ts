import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { TranslateFn, TranslationKey } from '@/core/types';
import { readRtcData } from '@/features/voice/model/rtc-protocol';
import { voiceErrorMessage } from '@/features/voice/model/voice-error';
import {
  readWatchHandoff,
  WATCH_CAMERA_STAYS_ERROR,
  WATCH_HANDOFF_BUDGET_MS,
  watchHandoffStep,
} from '@/features/voice/model/watch-handoff';
import {
  WATCH_NOTIFICATION_ICONS,
  WATCH_NOTIFICATION_KINDS,
  watchNotificationAction,
  watchNotificationKind,
} from '@/features/watch/model/watch-notification';

const es = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;
const en = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.en, key as never, params as never)) as TranslateFn;

const source = (relative: string) => readFileSync(join(import.meta.dir, '../../../../src', relative), 'utf8');

describe('"Continuar aquí": make before break', () => {
  test('the hand-off frame names its conversation and the leg that now carries it', () => {
    expect(readWatchHandoff({ conversationId: 'w-1', state: 'device' })).toEqual({ conversationId: 'w-1', leg: 'device' });
    expect(readWatchHandoff({ conversationId: 'w-1', leg: 'camera' })).toEqual({ conversationId: 'w-1', leg: 'camera' });
    expect(readWatchHandoff({ conversationId: 'w-1', state: 'phone' })).toBeNull();
    expect(readWatchHandoff({ state: 'device' })).toBeNull();
    expect(readWatchHandoff('device')).toBeNull();
  });

  test('the microphone opens only when the server says the device leg is live, for this conversation', () => {
    expect(watchHandoffStep('w-1', { conversationId: 'w-1', leg: 'device' })).toBe('open-microphone');
    expect(watchHandoffStep('w-1', { conversationId: 'w-1', leg: 'bridging' })).toBe('wait');
    expect(watchHandoffStep('w-1', { conversationId: 'w-1', leg: 'camera' })).toBe('camera-stays');
    expect(watchHandoffStep('w-1', { conversationId: 'w-2', leg: 'device' })).toBe('ignore');
    expect(watchHandoffStep(null, { conversationId: 'w-1', leg: 'device' })).toBe('ignore');
  });

  test('the agent says it on its own data topic', () => {
    expect(readRtcData('argus.handoff', '{"conversationId":"w-1","state":"device"}')).toEqual({
      type: 'voice:handoff',
      payload: { conversationId: 'w-1', state: 'device' },
    });
  });

  test('the device joins muted, asks the token for the conversation, and gives up after the budget', () => {
    expect(WATCH_HANDOFF_BUDGET_MS).toBeGreaterThanOrEqual(10_000);
    const service = source('features/voice/services/voice/voice.service.ts');
    expect(service).toContain('if (options.watchConversationId) this.armHandoff(session, options.watchConversationId);');
    expect(service).toMatch(/private armHandoff\(session: number, conversationId: string\): void \{\s*this\.handoffConversationId = conversationId;\s*this\.muted = true;/);
    expect(service).toContain('watchConversationId: options.watchConversationId,');
    expect(service).toContain("this.fail('RTC_UNAVAILABLE|This device cannot take the camera conversation');");
    expect(service).toMatch(/completeWatchHandoff\(conversationId: string\): void \{[\s\S]{0,200}this\.setMuted\(false\);/);
    const feed = source('features/watch/services/watch-feed.ts');
    expect(feed).toContain("if (conversation.handoff === 'device') completeWatchHandoff(conversation.conversationId);");
  });

  test('a hand-off that fails says the conversation stayed on the camera', () => {
    expect(voiceErrorMessage(WATCH_CAMERA_STAYS_ERROR, es)).toBe(
      'No se pudo pasar a este dispositivo: la conversación sigue en la cámara.'
    );
    expect(voiceErrorMessage('WATCH_EXPIRED|gone', en)).toBe('That camera conversation has already ended.');
  });
});

describe('camera conversation notifications', () => {
  test('a busy line or a dropped camera offers to continue, the details open the transcript', () => {
    expect(watchNotificationAction('watch_busy', { conversationId: 'w-1' })).toEqual({
      kind: 'continue',
      conversationId: 'w-1',
    });
    expect(watchNotificationAction('watch_resume', { conversationId: ' w-2 ' })).toEqual({
      kind: 'continue',
      conversationId: 'w-2',
    });
    expect(watchNotificationAction('watch_busy', {})).toEqual({ kind: 'transcript' });
    expect(watchNotificationAction('watch_details', { conversationId: 'w-1' })).toEqual({ kind: 'transcript' });
  });

  test('a refused sensitive request opens the app screen that confirms it, and nothing outside the app', () => {
    expect(watchNotificationAction('watch_confirm', { url: '/security' })).toEqual({ kind: 'open', href: '/security' });
    expect(watchNotificationAction('watch_confirm', { url: 'https://evil.example' })).toBeNull();
    expect(watchNotificationAction('watch_confirm', { url: '//evil' })).toBeNull();
    expect(watchNotificationAction('watch_confirm', {})).toBeNull();
  });

  test("a visitor's message is read as it is, and unknown kinds are not this feature's", () => {
    expect(watchNotificationAction('watch_message', { fromName: 'Juan' })).toBeNull();
    expect(watchNotificationKind('guard_episode')).toBeNull();
    expect(watchNotificationAction(null, {})).toBeNull();
    for (const kind of WATCH_NOTIFICATION_KINDS) expect(WATCH_NOTIFICATION_ICONS[kind]).toBeTruthy();
  });

  test('the row shows the actions, in words both languages have', () => {
    const row = source('features/home/components/feed/news-item.tsx');
    expect(row).toMatch(
      /<WatchNotificationAction\s+kind=\{watchKind\}\s+data=\{thread\.latest\.data\}\s+onDone=\{onRead\}\s*\/>/
    );
    for (const key of ['continue-action', 'open-action', 'transcript-action']) {
      expect(es(`screens.watch.notification.${key}` as TranslationKey)).not.toBe(`screens.watch.notification.${key}`);
      expect(en(`screens.watch.notification.${key}` as TranslationKey)).not.toBe(`screens.watch.notification.${key}`);
    }
    expect(es('screens.watch.continue-here')).toBe('Continuar aquí');
  });
});
