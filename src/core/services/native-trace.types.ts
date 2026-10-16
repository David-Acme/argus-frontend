export type TracePhase = 'restore' | 'refresh' | 'route' | 'voice';

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
  | 'fallback';
