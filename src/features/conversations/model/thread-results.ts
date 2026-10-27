import type { IConversationMessageCacheRow } from '@/core/interfaces';
import type { ArgusResult, ResultRow, ThreadResults } from '@/features/voice';

export type AnchoredResults = {
  byRow: ReadonlyMap<string, readonly ArgusResult[]>;
  trailing: readonly ArgusResult[];
};

type ThreadRow = Pick<IConversationMessageCacheRow, 'id' | 'direction' | 'createdAt' | 'result'>;

export const RESULT_SLACK_MS = 10_000;

export const NO_RESULTS: AnchoredResults = { byRow: new Map(), trailing: [] };

function anchorOf(rows: readonly ThreadRow[], at: number, slackMs: number): string | null {
  let asked = -1;
  rows.forEach((row, index) => {
    if (row.direction === 'out' && row.createdAt <= at + slackMs) asked = index;
  });
  if (asked < 0) return null;
  return rows.slice(asked + 1).find((row) => row.direction === 'in')?.id ?? null;
}

export function resultRowsOf(rows: readonly ThreadRow[]): ResultRow[] {
  return rows
    .filter((row) => row.direction === 'in' && row.result !== null)
    .map((row) => ({ id: row.id, at: row.createdAt, frames: row.result ?? [] }));
}

export function anchorResults(
  rows: readonly ThreadRow[],
  { placed, unplaced }: ThreadResults,
  slackMs: number = RESULT_SLACK_MS
): AnchoredResults {
  if (placed.length === 0 && unplaced.length === 0) return NO_RESULTS;
  const byRow = new Map<string, ArgusResult[]>();
  const add = (anchor: string, result: ArgusResult) =>
    byRow.set(anchor, [...(byRow.get(anchor) ?? []), result]);
  for (const { anchor, result } of placed) add(anchor, result);
  const trailing: ArgusResult[] = [];
  for (const result of unplaced) {
    const anchor = anchorOf(rows, result.at, slackMs);
    if (anchor === null) trailing.push(result);
    else add(anchor, result);
  }
  return { byRow, trailing };
}

export function newestIncomingId(rows: readonly ThreadRow[]): string | null {
  return rows.findLast((row) => row.direction === 'in')?.id ?? null;
}

export function streamingResultId(
  anchored: AnchoredResults,
  newestIn: string | null,
  latestCamera: string | null
): string | null {
  if (latestCamera === null) return null;
  const current = newestIn === null ? [] : (anchored.byRow.get(newestIn) ?? []);
  const live = [...anchored.trailing, ...current].some((result) => result.id === latestCamera);
  return live ? latestCamera : null;
}

export function shownCameraOf(results: readonly ArgusResult[]): string | null {
  const shown = results.findLast((result) => result.kind === 'camera' && result.status === 'done');
  return shown?.kind === 'camera' ? shown.name : null;
}
