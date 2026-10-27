import { describe, expect, test } from 'bun:test';
import type { ArgusResult } from '@/features/voice';
import {
  anchorResults,
  bubblePresenceOf,
  newestIncomingId,
} from '@/features/conversations/model/thread-results';

const row = (id: string, direction: 'in' | 'out', createdAt: number) => ({
  id,
  direction,
  createdAt,
});

const camera = (id: string, at: number, status: ArgusResult['status'] = 'done'): ArgusResult => ({
  id,
  at,
  status,
  kind: 'camera',
  cameraId: 'cam-1',
  name: 'Cocina',
});

const ROWS = [
  row('1', 'out', 100_000),
  row('2', 'in', 101_000),
  row('3', 'out', 200_000),
  row('4', 'in', 203_000),
];

describe('where a result card sits in the thread', () => {
  test('under the reply to the request it answered', () => {
    const anchored = anchorResults(ROWS, [camera('a', 201_000), camera('b', 100_500)]);
    expect(anchored.byRow.get('4')?.map((result) => result.id)).toEqual(['a']);
    expect(anchored.byRow.get('2')?.map((result) => result.id)).toEqual(['b']);
    expect(anchored.trailing).toEqual([]);
  });

  test('at the end while the reply has not arrived, or before any request', () => {
    const anchored = anchorResults(
      [row('1', 'out', 100_000)],
      [camera('a', 100_200), camera('b', 1)]
    );
    expect(anchored.trailing.map((result) => result.id)).toEqual(['a', 'b']);
  });

  test('a server clock a few seconds ahead still anchors the result', () => {
    const anchored = anchorResults(
      [row('1', 'out', 105_000), row('2', 'in', 106_000)],
      [camera('a', 100_000)]
    );
    expect(anchored.byRow.get('2')?.map((result) => result.id)).toEqual(['a']);
  });
});

describe('the Estela beside a reply', () => {
  test('thinks while a tool runs, looks at a camera, is happy when something was made', () => {
    expect(bubblePresenceOf(undefined)).toBe('idle');
    expect(bubblePresenceOf([camera('a', 1, 'pending')])).toBe('think');
    expect(bubblePresenceOf([camera('a', 1)])).toBe('look');
    expect(bubblePresenceOf([camera('a', 1, 'failed')])).toBe('error');
    expect(
      bubblePresenceOf([
        {
          id: 'm',
          at: 1,
          status: 'done',
          kind: 'guard-mode',
          mode: 'night',
          previousMode: 'home',
          environmentId: null,
          environmentName: null,
        },
      ])
    ).toBe('happy');
  });

  test('only the newest reply carries a live Estela', () => {
    expect(newestIncomingId(ROWS)).toBe('4');
    expect(newestIncomingId([row('1', 'out', 1)])).toBeNull();
  });
});
