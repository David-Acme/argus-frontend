import type { ArgusResult } from '@/features/voice/model/argus-result';
import {
  readResultFrame,
  resultIdOfFrame,
  resultOfFrame,
} from '@/features/voice/model/argus-result';

const stageOf = (result: ArgusResult): number => {
  if (result.status !== 'pending') return 2;
  return result.kind === 'reminder' && result.asking ? 0 : 1;
};

export function mergeResult(previous: ArgusResult | undefined, next: ArgusResult): ArgusResult {
  if (!previous) return next;
  const kept = stageOf(next) >= stageOf(previous) ? next : previous;
  return kept.at === previous.at ? kept : { ...kept, at: previous.at };
}

const failedOf = (result: ArgusResult): ArgusResult =>
  result.kind === 'reminder'
    ? { ...result, status: 'failed', asking: false }
    : { ...result, status: 'failed' };

export function applyResultFrame(
  current: ArgusResult | undefined,
  payload: unknown,
  at: number
): ArgusResult | null {
  const frame = readResultFrame(payload);
  if (!frame) return null;
  if (!frame.ok) return current ? mergeResult(current, failedOf(current)) : null;
  const result = resultOfFrame(frame, at);
  return result ? mergeResult(current, result) : null;
}

export type ResultRow = { id: string; at: number; frames: readonly unknown[] };

export type PlacedResult = { anchor: string; result: ArgusResult };

export function resultsOfRows(rows: readonly ResultRow[]): ReadonlyMap<string, PlacedResult> {
  const placed = new Map<string, PlacedResult>();
  for (const row of rows) {
    for (const frame of row.frames) {
      const id = resultIdOfFrame(frame);
      if (id === null) continue;
      const current = placed.get(id);
      const result = applyResultFrame(current?.result, frame, row.at);
      if (result) placed.set(id, { anchor: current?.anchor ?? row.id, result });
    }
  }
  return placed;
}

export type ThreadResults = { placed: readonly PlacedResult[]; unplaced: readonly ArgusResult[] };

export function threadResultsOf(
  rows: readonly ResultRow[],
  live: readonly ArgusResult[]
): ThreadResults {
  const placed = new Map(resultsOfRows(rows));
  const unplaced: ArgusResult[] = [];
  for (const result of live) {
    const kept = placed.get(result.id);
    if (kept)
      placed.set(result.id, { anchor: kept.anchor, result: mergeResult(kept.result, result) });
    else unplaced.push(result);
  }
  return { placed: [...placed.values()], unplaced };
}
