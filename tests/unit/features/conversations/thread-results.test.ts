import { describe, expect, test } from 'bun:test';
import type { ConversationResultFrame } from '@/core/types';
import type { ArgusResult } from '@/features/voice';
import { threadResultsOf } from '@/features/voice/model/result-merge';
import {
  anchorResults,
  newestIncomingId,
  resultRowsOf,
  shownCameraOf,
  streamingResultId,
} from '@/features/conversations/model/thread-results';

const row = (
  id: string,
  direction: 'in' | 'out',
  createdAt: number,
  result: ConversationResultFrame[] | null = null
) => ({
  id,
  direction,
  createdAt,
  result,
});

const camera = (id: string, at: number, status: ArgusResult['status'] = 'done'): ArgusResult => ({
  id,
  at,
  status,
  kind: 'camera',
  cameraId: 'cam-1',
  name: 'Cocina',
});

const onlyLive = (results: ArgusResult[]) => ({ placed: [], unplaced: results });

const ROWS = [
  row('1', 'out', 100_000),
  row('2', 'in', 101_000),
  row('3', 'out', 200_000),
  row('4', 'in', 203_000),
];

describe('the cards kept with the conversation', () => {
  const offer: ConversationResultFrame = {
    id: 'ab12',
    tool: 'memory.remind',
    ok: true,
    data: { title: 'Regar', remindAt: 1_800, confirm: true },
  };
  const rows = [
    row('1', 'out', 100_000),
    row('2', 'in', 101_000, [offer]),
    row('3', 'out', 200_000),
    row('4', 'in', 201_000, [{ ...offer, ok: false, data: {} }]),
  ];

  test('sit on the line that first carried them, settled by the later lines', () => {
    const anchored = anchorResults(rows, threadResultsOf(resultRowsOf(rows), []));
    expect(anchored.byRow.get('2')).toMatchObject([
      { id: 'result:ab12', asking: false, status: 'failed' },
    ]);
    expect(anchored.byRow.has('4')).toBe(false);
  });

  test('the live copy of the same card joins it there, and never reopens it', () => {
    const live: ArgusResult = {
      id: 'result:ab12',
      at: 201_500,
      status: 'pending',
      kind: 'reminder',
      offerId: 'ab12',
      asking: true,
      answer: null,
      title: 'Regar',
      remindAt: 1_800_000,
    };
    const anchored = anchorResults(
      rows,
      threadResultsOf(resultRowsOf(rows), [live, camera('c', 200_500)])
    );
    expect(anchored.byRow.get('2')).toMatchObject([
      { id: 'result:ab12', at: 101_000, status: 'failed' },
    ]);
    expect(anchored.byRow.get('4')?.map((result) => result.id)).toEqual(['c']);
    expect(anchored.trailing).toEqual([]);
  });

  test('a line someone else said carries no card', () => {
    expect(resultRowsOf([row('1', 'out', 1_000, [offer]), row('2', 'in', 2_000)])).toEqual([]);
  });
});

describe('where a result card sits in the thread', () => {
  test('under the reply to the request it answered', () => {
    const anchored = anchorResults(ROWS, onlyLive([camera('a', 201_000), camera('b', 100_500)]));
    expect(anchored.byRow.get('4')?.map((result) => result.id)).toEqual(['a']);
    expect(anchored.byRow.get('2')?.map((result) => result.id)).toEqual(['b']);
    expect(anchored.trailing).toEqual([]);
  });

  test('at the end while the reply has not arrived, or before any request', () => {
    const anchored = anchorResults(
      [row('1', 'out', 100_000)],
      onlyLive([camera('a', 100_200), camera('b', 1)])
    );
    expect(anchored.trailing.map((result) => result.id)).toEqual(['a', 'b']);
  });

  test('a server clock a few seconds ahead still anchors the result', () => {
    const anchored = anchorResults(
      [row('1', 'out', 105_000), row('2', 'in', 106_000)],
      onlyLive([camera('a', 100_000)])
    );
    expect(anchored.byRow.get('2')?.map((result) => result.id)).toEqual(['a']);
  });
});

describe('the newest reply', () => {
  test('is the last incoming line', () => {
    expect(newestIncomingId(ROWS)).toBe('4');
    expect(newestIncomingId([row('1', 'out', 1)])).toBeNull();
  });
});

describe('which camera card streams', () => {
  test('the newest camera streams while its turn is the newest, and stops once the talk moves on', () => {
    const shown = anchorResults(ROWS, onlyLive([camera('a', 201_000)]));
    expect(streamingResultId(shown, '4', 'a')).toBe('a');
    const moved = anchorResults(
      [...ROWS, row('5', 'out', 300_000), row('6', 'in', 301_000)],
      onlyLive([camera('a', 201_000)])
    );
    expect(streamingResultId(moved, '6', 'a')).toBeNull();
  });

  test('a camera whose reply has not arrived yet streams, and no camera means none', () => {
    const waiting = anchorResults(ROWS.slice(0, 3), onlyLive([camera('a', 201_000)]));
    expect(streamingResultId(waiting, '2', 'a')).toBe('a');
    expect(streamingResultId(waiting, '2', null)).toBeNull();
  });
});

describe('what the suggestions read from the thread', () => {
  test('the camera Argus showed last', () => {
    expect(shownCameraOf([camera('a', 1), camera('b', 2, 'failed')])).toBe('Cocina');
    expect(shownCameraOf([])).toBeNull();
  });
});
