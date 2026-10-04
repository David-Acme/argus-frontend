import { beforeEach, describe, expect, mock, test } from 'bun:test';
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
let tokenAnswers: IServiceResponse<unknown>[] = [];
let deferredAnswer: Promise<IServiceResponse<unknown>> | null = null;
let realtimeSupported = true;

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
  async send(topic: string, payload: string): Promise<void> {
    this.sent.push({ topic, payload });
  }
  async leave(): Promise<void> {
    this.left += 1;
  }
}

let call = new FakeCall();

mock.module('react-native-reanimated', () => ({
  makeMutable: <T>(value: T) => ({ value }),
  withTiming: <T>(value: T) => value,
}));
mock.module('expo-audio', () => ({
  requestRecordingPermissionsAsync: async () => ({ granted: true }),
}));
mock.module('@/features/voice/services/rtc/rtc-token', () => ({
  requestCallToken: async (body: unknown) => {
    posted.push({ url: '/rtc/token', body });
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
    onType: () => () => undefined,
    onBinary: () => () => undefined,
    on: (operation: number, listener: (message: ISocketEmitDto) => void) => {
      operationListeners.set(operation, listener);
      return () => undefined;
    },
  },
}));
mock.module('@/features/voice/services/rtc', () => ({
  rtcCallSupported: () => realtimeSupported,
  createRealtimeCall: () => call,
}));
const micModule = join(
  import.meta.dir,
  '../../src/features/voice/services/voice/voice-platform.ts'
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
      { url: 'wss://argus.local:7046', token: 'jwt', agentIdentity: 'argus-voice' },
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
    expect(call.sent.map((frame) => frame.topic)).toEqual(['argus.hangup']);
    expect(call.left).toBe(1);
    expect(voiceService.snapshot.phase).toBe('idle');
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
    expect(sentFrames[0]).toEqual({ type: 'voice:start', payload: { mode: 'duplex' } });
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

  test('in the foreground the ring answers at once with the reason', async () => {
    tokenAnswers = [grant('call-41')];
    const rang: string[] = [];
    const unsubscribe = voiceService.onIncoming((incoming) => rang.push(incoming.callId));
    operationListeners.get(8)?.(ring() as unknown as ISocketEmitDto);
    await settle();
    await settle();
    expect(rang).toEqual(['call-41']);
    expect(posted[0]).toEqual({ url: '/rtc/token', body: { callId: 'call-41' } });
    expect(voiceService.snapshot.callReason).toBe('Persona desconocida · Patio');
    expect(voiceService.snapshot.transport).toBe('rtc');
    unsubscribe();
  });

  test('the cancel that follows our own claim does not end the call', async () => {
    let answer: (value: IServiceResponse<unknown>) => void = () => undefined;
    deferredAnswer = new Promise<IServiceResponse<unknown>>((resolve) => {
      answer = resolve;
    });
    operationListeners.get(8)?.(ring() as unknown as ISocketEmitDto);
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
  });
});
