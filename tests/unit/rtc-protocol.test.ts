import { describe, expect, test } from 'bun:test';
import { incomingCallCancelSchema, incomingCallSchema } from '@/core/contracts/rtc.contract';
import {
  decodeUtf8,
  encodeUtf8,
  endReasonOf,
  incomingCallLive,
  pinnedRtcUrl,
  readAgentState,
  readRtcData,
  readTokenAnswer,
  rtcPhase,
  rtcTopicOf,
} from '@/features/voice/model/rtc-protocol';

const grant = {
  url: 'wss://argus.local:7046',
  token: 'jwt',
  room: 'u7.rtc-' + 'a'.repeat(32),
  identity: 'user:7:9c1e',
  agentIdentity: 'argus-voice',
  callId: 'rtc-' + 'a'.repeat(32),
  expiresAt: 1791234567,
};

const failure = (status: number, code: string) => ({
  status,
  ok: false,
  info: null,
  errors: { code, message: code },
});

describe('token answer', () => {
  test('a valid grant is granted, an odd one is refused', () => {
    expect(readTokenAnswer({ status: 200, ok: true, info: grant, errors: null })).toEqual({
      kind: 'granted',
      grant,
    });
    const claimed = {
      ...grant,
      callId: 'call-41',
      call: { kind: 'guard_episode', summary: 's', lang: 'es', cameraId: 6 },
    };
    expect(readTokenAnswer({ status: 200, ok: true, info: claimed, errors: null }).kind).toBe(
      'granted'
    );
    expect(
      readTokenAnswer({ status: 200, ok: true, info: { ...grant, url: 'ws://x' }, errors: null })
    ).toMatchObject({
      kind: 'refused',
      code: 'INVALID_RESPONSE',
    });
  });

  test('an old server or an absent LiveKit falls back to the PCM call', () => {
    expect(readTokenAnswer(failure(404, 'NOT_FOUND'))).toEqual({ kind: 'fallback' });
    expect(readTokenAnswer(failure(503, 'RTC_UNAVAILABLE'))).toEqual({ kind: 'fallback' });
    expect(readTokenAnswer(failure(503, 'SERVICE_UNAVAILABLE'))).toEqual({ kind: 'fallback' });
  });

  test('call outcomes are not a fallback', () => {
    expect(readTokenAnswer(failure(404, 'CALL_NOT_FOUND'))).toEqual({
      kind: 'outcome',
      outcome: 'not-found',
    });
    expect(readTokenAnswer(failure(409, 'CALL_TAKEN'))).toEqual({
      kind: 'outcome',
      outcome: 'taken',
    });
    expect(readTokenAnswer(failure(410, 'CALL_EXPIRED'))).toEqual({
      kind: 'outcome',
      outcome: 'expired',
    });
  });

  test('anything else is a refusal with its code', () => {
    expect(readTokenAnswer(failure(401, 'UNAUTHORIZED'))).toMatchObject({
      kind: 'refused',
      code: 'UNAUTHORIZED',
    });
    expect(readTokenAnswer({ status: 0, ok: false, info: null, errors: null })).toMatchObject({
      kind: 'refused',
      code: 'NETWORK_ERROR',
    });
  });
});

describe('data topics', () => {
  test('agent topics map onto the /sync voice frames', () => {
    expect(readRtcData('argus.stt', '{"text":"hola","final":true}')).toEqual({
      type: 'voice:stt',
      payload: { text: 'hola', final: true },
    });
    expect(readRtcData('argus.done', '')).toEqual({ type: 'voice:done', payload: {} });
    expect(readRtcData('argus.unknown', '{}')).toBeNull();
    expect(readRtcData('argus.stt', '{broken')).toBeNull();
  });

  test('app frames go out on their topics, stop is a hang-up', () => {
    expect(rtcTopicOf('voice:context')).toBe('argus.context');
    expect(rtcTopicOf('voice:action_result')).toBe('argus.action_result');
    expect(rtcTopicOf('voice:mute')).toBe('argus.mute');
    expect(rtcTopicOf('voice:skip')).toBe('argus.skip');
    expect(rtcTopicOf('voice:stop')).toBe('argus.hangup');
    expect(rtcTopicOf('voice:start')).toBeNull();
  });
});

describe('visible state', () => {
  test('the agent attribute drives the phase once connected', () => {
    expect(rtcPhase('connecting', 'speaking')).toBe('connecting');
    expect(rtcPhase('connected', null)).toBe('connecting');
    expect(rtcPhase('connected', 'initializing')).toBe('connecting');
    expect(rtcPhase('connected', 'listening')).toBe('listening');
    expect(rtcPhase('connected', 'thinking')).toBe('thinking');
    expect(rtcPhase('connected', 'speaking')).toBe('speaking');
    expect(rtcPhase('reconnecting', 'speaking')).toBe('reconnecting');
  });

  test('unknown agent states are ignored', () => {
    expect(readAgentState('speaking')).toBe('speaking');
    expect(readAgentState('dancing')).toBeNull();
    expect(readAgentState(null)).toBeNull();
  });

  test('disconnect reasons name why the call ended', () => {
    expect(endReasonOf(1)).toBe('local');
    expect(endReasonOf(2)).toBe('replaced');
    expect(endReasonOf(4)).toBe('revoked');
    expect(endReasonOf(5)).toBe('ended');
    expect(endReasonOf(10)).toBe('ended');
    expect(endReasonOf(14)).toBe('lost');
    expect(endReasonOf(undefined)).toBe('lost');
  });
});

describe('transport details', () => {
  test('the call URL is dialled on the pinned host with its port', () => {
    expect(pinnedRtcUrl('wss://192.168.1.4:7046', 'argus.local')).toBe('wss://argus.local:7046');
    expect(pinnedRtcUrl('wss://[fe80::1]:7046/rtc', 'argus.local')).toBe(
      'wss://argus.local:7046/rtc'
    );
    expect(pinnedRtcUrl('wss://argus.local', 'argus.local')).toBe('wss://argus.local');
    expect(pinnedRtcUrl('ws://argus.local:7880', 'argus.local')).toBeNull();
    expect(pinnedRtcUrl('wss://argus.local:7046', '')).toBeNull();
  });

  test('utf-8 survives the data channel both ways', () => {
    const text = 'Señor, ¿abro la cámara? 🙂 — 東京';
    expect(decodeUtf8(encodeUtf8(text))).toBe(text);
    expect(Array.from(encodeUtf8('ñ'))).toEqual([0xc3, 0xb1]);
    expect(decodeUtf8(Uint8Array.from([0x80]))).toBe('�');
  });
});

describe('incoming call frames', () => {
  const ring = {
    callId: 'call-41',
    reason: 'Persona desconocida · Patio',
    summary: 'Hay alguien en el patio.',
    urgency: 'critical',
    kind: 'guard_episode',
    episodeId: 9,
    cameraId: 6,
    cameraName: 'Patio',
    lang: 'es',
    expiresAt: 2_000_000_000,
  };

  test('a ring parses and expires on its own clock', () => {
    const parsed = incomingCallSchema.parse(ring);
    expect(parsed.callId).toBe('call-41');
    expect(incomingCallLive(parsed.expiresAt, 1_999_999_999_000)).toBe(true);
    expect(incomingCallLive(parsed.expiresAt, 2_000_000_000_000)).toBe(false);
  });

  test('a malformed ring is refused', () => {
    expect(incomingCallSchema.safeParse({ ...ring, callId: '../x' }).success).toBe(false);
    expect(incomingCallSchema.safeParse({ ...ring, urgency: 'passive' }).success).toBe(false);
  });

  test('a cancel names its call and reason', () => {
    expect(
      incomingCallCancelSchema.parse({ callId: 'call-41', reason: 'answered_elsewhere' }).reason
    ).toBe('answered_elsewhere');
    expect(incomingCallCancelSchema.safeParse({ callId: 'call-41', reason: 'bored' }).success).toBe(
      false
    );
  });
});
