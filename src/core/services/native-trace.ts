import type { TraceOutcome, TracePhase } from './native-trace.types';

export type TraceSink = (phase: TracePhase, outcome: TraceOutcome, reason: string) => void;

let sink: TraceSink | null = null;

export function installTraceSink(next: TraceSink): void {
  sink = next;
}

export function traceEvent(phase: TracePhase, outcome: TraceOutcome, reason: string): void {
  try {
    sink?.(phase, outcome, reason);
  } catch {
  }
}
