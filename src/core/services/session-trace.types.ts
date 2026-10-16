export type SessionTracePhase = 'restore' | 'refresh';

export type SessionTraceOutcome = 'ok' | 'error' | 'partial' | 'absent' | 'refresh-rejected' | 'unavailable';
