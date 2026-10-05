import { describe, expect, test } from 'bun:test';
import { readBatches } from '@/core/services/notification-read-batches';

describe('readBatches', () => {
  test('a read-all above the server limit is split into batches of at most 500 ids', () => {
    const ids = Array.from({ length: 1201 }, (_, index) => String(index + 1));
    const batches = readBatches(ids);
    expect(batches.map((batch) => batch.length)).toEqual([500, 500, 201]);
    expect(batches.flat()).toEqual(ids.map(Number));
  });

  test('duplicates and ids the server cannot know are dropped', () => {
    expect(readBatches(['3', '3', 'local-1', '', '0', '-2', '4.5', '7'])).toEqual([[3, 7]]);
  });

  test('nothing to read sends nothing', () => {
    expect(readBatches([])).toEqual([]);
  });

  test('the batch size is a parameter', () => {
    expect(readBatches(['1', '2', '3'], 2)).toEqual([[1, 2], [3]]);
  });
});
