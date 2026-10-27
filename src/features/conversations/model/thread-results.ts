import type { IConversationMessageCacheRow } from '@/core/interfaces';
import type { PresenceState } from '@/shared/ui/presence';
import type { ArgusResult } from '@/features/voice';

export type AnchoredResults = {
  byRow: ReadonlyMap<string, readonly ArgusResult[]>;
  trailing: readonly ArgusResult[];
};

type ThreadRow = Pick<IConversationMessageCacheRow, 'id' | 'direction' | 'createdAt'>;

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

export function anchorResults(
  rows: readonly ThreadRow[],
  results: readonly ArgusResult[],
  slackMs: number = RESULT_SLACK_MS
): AnchoredResults {
  if (results.length === 0) return NO_RESULTS;
  const byRow = new Map<string, ArgusResult[]>();
  const trailing: ArgusResult[] = [];
  for (const result of results) {
    const anchor = anchorOf(rows, result.at, slackMs);
    if (anchor === null) {
      trailing.push(result);
      continue;
    }
    byRow.set(anchor, [...(byRow.get(anchor) ?? []), result]);
  }
  return { byRow, trailing };
}

export function bubblePresenceOf(results: readonly ArgusResult[] | undefined): PresenceState {
  const last = results?.at(-1);
  if (!last) return 'idle';
  if (last.status === 'pending') return last.kind === 'reminder' ? 'idle' : 'think';
  if (last.status === 'failed') return 'error';
  if (last.kind === 'camera') return 'look';
  return last.kind === 'agenda-day' || last.kind === 'screen' ? 'idle' : 'happy';
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
