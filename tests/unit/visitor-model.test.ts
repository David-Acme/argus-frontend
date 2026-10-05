import { describe, expect, test } from 'bun:test';
import type { VisitorList, VisitorSummary } from '@/core/types';
import { filterVisitors, mergedInto, patchVisitor, withoutVisitors } from '@/features/visitors/model/visitor';

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

const list = (visitors: VisitorSummary[]): VisitorList => ({ recognitionEnabled: true, visitors });

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
    const merged = mergedInto(list([visitor(1), visitor(2, { visitCount: 3 })]), visitor(1), [2]);
    expect(merged?.visitors).toHaveLength(1);
    expect(merged?.visitors[0]).toMatchObject({ id: 1, visitCount: 4, sampleCount: 2, firstSeenAt: 100, lastSeenAt: 400 });
    expect(merged?.visitors[0]?.cameraIds).toEqual([1, 2]);
  });

  test('patches and removals leave the other people untouched', () => {
    const start = list([visitor(1), visitor(2)]);
    expect(patchVisitor(start, 2, { name: 'Ana' })?.visitors.map((item) => item.name)).toEqual(['', 'Ana']);
    expect(withoutVisitors(start, [1])?.visitors.map((item) => item.id)).toEqual([2]);
    expect(patchVisitor(null, 1, { name: 'x' })).toBeNull();
  });
});
