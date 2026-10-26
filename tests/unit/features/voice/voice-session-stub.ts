import { mock } from 'bun:test';
import type { IncomingCall, VoiceSnapshot } from '@/core/types';

export const BASE_SNAPSHOT: VoiceSnapshot = {
  phase: 'idle',
  isActive: false,
  muted: false,
  sttText: '',
  assistantText: '',
  transcript: [],
  actions: [],
  liveCameraId: null,
  liveCameraView: 'live',
  error: null,
  transport: 'none',
  callReason: null,
  responseId: null,
  waitingCall: null,
  closedCallId: null,
  closedReason: null,
  connectedAt: null,
  callUrgency: null,
};

export const RINGING: IncomingCall = {
  callId: 'call-41',
  reason: 'Recordatorio',
  subject: 'Pagar la luz',
  summary: '',
  urgency: 'active',
  kind: 'agenda',
  lang: 'es',
  expiresAt: 4_000_000_000,
  discreet: false,
  offers: [],
};

const listeners = new Set<() => void>();

export const voiceStub = {
  snapshot: BASE_SNAPSHOT,
  answerWaiting: mock(() => undefined),
  declineCall: mock(async (_callId: string) => undefined),
  stop: mock(() => undefined),
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function setSnapshot(patch: Partial<VoiceSnapshot>): void {
  voiceStub.snapshot = { ...BASE_SNAPSHOT, ...patch };
  for (const listener of listeners) listener();
}

export function resetVoiceStub(): void {
  voiceStub.snapshot = BASE_SNAPSHOT;
  voiceStub.answerWaiting.mockClear();
  voiceStub.declineCall.mockClear();
  voiceStub.stop.mockClear();
}
