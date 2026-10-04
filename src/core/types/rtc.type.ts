export type RtcCallState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export type RtcEndReason = 'local' | 'revoked' | 'replaced' | 'ended' | 'lost';

export type RtcAgentState = 'initializing' | 'listening' | 'thinking' | 'speaking';

export type RtcEvent =
  | { kind: 'state'; state: RtcCallState; reason: RtcEndReason | null }
  | { kind: 'agent'; identity: string; state: string | null }
  | { kind: 'data'; topic: string; payload: string }
  | { kind: 'level'; local: number; remote: number }
  | { kind: 'agentAudio'; active: boolean };

export type RtcJoin = {
  url: string;
  token: string;
  agentIdentity: string;
};

export type RtcCallKind = 'guard_episode' | 'agenda' | 'assistant';

export type RtcCallUrgency = 'active' | 'time_sensitive' | 'critical';

export type RtcClaimedCall = {
  kind: RtcCallKind;
  summary: string;
  lang: string;
  cameraId?: number | null;
  cameraName?: string | null;
  episodeId?: number | null;
};

export type RtcTokenGrant = {
  url: string;
  token: string;
  room: string;
  identity: string;
  agentIdentity: string;
  callId: string;
  expiresAt: number;
  call?: RtcClaimedCall | null;
};

export type RtcTokenRequest = {
  callId?: string;
  resume?: boolean;
};

export type RtcCallOutcome = 'not-found' | 'taken' | 'expired';

export type RtcTokenAnswer =
  | { kind: 'granted'; grant: RtcTokenGrant }
  | { kind: 'fallback' }
  | { kind: 'outcome'; outcome: RtcCallOutcome }
  | { kind: 'refused'; code: string; message: string };

export type IncomingCall = {
  callId: string;
  reason: string;
  summary: string;
  urgency: RtcCallUrgency;
  kind: RtcCallKind;
  episodeId?: number | null;
  cameraId?: number | null;
  cameraName?: string | null;
  environmentName?: string | null;
  lang: string;
  expiresAt: number;
};

export type IncomingCallCancelReason = 'answered_elsewhere' | 'expired' | 'resolved' | 'declined';

export type IncomingCallCancel = {
  callId: string;
  reason: IncomingCallCancelReason;
};
