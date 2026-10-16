export type TracePhase = 'restore' | 'refresh' | 'route' | 'voice' | 'lock' | 'session' | 'decline';

export type TraceOutcome =
  | 'ok'
  | 'error'
  | 'partial'
  | 'absent'
  | 'refresh-rejected'
  | 'unavailable'
  | 'stay'
  | 'redirect'
  | 'start'
  | 'joined'
  | 'sent'
  | 'stop'
  | 'cleared'
  | 'fallback'
  | 'ended'
  | 'left'
  | 'failed'
  | 'queued';
