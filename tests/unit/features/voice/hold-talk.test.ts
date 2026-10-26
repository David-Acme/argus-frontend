import { describe, expect, test } from 'bun:test';
import type { VoiceActionRecord, VoiceSnapshot } from '@/core/types';
import {
  HOLD_HEAR_WAIT_MS,
  HOLD_IDLE,
  HOLD_NO_REPLY,
  HOLD_NOT_HEARD,
  HOLD_REPLY_WAIT_MS,
  HOLD_SETTLE_MS,
  holdTalkFailureOf,
  holdTalkLive,
  holdTalkMutes,
  holdTalkSessionEnds,
  holdTalkStep,
  holdTalkVoiceOf,
  type HoldTalkState,
  type HoldTalkVoice,
} from '@/features/voice/model/hold-talk';

const ACTION: VoiceActionRecord = {
  id: '7',
  name: 'app.set_guard_mode',
  arguments: { mode: 'night' },
  status: 'done',
  detail: null,
};

const voice = (patch: Partial<HoldTalkVoice> = {}): HoldTalkVoice => ({
  phase: 'listening',
  said: '',
  reply: '',
  action: null,
  error: null,
  ...patch,
});

const listening = holdTalkStep(HOLD_IDLE, { type: 'start' });

const sending = holdTalkStep(listening, { type: 'release', send: true, at: 1000 });

const observe = (state: HoldTalkState, heard: HoldTalkVoice, at: number) =>
  holdTalkStep(state, { type: 'observe', voice: heard, at });

const snapshot = (patch: Partial<VoiceSnapshot>): VoiceSnapshot => ({
  phase: 'listening',
  isActive: true,
  muted: false,
  sttText: '',
  assistantText: '',
  transcript: [],
  actions: [],
  liveCameraId: null,
  liveCameraView: 'live',
  error: null,
  transport: 'rtc',
  callReason: null,
  responseId: null,
  waitingCall: null,
  closedCallId: null,
  closedReason: null,
  ...patch,
});

describe('holdTalkStep', () => {
  test('a hold starts listening from any stage', () => {
    expect(listening.stage).toBe('listening');
    expect(holdTalkStep({ ...HOLD_IDLE, stage: 'failed', error: 'X|' }, { type: 'start' })).toEqual(
      listening
    );
  });

  test('releasing inside sends, sliding off cancels', () => {
    expect(sending).toMatchObject({ stage: 'sending', releasedAt: 1000 });
    expect(holdTalkStep(listening, { type: 'release', send: false, at: 1000 }).stage).toBe(
      'cancelled'
    );
  });

  test('a release outside a listening hold changes nothing', () => {
    expect(holdTalkStep(HOLD_IDLE, { type: 'release', send: true, at: 1 })).toBe(HOLD_IDLE);
    expect(holdTalkStep(sending, { type: 'release', send: false, at: 2 })).toBe(sending);
  });

  test('a voice error while listening or sending fails with its code', () => {
    expect(
      observe(listening, voice({ phase: 'error', error: 'MIC_PERMISSION_DENIED|no' }), 1)
    ).toMatchObject({
      stage: 'failed',
      error: 'MIC_PERMISSION_DENIED|no',
    });
    expect(observe(sending, voice({ phase: 'error', error: null }), 1100)).toMatchObject({
      stage: 'failed',
      error: '',
    });
  });

  test('a session that ends while held was not heard', () => {
    expect(observe(listening, voice({ phase: 'done' }), 1)).toMatchObject({
      stage: 'failed',
      error: HOLD_NOT_HEARD,
    });
  });

  test('listening waits for the release whatever the voice does', () => {
    expect(observe(listening, voice({ phase: 'connecting' }), 1)).toBe(listening);
  });

  test('nothing heard within the wait fails as not heard', () => {
    expect(observe(sending, voice({ phase: 'connecting' }), 1000 + HOLD_HEAR_WAIT_MS - 1)).toBe(
      sending
    );
    expect(
      observe(sending, voice({ phase: 'connecting' }), 1000 + HOLD_HEAR_WAIT_MS)
    ).toMatchObject({
      stage: 'failed',
      error: HOLD_NOT_HEARD,
    });
  });

  test('heard but never answered fails as no reply', () => {
    const heard = voice({ phase: 'thinking', said: 'modo noche' });
    expect(observe(sending, heard, 1000 + HOLD_HEAR_WAIT_MS)).toBe(sending);
    expect(observe(sending, heard, 1000 + HOLD_REPLY_WAIT_MS)).toMatchObject({
      stage: 'failed',
      error: HOLD_NO_REPLY,
    });
  });

  test('a session that ends before any reply names what was missing', () => {
    expect(observe(sending, voice({ phase: 'done' }), 1100).error).toBe(HOLD_NOT_HEARD);
    expect(observe(sending, voice({ phase: 'idle', said: 'hola' }), 1100).error).toBe(
      HOLD_NO_REPLY
    );
  });

  test('a reply is answered once Argus has been listening again for the settle time', () => {
    const replied = voice({ said: 'modo noche', reply: 'Listo, modo noche.', action: ACTION });
    const speaking = observe(sending, { ...replied, phase: 'speaking' }, 2000);
    expect(speaking).toMatchObject({ stage: 'sending', settledAt: null });
    const quiet = observe(speaking, replied, 3000);
    expect(quiet).toMatchObject({ stage: 'sending', settledAt: 3000 });
    expect(observe(quiet, replied, 3000 + HOLD_SETTLE_MS - 1).stage).toBe('sending');
    expect(observe(quiet, replied, 3000 + HOLD_SETTLE_MS)).toEqual({
      ...HOLD_IDLE,
      stage: 'answered',
      answer: { said: 'modo noche', reply: 'Listo, modo noche.', action: ACTION },
    });
  });

  test('speaking again resets the settle clock', () => {
    const replied = voice({ said: 'hola', reply: 'Hola.' });
    const quiet = observe(sending, replied, 2000);
    expect(observe(quiet, { ...replied, phase: 'speaking' }, 2500).settledAt).toBeNull();
  });

  test('a reply followed by the end of the session is answered at once', () => {
    expect(
      observe(sending, voice({ phase: 'done', said: 'hola', reply: 'Hola.' }), 1200).stage
    ).toBe('answered');
  });

  test('a reply still speaking at the reply wait is answered', () => {
    const replied = voice({ phase: 'speaking', said: 'hola', reply: 'Hola.' });
    expect(observe(sending, replied, 1000 + HOLD_REPLY_WAIT_MS).stage).toBe('answered');
  });

  test('settled stages ignore the voice and a dismiss returns to idle', () => {
    const done = observe(sending, voice({ phase: 'done', said: 'a', reply: 'b' }), 1200);
    expect(observe(done, voice({ phase: 'error', error: 'X|' }), 1300)).toBe(done);
    expect(holdTalkStep(done, { type: 'dismiss' })).toEqual(HOLD_IDLE);
  });
});

describe('holdTalkVoiceOf', () => {
  test('reads the last thing said, the reply after it and the latest action', () => {
    const read = holdTalkVoiceOf(
      snapshot({
        phase: 'speaking',
        transcript: [
          { id: 'user-1', role: 'user', text: 'pon modo noche' },
          { id: 'assistant-1', role: 'assistant', text: 'Listo.' },
        ],
        actions: [ACTION],
      })
    );
    expect(read).toEqual({
      phase: 'speaking',
      said: 'pon modo noche',
      reply: 'Listo.',
      action: ACTION,
      error: null,
    });
  });

  test('an assistant line before anything was said is not a reply', () => {
    const read = holdTalkVoiceOf(
      snapshot({ transcript: [{ id: 'assistant-0', role: 'assistant', text: 'Hola.' }] })
    );
    expect(read).toMatchObject({ said: '', reply: '' });
  });

  test('a new utterance after a reply waits for its own reply', () => {
    const read = holdTalkVoiceOf(
      snapshot({
        transcript: [
          { id: 'user-1', role: 'user', text: 'hola' },
          { id: 'assistant-1', role: 'assistant', text: 'Hola.' },
          { id: 'user-2', role: 'user', text: 'y mañana' },
        ],
      })
    );
    expect(read).toMatchObject({ said: 'y mañana', reply: '' });
  });
});

describe('session effects', () => {
  test('the session ends when a live hold settles, not when it restarts', () => {
    const failed = observe(sending, voice({ phase: 'done' }), 1100);
    expect(holdTalkSessionEnds(sending, failed)).toBe(true);
    expect(
      holdTalkSessionEnds(
        listening,
        holdTalkStep(listening, { type: 'release', send: false, at: 1 })
      )
    ).toBe(true);
    expect(holdTalkSessionEnds(sending, listening)).toBe(false);
    expect(holdTalkSessionEnds(HOLD_IDLE, listening)).toBe(false);
  });

  test('live covers listening and sending only', () => {
    expect([HOLD_IDLE, listening, sending].map(holdTalkLive)).toEqual([false, true, true]);
  });

  test('the microphone closes once the turn was heard and taken', () => {
    expect(holdTalkMutes('sending', voice({ phase: 'thinking', said: 'hola' }))).toBe(true);
    expect(holdTalkMutes('sending', voice({ phase: 'listening', said: 'hola' }))).toBe(false);
    expect(holdTalkMutes('sending', voice({ phase: 'thinking' }))).toBe(false);
    expect(holdTalkMutes('listening', voice({ phase: 'thinking', said: 'hola' }))).toBe(false);
  });
});

describe('holdTalkFailureOf', () => {
  test('maps codes to the failure the card words, never the raw text', () => {
    expect(holdTalkFailureOf(HOLD_NOT_HEARD)).toBe('not-heard');
    expect(holdTalkFailureOf(HOLD_NO_REPLY)).toBe('no-reply');
    expect(holdTalkFailureOf('MIC_PERMISSION_DENIED|denied')).toBe('permission');
    expect(holdTalkFailureOf('SOCKET_LOST|closed')).toBe('connection');
    expect(holdTalkFailureOf('SOCKET_UNAVAILABLE|')).toBe('connection');
    expect(holdTalkFailureOf('SESSION_REVOKED|')).toBe('session');
    expect(holdTalkFailureOf('ACCOUNT_DISABLED|')).toBe('account');
    expect(holdTalkFailureOf('RTC_UNAVAILABLE|livekit down')).toBe('generic');
    expect(holdTalkFailureOf(null)).toBe('generic');
  });
});
