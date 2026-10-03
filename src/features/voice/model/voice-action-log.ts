import type { VoiceAction, VoiceActionOutcome, VoiceActionRecord } from '@/core/types';

export type RecordActionInput = {
  records: readonly VoiceActionRecord[];
  action: VoiceAction;
  kept: number;
};

export type SettleActionInput = {
  records: readonly VoiceActionRecord[];
  id: string;
  outcome: VoiceActionOutcome;
};

export function hasAction(records: readonly VoiceActionRecord[], id: string): boolean {
  return records.some((record) => record.id === id);
}

export function recordAction({ records, action, kept }: RecordActionInput): readonly VoiceActionRecord[] {
  if (hasAction(records, action.id)) return records;
  const next = [...records, { ...action, status: 'pending' as const, detail: null }];
  return next.length > kept ? next.slice(next.length - kept) : next;
}

export function settleAction({ records, id, outcome }: SettleActionInput): readonly VoiceActionRecord[] {
  const index = records.findIndex((record) => record.id === id);
  const current = records[index];
  if (!current || current.status !== 'pending') return records;
  const next = records.slice();
  next[index] = { ...current, status: outcome.ok ? 'done' : 'failed', detail: outcome.detail };
  return next;
}

export type CallBoundary = {
  readonly pendingStops: number;
  readonly stoppedAt: number;
};

export const INITIAL_CALL_BOUNDARY: CallBoundary = { pendingStops: 0, stoppedAt: 0 };

export function boundaryAfterStop(boundary: CallBoundary, now: number): CallBoundary {
  return { pendingStops: boundary.pendingStops + 1, stoppedAt: now };
}

export function boundaryExpired(boundary: CallBoundary, now: number, graceMs: number): CallBoundary {
  return boundary.pendingStops > 0 && now - boundary.stoppedAt >= graceMs ? INITIAL_CALL_BOUNDARY : boundary;
}

export function boundaryAfterDone(boundary: CallBoundary): { boundary: CallBoundary; previousCall: boolean } {
  if (boundary.pendingStops === 0) return { boundary, previousCall: false };
  return { boundary: { ...boundary, pendingStops: boundary.pendingStops - 1 }, previousCall: true };
}
