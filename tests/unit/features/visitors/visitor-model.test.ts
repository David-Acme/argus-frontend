import { describe, expect, test } from 'bun:test';
import type { VisitorSummary } from '@/core/types';
import {
  compareVisitors,
  filterVisitors,
  mergedInto,
  patchVisitor,
  VISITOR_ALL_SCOPE,
  visitorFeedScope,
  visitorQueryOf,
  withoutVisitors,
} from '@/features/visitors/model/visitor';

const visitor = (id: number, patch: Partial<VisitorSummary> = {}): VisitorSummary => ({
  id,
  name: '',
  category: '',
  note: '',
  visitorNumber: id,
  visitCount: 1,
  firstSeenAt: 100 * id,
  lastSeenAt: 200 * id,
  sampleCount: 1,
  coverSampleId: null,
  cameraIds: [id],
  ...patch,
});

describe('visitor gallery model', () => {
  test('filters by kind and searches name, note and number', () => {
    const all = [
      visitor(1, { name: 'Juan', category: 'neighbor' }),
      visitor(2, { note: 'trae el agua' }),
      visitor(3, { name: 'Moto', category: 'watchlist' }),
    ];
    expect(filterVisitors(all, 'named', '').map((item) => item.id)).toEqual([1, 3]);
    expect(filterVisitors(all, 'unnamed', '').map((item) => item.id)).toEqual([2]);
    expect(filterVisitors(all, 'watchlist', '').map((item) => item.id)).toEqual([3]);
    expect(filterVisitors(all, 'all', 'agua').map((item) => item.id)).toEqual([2]);
    expect(filterVisitors(all, 'all', '3').map((item) => item.id)).toEqual([3]);
  });

  test('merging folds visits, samples, dates and cameras into the kept person', () => {
    const merged = mergedInto([visitor(1), visitor(2, { visitCount: 3 })], visitor(1), [2]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      id: 1,
      visitCount: 4,
      sampleCount: 2,
      firstSeenAt: 100,
      lastSeenAt: 400,
    });
    expect(merged[0]?.cameraIds).toEqual([1, 2]);
  });

  test('patches and removals leave the other people untouched', () => {
    const start = [visitor(1), visitor(2)];
    expect(patchVisitor(start, 2, { name: 'Ana' }).map((item) => item.name)).toEqual(['', 'Ana']);
    expect(withoutVisitors(start, [1]).map((item) => item.id)).toEqual([2]);
  });

  test('a feed scope names the filter and the normalised search, and reads back', () => {
    expect(visitorFeedScope({ filter: 'all', search: '' })).toBe(VISITOR_ALL_SCOPE);
    expect(visitorFeedScope({ filter: 'named', search: '  Ana María ' })).toBe('named|ana maría');
    expect(visitorQueryOf('named|ana maría')).toEqual({ filter: 'named', search: 'ana maría' });
    expect(visitorQueryOf('watchlist|a|b')).toEqual({ filter: 'watchlist', search: 'a|b' });
    expect(visitorQueryOf('bogus|x')).toEqual({ filter: 'all', search: 'x' });
  });

  test('the gallery order is the server order: last seen first, then the newer id', () => {
    const rows = [
      visitor(1, { lastSeenAt: 50 }),
      visitor(3, { lastSeenAt: 90 }),
      visitor(2, { lastSeenAt: 90 }),
    ];
    expect([...rows].sort(compareVisitors).map((item) => item.id)).toEqual([3, 2, 1]);
  });
});
