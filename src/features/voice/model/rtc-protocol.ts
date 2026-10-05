import type { IServiceResponse } from '@/core/interfaces';
import type {
  RtcAgentState,
  RtcCallOutcome,
  RtcCallState,
  RtcEndReason,
  RtcTokenAnswer,
  SessionRevokeCause,
  VoicePhase,
} from '@/core/types';
import { rtcTokenGrantSchema } from '@/core/contracts/rtc.contract';
import {
  VOICE_ACTION_RESULT_TYPE,
  VOICE_ACTION_TYPE,
  VOICE_ASSISTANT_TYPE,
  VOICE_CONTEXT_TYPE,
  VOICE_DONE_TYPE,
  VOICE_EVENT_TYPE,
  VOICE_INTERRUPTED_TYPE,
  VOICE_MUTE_TYPE,
  VOICE_SKIP_TYPE,
  VOICE_STOP_TYPE,
  VOICE_STT_TYPE,
  VOICE_TURN_TYPE,
} from '@/features/voice/constants/voice';

export const RTC_INBOUND_TOPICS: Readonly<Record<string, string>> = {
  'argus.stt': VOICE_STT_TYPE,
  'argus.assistant': VOICE_ASSISTANT_TYPE,
  'argus.turn': VOICE_TURN_TYPE,
  'argus.interrupted': VOICE_INTERRUPTED_TYPE,
  'argus.action': VOICE_ACTION_TYPE,
  'argus.event': VOICE_EVENT_TYPE,
  'argus.done': VOICE_DONE_TYPE,
};

export const RTC_OUTBOUND_TOPICS: Readonly<Record<string, string>> = {
  [VOICE_CONTEXT_TYPE]: 'argus.context',
  [VOICE_ACTION_RESULT_TYPE]: 'argus.action_result',
  [VOICE_MUTE_TYPE]: 'argus.mute',
  [VOICE_SKIP_TYPE]: 'argus.skip',
  [VOICE_STOP_TYPE]: 'argus.hangup',
};

const AGENT_STATES: readonly RtcAgentState[] = [
  'initializing',
  'listening',
  'thinking',
  'speaking',
];

const OUTCOMES: Readonly<Record<string, RtcCallOutcome>> = {
  CALL_NOT_FOUND: 'not-found',
  CALL_TAKEN: 'taken',
  CALL_EXPIRED: 'expired',
};

export type RtcInboundFrame = { type: string; payload: unknown };

export function readRtcData(topic: string, payload: string): RtcInboundFrame | null {
  const type = RTC_INBOUND_TOPICS[topic];
  if (!type) return null;
  if (!payload) return { type, payload: {} };
  try {
    return { type, payload: JSON.parse(payload) as unknown };
  } catch {
    return null;
  }
}

export function rtcTopicOf(type: string): string | null {
  return RTC_OUTBOUND_TOPICS[type] ?? null;
}

export function readAgentState(state: string | null): RtcAgentState | null {
  return AGENT_STATES.find((known) => known === state) ?? null;
}

export function rtcPhase(callState: RtcCallState, agentState: RtcAgentState | null): VoicePhase {
  if (callState === 'reconnecting') return 'reconnecting';
  if (callState !== 'connected') return 'connecting';
  if (agentState === null || agentState === 'initializing') return 'connecting';
  return agentState;
}

export function readTokenAnswer(result: IServiceResponse<unknown>): RtcTokenAnswer {
  if (result.ok) {
    const grant = rtcTokenGrantSchema.safeParse(result.info);
    return grant.success
      ? { kind: 'granted', grant: grant.data }
      : {
          kind: 'refused',
          code: 'INVALID_RESPONSE',
          message: 'The call grant has an unexpected shape',
        };
  }
  const code = result.errors?.code ?? '';
  const outcome = OUTCOMES[code];
  if (outcome) return { kind: 'outcome', outcome };
  if (result.status === 404 && code === 'NOT_FOUND') return { kind: 'fallback' };
  if (result.status === 503 && (code === 'RTC_UNAVAILABLE' || code === 'SERVICE_UNAVAILABLE'))
    return { kind: 'fallback' };
  return { kind: 'refused', code: code || 'NETWORK_ERROR', message: result.errors?.message ?? '' };
}

export function pinnedRtcUrl(url: string, host: string): string | null {
  const match = /^wss:\/\/(\[[^\]]+\]|[^/:?#]+)(:\d+)?(.*)$/i.exec(url);
  if (!match || !host) return null;
  return `wss://${host}${match[2] ?? ''}${match[3] ?? ''}`;
}

export function incomingCallLive(expiresAt: number, nowMs: number): boolean {
  return expiresAt * 1000 > nowMs;
}

const END_REASONS: Readonly<Record<number, RtcEndReason>> = {
  1: 'local',
  2: 'replaced',
  4: 'revoked',
  5: 'ended',
  10: 'ended',
};

export function endReasonOf(code: number | undefined): RtcEndReason {
  return code === undefined ? 'lost' : (END_REASONS[code] ?? 'lost');
}

export function encodeUtf8(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of text) {
    const point = char.codePointAt(0) ?? 0;
    if (point < 0x80) bytes.push(point);
    else if (point < 0x800) bytes.push(0xc0 | (point >> 6), 0x80 | (point & 0x3f));
    else if (point < 0x10000)
      bytes.push(0xe0 | (point >> 12), 0x80 | ((point >> 6) & 0x3f), 0x80 | (point & 0x3f));
    else
      bytes.push(
        0xf0 | (point >> 18),
        0x80 | ((point >> 12) & 0x3f),
        0x80 | ((point >> 6) & 0x3f),
        0x80 | (point & 0x3f)
      );
  }
  return Uint8Array.from(bytes);
}

export function decodeUtf8(bytes: Uint8Array): string {
  let text = '';
  let index = 0;
  const continuation = (offset: number): number => (bytes[index + offset] ?? 0) & 0x3f;
  while (index < bytes.length) {
    const lead = bytes[index] ?? 0;
    if (lead < 0x80) {
      text += String.fromCodePoint(lead);
      index += 1;
    } else if (lead >= 0xf0) {
      text += String.fromCodePoint(
        ((lead & 0x07) << 18) | (continuation(1) << 12) | (continuation(2) << 6) | continuation(3)
      );
      index += 4;
    } else if (lead >= 0xe0) {
      text += String.fromCodePoint(
        ((lead & 0x0f) << 12) | (continuation(1) << 6) | continuation(2)
      );
      index += 3;
    } else if (lead >= 0xc0) {
      text += String.fromCodePoint(((lead & 0x1f) << 6) | continuation(1));
      index += 2;
    } else {
      text += '�';
      index += 1;
    }
  }
  return text;
}

const REVOKE_CAUSES: readonly SessionRevokeCause[] = [
  'logout',
  'revoked',
  'revokedByOwner',
  'refreshTokenReuse',
  'accountDisabled',
];

export type RtcRevocation = { cause: SessionRevokeCause | null };

export function readRevocation(type: string, payload: unknown): RtcRevocation | null {
  if (type !== VOICE_DONE_TYPE || typeof payload !== 'object' || payload === null) return null;
  const record = payload as Record<string, unknown>;
  if (record.reason !== 'revoked') return null;
  const cause = REVOKE_CAUSES.find((known) => known === record.cause) ?? null;
  return { cause };
}
