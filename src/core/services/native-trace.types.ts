export type TracePhase = 'restore' | 'refresh' | 'route' | 'voice' | 'lock';

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
  | 'fallback';
