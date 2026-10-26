import { afterEach, beforeEach, describe, expect, mock, setSystemTime, test } from 'bun:test';
import { join } from 'node:path';
import type { IRealtimeCall, IServiceResponse, ISocketEmitDto } from '@/core/interfaces';
import type { RtcEvent, RtcJoin } from '@/core/types';
import { readTokenAnswer } from '@/features/voice/model/rtc-protocol';
import { AppState } from 'react-native';

const setAppState = (state: string) => Object.assign(AppState, { currentState: state });

type Posted = { url: string; body: unknown };

const posted: Posted[] = [];
const sentFrames: { type: string; payload: unknown }[] = [];
const operationListeners = new Map<number, (message: ISocketEmitDto) => void>();
const typeListeners = new Map<string, (payload: unknown) => void>();
let tokenAnswers: IServiceResponse<unknown>[] = [];
let deferredAnswer: Promise<IServiceResponse<unknown>> | null = null;
let realtimeSupported = true;
let throwNextToken = false;

class FakeCall implements IRealtimeCall {
  joins: RtcJoin[] = [];
  sent: { topic: string; payload: string }[] = [];
  microphone: boolean[] = [];
  left = 0;
  listener: (event: RtcEvent) => void = () => undefined;
  async join(joinRequest: RtcJoin, listener: (event: RtcEvent) => void): Promise<void> {
    this.joins.push(joinRequest);
    this.listener = listener;
    listener({ kind: 'state', state: 'connecting', reason: null });
    listener({ kind: 'state', state: 'connected', reason: null });
  }
  async setMicrophone(enabled: boolean): Promise<void> {
    this.microphone.push(enabled);
  }
  microphoneOn(): boolean {
    return this.microphone.at(-1) ?? true;
  }
  async send(topic: string, payload: string): Promise<void> {
    this.sent.push({ topic, payload });
  }
  async leave(): Promise<void> {
    this.left += 1;
  }
}

let call = new FakeCall();
const stoppedOngoing: number[] = [];
const sharedMute: boolean[] = [];
let callControl: (action: 'hangup' | 'mute-on' | 'mute-off') => void = () => undefined;
const endedSessions: (string | null)[] = [];
const micModule = join(
  import.meta.dir,
  '../../../../src/features/voice/services/voice/voice-platform.ts'
);
const fakeMic = {
  start: () => undefined,
  stop: () => undefined,
  playerStart: () => undefined,
  playerWrite: () => undefined,
  playerFlush: () => undefined,
  playerStop: () => undefined,
  playedSamples: () => 0,
  onData: null,
  onError: null,
  onPlayerIdle: null,
};

mock.module('react-native-reanimated', () => ({
  makeMutable: <T>(value: T) => ({ value }),
  withTiming: <T>(value: T) => value,
  useSharedValue: undefined,
  useFrameCallback: undefined,
}));
mock.module('expo-audio', () => ({
  getRecordingPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
  requestRecordingPermissionsAsync: async () => ({ granted: true }),
}));
mock.module('@/core/services/permissions', () => ({
  permissionsService: {
    read: async () => ({ granted: true, canAskAgain: true }),
    request: async () => ({ granted: true, canAskAgain: true }),
    openSettings: async () => undefined,
    asked: () => true,
    markAsked: () => undefined,
  },
}));
mock.module('@/features/voice/services/rtc/rtc-token', () => ({
  requestCallDecline: async (body: unknown) => {
    posted.push({ url: '/rtc/decline', body });
    return { kind: 'declined' as const };
  },
  requestCallToken: async (body: unknown) => {
    posted.push({ url: '/rtc/token', body });
    if (throwNextToken) {
      throwNextToken = false;
      throw new Error('network down');
    }
    if (deferredAnswer) {
      const pending = deferredAnswer;
      deferredAnswer = null;
      return readTokenAnswer(await pending);
    }
    return readTokenAnswer(
      tokenAnswers.shift() ?? {
        status: 503,
        ok: false,
        info: null,
        errors: { code: 'RTC_UNAVAILABLE', message: '' },
      }
    );
  },
}));
mock.module('@/core/services/sync', () => ({
  synchronizeService: {
    ensureConnected: async () => true,
    isSocketConnected: true,
    send: (type: string, payload: unknown) => sentFrames.push({ type, payload }),
    sendBinary: () => undefined,
    onType: (type: string, listener: (payload: unknown) => void) => {
      typeListeners.set(type, listener);
      return () => undefined;
    },
    onBinary: () => () => undefined,
    on: (operation: number, listener: (message: ISocketEmitDto) => void) => {
      operationListeners.set(operation, listener);
      return () => undefined;
    },
  },
}));
mock.module('@/core/services/push', () => ({
  pushService: {
    stopOngoingCall: () => stoppedOngoing.push(1),
    onCallControl: (listener: typeof callControl) => {
      callControl = listener;
      return () => undefined;
    },
    setCallMuted: (muted: boolean) => sharedMute.push(muted),
    telecomCallActive: () => false,
    startAssistantCall: async () => false,
  },
}));
mock.module('@/features/voice/services/voice/voice-session-end', () => ({
  endRevokedSession: (cause: string | null) => endedSessions.push(cause),
}));
mock.module('@/features/voice/services/rtc', () => ({
  rtcCallSupported: () => realtimeSupported,
  createRealtimeCall: () => call,
}));
mock.module(micModule, () => ({
  createVoiceMic: () => fakeMic,
  voiceCallSupported: () => true,
  argusCallSupported: () => true,
}));

Object.assign(globalThis, { __DEV__: false });

const { voiceService } = await import('@/features/voice/services/voice/voice.service');

const grant = (callId: string) => ({
  status: 200,
  ok: true,
  info: {
    url: 'wss://argus.local:7046',
    token: 'jwt',
    room: `u7.${callId}`,
    identity: 'user:7:s',
    agentIdentity: 'argus-voice',
    callId,
    expiresAt: 2_000_000_000,
  },
  errors: null,
});

const userCall = 'rtc-' + 'b'.repeat(32);
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  voiceService.stop();
  posted.length = 0;
  sentFrames.length = 0;
  tokenAnswers = [];
  throwNextToken = false;
  setAppState('active');
  realtimeSupported = true;
  call = new FakeCall();
});

describe('a WebRTC call', () => {
  test('claims a token, joins and follows the agent state', async () => {
    tokenAnswers = [grant(userCall)];
    await voiceService.start();
    expect(posted).toEqual([{ url: '/rtc/token', body: { callId: undefined } }]);
    expect(call.joins).toEqual([
      { url: 'wss://argus.local:7046', token: 'jwt', agentIdentity: 'argus-voice', iceServers: [] },
    ]);
    expect(voiceService.snapshot.transport).toBe('rtc');
    expect(voiceService.snapshot.phase).toBe('connecting');
    call.listener({ kind: 'agent', identity: 'argus-voice', state: 'speaking' });
    expect(voiceService.snapshot.phase).toBe('speaking');
    call.listener({ kind: 'agent', identity: 'argus-voice', state: 'listening' });
    expect(voiceService.snapshot.phase).toBe('listening');
    call.listener({ kind: 'state', state: 'reconnecting', reason: null });
    expect(voiceService.snapshot.phase).toBe('reconnecting');
    call.listener({ kind: 'state', state: 'connected', reason: null });
    expect(voiceService.snapshot.phase).toBe('listening');
    expect(sentFrames).toEqual([]);
  });

  test('an answer whose request throws ends in the error state, never waiting in connecting', async () => {
    throwNextToken = true;
    await voiceService.start({ callId: 'call-throws' });
    expect(voiceService.snapshot.phase).toBe('error');
    expect(voiceService.snapshot.error).toStartWith('CALL_CONNECT_FAILED|network down');
  });

  test('room data feeds the transcript and actions, app frames go back on topics', async () => {
    tokenAnswers = [grant(userCall)];
    await voiceService.start();
    const actions: string[] = [];
    const unsubscribe = voiceService.onAction((action) => actions.push(action.name));
    call.listener({
      kind: 'data',
      topic: 'argus.stt',
      payload: '{"text":"abre el patio","final":true}',
    });
    call.listener({ kind: 'data', topic: 'argus.turn', payload: '{"id":3}' });
    call.listener({
      kind: 'data',
      topic: 'argus.assistant',
      payload: '{"text":"Claro.","turnId":3}',
    });
    call.listener({
      kind: 'data',
      topic: 'argus.action',
      payload: '{"id":5,"name":"app.show_camera","arguments":{"camera":"Patio"}}',
    });
    expect(voiceService.snapshot.transcript.map((line) => line.text)).toEqual([
      'abre el patio',
      'Claro.',
    ]);
    expect(actions).toEqual(['app.show_camera']);
    voiceService.completeAction('5', { ok: true, detail: null });
    voiceService.sendContext({ kind: 'note', text: 'Cámaras: Patio.' });
    voiceService.setMuted(true);
    voiceService.interrupt();
    await settle();
    expect(call.sent.map((frame) => frame.topic)).toEqual([
      'argus.action_result',
      'argus.context',
      'argus.mute',
      'argus.skip',
    ]);
    expect(JSON.parse(call.sent[0]?.payload ?? '')).toEqual({ id: 5, ok: true, detail: '' });
    expect(call.microphone).toEqual([false]);
    expect(sentFrames).toEqual([]);
    unsubscribe();
  });

  test('context sent while the call connects reaches the room once it is up', async () => {
    tokenAnswers = [grant(userCall)];
    const starting = voiceService.start();
    voiceService.sendContext({ kind: 'note', text: 'Cámaras: Patio.' });
    expect(call.sent).toHaveLength(0);
    await starting;
    await settle();
    expect(call.sent.map((frame) => frame.topic)).toEqual(['argus.context']);
    expect(sentFrames).toEqual([]);
  });

  test('hanging up sends argus.hangup and leaves the room', async () => {
    tokenAnswers = [grant(userCall)];
    await voiceService.start();
    voiceService.stop();
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(call.sent.map((frame) => frame.topic)).toEqual(['argus.hangup']);
    expect(call.left).toBe(1);
    expect(voiceService.snapshot.phase).toBe('idle');
  });

  test('the hang-up from the call notification or the system ends the call like the in-app hang-up', async () => {
    tokenAnswers = [grant(userCall)];
    await voiceService.start();
    callControl('hangup');
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(call.sent.map((frame) => frame.topic)).toEqual(['argus.hangup']);
    expect(call.left).toBe(1);
    expect(voiceService.snapshot.phase).toBe('idle');
  });

  test('the mute from the call notification mutes the microphone and the app mute is shared back', async () => {
    tokenAnswers = [grant(userCall)];
    await voiceService.start();
    sharedMute.length = 0;
    callControl('mute-on');
    expect(call.microphone.at(-1)).toBe(false);
    callControl('mute-off');
    expect(call.microphone.at(-1)).toBe(true);
    expect(sharedMute).toEqual([true, false]);
  });

  test('argus.done ends the call', async () => {
    tokenAnswers = [grant(userCall)];
    await voiceService.start();
    call.listener({ kind: 'data', topic: 'argus.done', payload: '{"reason":"timeout"}' });
    await settle();
    expect(voiceService.snapshot.phase).toBe('done');
    expect(voiceService.snapshot.isActive).toBe(false);
    expect(call.left).toBe(1);
  });

  test('a removed participant ends as a revoked session', async () => {
    tokenAnswers = [grant(userCall)];
    await voiceService.start();
    call.listener({ kind: 'state', state: 'disconnected', reason: 'revoked' });
    expect(voiceService.snapshot.phase).toBe('error');
    expect(voiceService.snapshot.error).toStartWith('SESSION_REVOKED');
  });

  test('a revoked session hears the farewell, then ends without resuming', async () => {
    endedSessions.length = 0;
    tokenAnswers = [grant(userCall)];
    await voiceService.start();
    call.listener({
      kind: 'data',
      topic: 'argus.done',
      payload: '{"reason":"revoked","cause":"logout"}',
    });
    call.listener({
      kind: 'data',
      topic: 'argus.assistant',
      payload: '{"text":"Tu sesión se ha cerrado, cuelgo.","turnId":9}',
    });
    expect(voiceService.snapshot.isActive).toBe(true);
    expect(call.left).toBe(0);
    voiceService.stop();
    expect(call.left).toBe(0);
    expect(call.sent).toHaveLength(0);
    call.listener({ kind: 'state', state: 'disconnected', reason: 'revoked' });
    await settle();
    expect(voiceService.snapshot.error).toStartWith('SESSION_REVOKED');
    expect(call.left).toBe(1);
    expect(call.sent).toHaveLength(0);
    expect(posted).toHaveLength(1);
    expect(endedSessions).toEqual(['logout']);
  });

  test('a disabled account ends with its own wording when the room is deleted', async () => {
    endedSessions.length = 0;
    tokenAnswers = [grant(userCall)];
    await voiceService.start();
    call.listener({
      kind: 'data',
      topic: 'argus.done',
      payload: '{"reason":"revoked","cause":"accountDisabled"}',
    });
    call.listener({ kind: 'state', state: 'disconnected', reason: 'ended' });
    expect(voiceService.snapshot.error).toStartWith('ACCOUNT_DISABLED');
    expect(endedSessions).toEqual(['accountDisabled']);
  });

  test('a lost connection resumes the same call', async () => {
    tokenAnswers = [grant(userCall), grant(userCall)];
    await voiceService.start();
    call.listener({ kind: 'state', state: 'disconnected', reason: 'lost' });
    expect(voiceService.snapshot.phase).toBe('reconnecting');
    await settle();
    await settle();
    expect(posted[1]).toEqual({ url: '/rtc/token', body: { callId: userCall, resume: true } });
    expect(call.joins).toHaveLength(2);
    expect(voiceService.snapshot.isActive).toBe(true);
  });
});

describe('fallback and outcomes', () => {
  test('an absent LiveKit falls back to the PCM call over /sync', async () => {
    const starting = voiceService.start();
    voiceService.sendContext({ kind: 'note', text: 'Cámaras: Patio.' });
    await starting;
    expect(voiceService.snapshot.transport).toBe('sync');
    expect(sentFrames[0]).toEqual({ type: 'voice:start', payload: { mode: 'duplex', leg: 'laptop' } });
    expect(sentFrames[1]?.type).toBe('voice:context');
    expect(call.joins).toHaveLength(0);
  });

  test('a platform without WebRTC never asks for a token', async () => {
    realtimeSupported = false;
    await voiceService.start();
    expect(posted).toHaveLength(0);
    expect(sentFrames[0]?.type).toBe('voice:start');
  });

  test('a call answered elsewhere is an outcome, not a fallback', async () => {
    tokenAnswers = [
      { status: 409, ok: false, info: null, errors: { code: 'CALL_TAKEN', message: '' } },
    ];
    await voiceService.start({ callId: 'call-41' });
    expect(voiceService.snapshot.error).toStartWith('CALL_TAKEN');
    expect(sentFrames).toHaveLength(0);
  });

  test('a proactive call cannot fall back to the PCM path', async () => {
    await voiceService.start({ callId: 'call-41' });
    expect(voiceService.snapshot.error).toStartWith('RTC_UNAVAILABLE');
    expect(sentFrames).toHaveLength(0);
  });
});

describe('Argus calls you', () => {
  const ring = (overrides: Record<string, unknown> = {}) => ({
    operation: 8,
    option: 'notification',
    info: {
      callId: 'call-41',
      reason: 'Persona desconocida · Patio',
      summary: '',
      urgency: 'critical',
      kind: 'guard_episode',
      lang: 'es',
      expiresAt: Math.floor(Date.now() / 1000) + 40,
      ...overrides,
    },
  });

  test('a ring in the foreground waits for the user: the reason is shown and nothing is claimed', async () => {
    tokenAnswers = [grant('call-41')];
    const rang: string[] = [];
    const unsubscribe = voiceService.onIncoming((incoming) => rang.push(incoming.callId));
    operationListeners.get(8)?.(ring() as unknown as ISocketEmitDto);
    await settle();
    await settle();
    expect(rang).toEqual(['call-41']);
    expect(posted).toHaveLength(0);
    expect(voiceService.snapshot.waitingCall?.callId).toBe('call-41');
    expect(voiceService.snapshot.waitingCall?.reason).toBe('Persona desconocida · Patio');
    expect(voiceService.snapshot.isActive).toBe(false);
    unsubscribe();
  });

  test('answering the waiting ring claims it and joins the call', async () => {
    tokenAnswers = [grant('call-41')];
    operationListeners.get(8)?.(ring() as unknown as ISocketEmitDto);
    await settle();
    voiceService.answerWaiting();
    await settle();
    await settle();
    expect(posted[0]).toEqual({ url: '/rtc/token', body: { callId: 'call-41' } });
    expect(voiceService.snapshot.callReason).toBe('Persona desconocida · Patio');
    expect(voiceService.snapshot.transport).toBe('rtc');
  });

  test('the cancel that follows our own claim does not end the call', async () => {
    let answer: (value: IServiceResponse<unknown>) => void = () => undefined;
    deferredAnswer = new Promise<IServiceResponse<unknown>>((resolve) => {
      answer = resolve;
    });
    operationListeners.get(8)?.(ring() as unknown as ISocketEmitDto);
    await settle();
    voiceService.answerWaiting();
    await settle();
    operationListeners.get(9)?.({
      operation: 9,
      option: 'notification',
      info: { callId: 'call-41', reason: 'answered_elsewhere' },
    } as unknown as ISocketEmitDto);
    expect(voiceService.snapshot.error).toBeNull();
    answer(grant('call-41'));
    await settle();
    await settle();
    expect(voiceService.snapshot.transport).toBe('rtc');
    expect(voiceService.snapshot.isActive).toBe(true);
  });

  test('a ring answered by another device ends before our claim, with their name', async () => {
    let answer: (value: IServiceResponse<unknown>) => void = () => undefined;
    deferredAnswer = new Promise<IServiceResponse<unknown>>((resolve) => {
      answer = resolve;
    });
    operationListeners.get(8)?.(
      ring({ responseId: 7, discreet: true, offers: ['camera'] }) as unknown as ISocketEmitDto
    );
    await settle();
    expect(voiceService.snapshot.waitingCall?.responseId).toBe(7);
    voiceService.answerWaiting();
    await settle();
    answer({ status: 409, ok: false, info: null, errors: { code: 'CALL_TAKEN', message: '' } });
    await settle();
    expect(voiceService.snapshot.error).toStartWith('CALL_TAKEN');
  });

  test('a ring during a live call waits for the user instead of joining', async () => {
    tokenAnswers = [grant(userCall), grant('call-42')];
    await voiceService.start();
    operationListeners.get(8)?.(
      ring({ callId: 'call-42', reason: 'Agenda · Dentista' }) as unknown as ISocketEmitDto
    );
    expect(voiceService.snapshot.waitingCall?.callId).toBe('call-42');
    expect(posted).toHaveLength(1);
    operationListeners.get(9)?.({
      operation: 9,
      info: { callId: 'call-42', reason: 'expired' },
    } as unknown as ISocketEmitDto);
    expect(voiceService.snapshot.waitingCall).toBeNull();
    expect(voiceService.snapshot.transport).toBe('rtc');
    operationListeners.get(8)?.(
      ring({ callId: 'call-42', reason: 'Agenda · Dentista' }) as unknown as ISocketEmitDto
    );
    voiceService.answerWaiting();
    await settle();
    await settle();
    expect(posted[1]).toEqual({ url: '/rtc/token', body: { callId: 'call-42' } });
    expect(voiceService.snapshot.callReason).toBe('Agenda · Dentista');
    expect(voiceService.snapshot.waitingCall).toBeNull();
  });

  test('a ring in the background, an expired ring or a ring during a call is left to the server', async () => {
    setAppState('background');
    operationListeners.get(8)?.(ring() as unknown as ISocketEmitDto);
    setAppState('active');
    operationListeners.get(8)?.(ring({ expiresAt: 1 }) as unknown as ISocketEmitDto);
    await settle();
    expect(posted).toHaveLength(0);
    tokenAnswers = [grant(userCall)];
    await voiceService.start();
    operationListeners.get(8)?.(ring({ callId: 'call-42' }) as unknown as ISocketEmitDto);
    await settle();
    expect(posted).toHaveLength(1);
    expect(voiceService.snapshot.waitingCall?.callId).toBe('call-42');
  });
});

describe('a withheld turn leaves no trace of the words', () => {
  beforeEach(() => {
    setSystemTime(new Date(Date.now() + 60_000));
  });

  afterEach(() => {
    setSystemTime();
  });

  const words = 'rojo verde azul';
  const userTexts = () =>
    voiceService.snapshot.transcript.filter((line) => line.role === 'user').map((line) => line.text);
  const traceOfWords = () => JSON.stringify(voiceService.snapshot).includes(words);
  const data = (topic: string, payload: unknown) =>
    call.listener({ kind: 'data', topic, payload: JSON.stringify(payload) });
  const frame = (type: string, payload: unknown) => {
    const listener = typeListeners.get(type);
    if (!listener) throw new Error(`no listener for ${type}`);
    listener(payload);
  };

  test('the direct path shows the ellipsis the server sent, and the words never arrive', async () => {
    tokenAnswers = [grant(userCall)];
    await voiceService.start();
    data('argus.stt', { text: words.slice(0, 5), final: false });
    data('argus.stt', { text: '…', final: true });
    expect(userTexts()).toEqual(['…']);
    expect(voiceService.snapshot.sttText).toBe('…');
    expect(traceOfWords()).toBe(false);
  });

  test('a correction replaces the shown words in place, with no second bubble', async () => {
    tokenAnswers = [grant(userCall)];
    await voiceService.start();
    data('argus.stt', { text: words, final: true });
    expect(userTexts()).toEqual([words]);
    data('argus.stt_correction', { text: '…' });
    data('argus.turn', { id: 4 });
    data('argus.assistant', { text: '¿Perdona? No te he entendido.', turnId: 4 });
    expect(userTexts()).toEqual(['…']);
    expect(voiceService.snapshot.sttText).toBe('…');
    expect(voiceService.snapshot.transcript.map((line) => line.role)).toEqual(['user', 'assistant']);
    expect(traceOfWords()).toBe(false);
  });

  test('a correction before any final transcript of the call is ignored', async () => {
    tokenAnswers = [grant(userCall)];
    await voiceService.start();
    data('argus.stt_correction', { text: '…' });
    expect(voiceService.snapshot.transcript).toEqual([]);
  });

  test('a second unheard turn in a row: an event alone adds nothing, and a correction then an event removes the words', async () => {
    tokenAnswers = [grant(userCall)];
    await voiceService.start();
    data('argus.stt', { text: '…', final: true });
    data('argus.event', { reaction: 'confused', intensity: 0.6 });
    data('argus.turn', { id: 5 });
    data('argus.assistant', { text: '¿Perdona?', turnId: 5 });
    data('argus.event', { reaction: 'confused', intensity: 0.6 });
    expect(userTexts()).toEqual(['…']);
    data('argus.stt', { text: words, final: true });
    data('argus.stt_correction', { text: '…' });
    data('argus.event', { reaction: 'confused', intensity: 0.6 });
    expect(userTexts()).toEqual(['…', '…']);
    expect(voiceService.snapshot.transcript.filter((line) => line.role === 'assistant')).toHaveLength(1);
    expect(traceOfWords()).toBe(false);
  });

  test('on the socket transport the silent turn goes back to listening instead of waiting for a reply', async () => {
    realtimeSupported = false;
    await voiceService.start();
    expect(voiceService.snapshot.transport).toBe('sync');
    expect(voiceService.snapshot.phase).toBe('listening');
    frame('voice:stt', { text: words, final: true });
    expect(voiceService.snapshot.phase).toBe('thinking');
    frame('voice:stt_correction', { text: '…' });
    frame('voice:event', { reaction: 'confused', intensity: 0.6 });
    expect(voiceService.snapshot.phase).toBe('listening');
    expect(userTexts()).toEqual(['…']);
    expect(traceOfWords()).toBe(false);
  });
});

