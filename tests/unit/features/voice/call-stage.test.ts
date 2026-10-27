import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { TranslateFn, VoiceActionRecord } from '@/core/types';
import {
  endedSummaryOf,
  formatCallClock,
  isLivePhase,
  postsSummaryNotice,
  stageAuraOf,
  stageMomentOf,
  stageHintOf,
  stageLineOf,
  stagePresenceOf,
  summaryBodyOf,
} from '@/features/voice/model/call-stage';

const t: TranslateFn = (key, ...rest) => translate(localeDictionaries.es, key, ...rest);

const line = {
  t,
  phase: 'connecting' as const,
  elapsedMs: 0,
  connected: false,
  reason: null,
  endedDurationMs: null,
};

const action = (
  id: string,
  status: VoiceActionRecord['status'],
  name: VoiceActionRecord['name'] = 'app.set_guard_mode'
): VoiceActionRecord => ({
  id,
  name,
  arguments: { mode: 'night' },
  status,
  detail: null,
});

describe('the moment the call stage shows', () => {
  test('a call is live until it fails or ends', () => {
    expect(stageMomentOf({ phase: 'connecting', endedDurationMs: null })).toBe('live');
    expect(stageMomentOf({ phase: 'speaking', endedDurationMs: null })).toBe('live');
    expect(stageMomentOf({ phase: 'error', endedDurationMs: null })).toBe('failed');
    expect(stageMomentOf({ phase: 'done', endedDurationMs: null })).toBe('failed');
    expect(stageMomentOf({ phase: 'speaking', endedDurationMs: 42_000 })).toBe('ended');
  });

  test('Estela listens from the first instant, so connecting never reads as a wait', () => {
    expect(stagePresenceOf({ moment: 'live', phase: 'connecting', kind: 'reminder' })).toBe(
      'listen'
    );
    expect(stagePresenceOf({ moment: 'live', phase: 'idle', kind: 'reminder' })).toBe('listen');
  });

  test('Estela follows the conversation with the real engine states', () => {
    expect(stagePresenceOf({ moment: 'live', phase: 'listening', kind: 'reminder' })).toBe(
      'listen'
    );
    expect(stagePresenceOf({ moment: 'live', phase: 'speaking', kind: 'reminder' })).toBe('speak');
    expect(stagePresenceOf({ moment: 'live', phase: 'thinking', kind: 'reminder' })).toBe('think');
    expect(stagePresenceOf({ moment: 'ended', phase: 'speaking', kind: 'alert' })).toBe('idle');
    expect(stagePresenceOf({ moment: 'failed', phase: 'error', kind: 'reminder' })).toBe('error');
  });

  test('an alert call keeps the red curl except while someone talks', () => {
    expect(stagePresenceOf({ moment: 'live', phase: 'connecting', kind: 'alert' })).toBe('alert');
    expect(stagePresenceOf({ moment: 'live', phase: 'thinking', kind: 'alert' })).toBe('alert');
    expect(stagePresenceOf({ moment: 'live', phase: 'speaking', kind: 'alert' })).toBe('speak');
  });

  test('only listening, thinking and speaking start the call clock', () => {
    expect(isLivePhase('listening')).toBe(true);
    expect(isLivePhase('speaking')).toBe(true);
    expect(isLivePhase('thinking')).toBe(true);
    expect(isLivePhase('connecting')).toBe(false);
    expect(isLivePhase('reconnecting')).toBe(false);
  });

  test('the clock reads like a phone call', () => {
    expect(formatCallClock(0)).toBe('0:00');
    expect(formatCallClock(42_500)).toBe('0:42');
    expect(formatCallClock(72_000)).toBe('1:12');
    expect(formatCallClock(-5)).toBe('0:00');
  });
});

describe('what the call shows Argus did', () => {
  test('the ended summary lists the last two things that were done', () => {
    const done = [
      action('1', 'done'),
      action('2', 'failed'),
      action('3', 'done'),
      action('4', 'done'),
    ];
    expect(endedSummaryOf(done).map((entry) => entry.id)).toEqual(['3', '4']);
  });

  test('a silent summary notification is posted only when the app is not in front or the phone is locked', () => {
    expect(postsSummaryNotice({ appActive: true, locked: false })).toBe(false);
    expect(postsSummaryNotice({ appActive: false, locked: false })).toBe(true);
    expect(postsSummaryNotice({ appActive: true, locked: true })).toBe(true);
  });

  test('the summary body joins what was done, or points to the conversation', () => {
    expect(summaryBodyOf(['Modo noche', 'Cámara Patio'], 'x')).toBe('Modo noche · Cámara Patio');
    expect(summaryBodyOf([], 'Abre Argus para ver la conversación.')).toBe(
      'Abre Argus para ver la conversación.'
    );
  });
});

describe('the words under Argus', () => {
  test('the subject while connecting, the clock once connected, never a wait', () => {
    expect(stageLineOf({ ...line, moment: 'live', reason: 'Pagar la luz' })).toBe('Pagar la luz');
    expect(stageLineOf({ ...line, moment: 'live' })).toBe('0:00');
    expect(
      stageLineOf({
        ...line,
        moment: 'live',
        phase: 'listening',
        connected: true,
        elapsedMs: 42_000,
        reason: 'x',
      })
    ).toBe('0:42');
  });

  test('the end reads as a call that ended, a drop as a drop', () => {
    expect(stageLineOf({ ...line, moment: 'ended', endedDurationMs: 72_000 })).toBe(
      'Llamada terminada · 1:12'
    );
    expect(stageLineOf({ ...line, moment: 'failed', phase: 'error' })).toBe('La llamada se cortó');
  });

  test('the hint names a drop, then mute, then the notice', () => {
    const hint = { t, error: null, muted: false, notice: 'aviso' };
    expect(stageHintOf({ ...hint, phase: 'listening', muted: true })).toBe('Micrófono silenciado');
    expect(stageHintOf({ ...hint, phase: 'listening' })).toBe('aviso');
    expect(stageHintOf({ ...hint, phase: 'error', error: 'RTC_UNAVAILABLE|down' })).not.toContain(
      'RTC_UNAVAILABLE'
    );
  });
});

describe('the light behind the call', () => {
  test('a live call sits on the listen tone, an alert keeps its own, an ended call has none', () => {
    expect(stageAuraOf({ moment: 'live', kind: 'reminder' })).toBe('listen');
    expect(stageAuraOf({ moment: 'live', kind: 'alert' })).toBe('alert');
    expect(stageAuraOf({ moment: 'failed', kind: 'reminder' })).toBeNull();
    expect(stageAuraOf({ moment: 'ended', kind: 'alert' })).toBeNull();
  });
});
