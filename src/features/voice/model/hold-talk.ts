import type { VoiceActionRecord, VoicePhase, VoiceSnapshot, VoiceStartOptions } from '@/core/types';

export type HoldTalkStage = 'idle' | 'listening' | 'sending' | 'answered' | 'failed' | 'cancelled';

export type HoldTalkAnswer = {
  said: string;
  reply: string;
  action: VoiceActionRecord | null;
};

export type HoldTalkState = {
  stage: HoldTalkStage;
  releasedAt: number | null;
  settledAt: number | null;
  error: string | null;
  answer: HoldTalkAnswer | null;
};

export type HoldTalkVoice = HoldTalkAnswer & {
  phase: VoicePhase;
  error: string | null;
};

export type HoldTalkEvent =
  | { type: 'start' }
  | { type: 'release'; send: boolean; at: number }
  | { type: 'observe'; voice: HoldTalkVoice; at: number }
  | { type: 'dismiss' };

export type HoldTalkAbility = {
  allowed: boolean;
  supported: boolean;
  callActive: boolean;
  live: boolean;
};

export type HoldTalkFailure =
  'not-heard' | 'no-reply' | 'permission' | 'connection' | 'session' | 'account' | 'generic';

export const HOLD_NOT_HEARD = 'HOLD_NOT_HEARD|';

export const HOLD_NO_REPLY = 'HOLD_NO_REPLY|';

export const HOLD_HEAR_WAIT_MS = 4000;

export const HOLD_REPLY_WAIT_MS = 30000;

export const HOLD_SETTLE_MS = 800;

export const HOLD_TICK_MS = 250;

export const HOLD_FAILURE_SHOWN_MS = 8000;

export const HOLD_IDLE: HoldTalkState = {
  stage: 'idle',
  releasedAt: null,
  settledAt: null,
  error: null,
  answer: null,
};

const ENDED: ReadonlySet<VoicePhase> = new Set(['idle', 'done']);

const FAILURES: Readonly<Record<string, HoldTalkFailure>> = {
  HOLD_NOT_HEARD: 'not-heard',
  HOLD_NO_REPLY: 'no-reply',
  MIC_PERMISSION_DENIED: 'permission',
  SOCKET_UNAVAILABLE: 'connection',
  SOCKET_LOST: 'connection',
  SESSION_REVOKED: 'session',
  ACCOUNT_DISABLED: 'account',
};

export function holdTalkVoiceOf(snapshot: VoiceSnapshot): HoldTalkVoice {
  const { transcript } = snapshot;
  const last = transcript.at(-1);
  const said = transcript.findLast((line) => line.role === 'user')?.text ?? '';
  return {
    phase: snapshot.phase,
    said,
    reply: said !== '' && last?.role === 'assistant' ? last.text : '',
    action: snapshot.actions.at(-1) ?? null,
    error: snapshot.error,
  };
}

export function holdTalkFailureOf(error: string | null): HoldTalkFailure {
  const code = error?.split('|')[0] ?? '';
  return FAILURES[code] ?? 'generic';
}

function failed(error: string): HoldTalkState {
  return { ...HOLD_IDLE, stage: 'failed', error };
}

function answered(voice: HoldTalkVoice): HoldTalkState {
  return {
    ...HOLD_IDLE,
    stage: 'answered',
    answer: { said: voice.said, reply: voice.reply, action: voice.action },
  };
}

function unanswered(voice: HoldTalkVoice): HoldTalkState {
  return failed(voice.said === '' ? HOLD_NOT_HEARD : HOLD_NO_REPLY);
}

function release(state: HoldTalkState, send: boolean, at: number): HoldTalkState {
  if (state.stage !== 'listening') return state;
  if (!send) return { ...HOLD_IDLE, stage: 'cancelled' };
  return { ...state, stage: 'sending', releasedAt: at };
}

function settle(state: HoldTalkState, voice: HoldTalkVoice, at: number): HoldTalkState {
  if (voice.phase !== 'listening') return { ...state, settledAt: null };
  const since = state.settledAt ?? at;
  if (at - since >= HOLD_SETTLE_MS) return answered(voice);
  return { ...state, settledAt: since };
}

function observeSending(state: HoldTalkState, voice: HoldTalkVoice, at: number): HoldTalkState {
  const waited = at - (state.releasedAt ?? at);
  if (voice.reply !== '') {
    if (ENDED.has(voice.phase) || waited >= HOLD_REPLY_WAIT_MS) return answered(voice);
    return settle(state, voice, at);
  }
  if (ENDED.has(voice.phase)) return unanswered(voice);
  if (voice.said === '' && waited >= HOLD_HEAR_WAIT_MS) return failed(HOLD_NOT_HEARD);
  if (waited >= HOLD_REPLY_WAIT_MS) return failed(HOLD_NO_REPLY);
  return state;
}

function observe(state: HoldTalkState, voice: HoldTalkVoice, at: number): HoldTalkState {
  if (state.stage !== 'listening' && state.stage !== 'sending') return state;
  if (voice.phase === 'error') return failed(voice.error ?? '');
  if (state.stage === 'listening') return voice.phase === 'done' ? unanswered(voice) : state;
  return observeSending(state, voice, at);
}

export function holdTalkStep(state: HoldTalkState, event: HoldTalkEvent): HoldTalkState {
  if (event.type === 'start') return { ...HOLD_IDLE, stage: 'listening' };
  if (event.type === 'release') return release(state, event.send, event.at);
  if (event.type === 'observe') return observe(state, event.voice, event.at);
  return HOLD_IDLE;
}

export function holdTalkLive(state: HoldTalkState): boolean {
  return state.stage === 'listening' || state.stage === 'sending';
}

export function holdTalkSessionEnds(previous: HoldTalkState, next: HoldTalkState): boolean {
  return holdTalkLive(previous) && !holdTalkLive(next);
}

export function holdTalkMutes(stage: HoldTalkStage, voice: HoldTalkVoice): boolean {
  return stage === 'sending' && voice.said !== '' && voice.phase !== 'listening';
}

export function holdTalkCanListen({
  allowed,
  supported,
  callActive,
  live,
}: HoldTalkAbility): boolean {
  return allowed && supported && (live || !callActive);
}

export function holdTalkStartOptions(socketMicrophone: boolean): VoiceStartOptions {
  return socketMicrophone ? { socket: true } : {};
}
