import { describe, expect, test } from 'bun:test';
import { foldText } from '@/shared/libs/text-search';
import {
  actionMatches,
  filterLabeled,
  foldedScore,
  groupEntries,
  scopeKinds,
  searchGroups,
  type SearchEntry,
  type SearchKind,
} from '@/features/command/model/command-search';

const entry = (kind: SearchKind, id: string): SearchEntry => ({ kind, id, title: id, at: null });

const ALL: ReadonlySet<SearchKind> = new Set(['event', 'task', 'project', 'person', 'camera']);

describe('command search', () => {
  test('a prefix beats a word start, which beats a match inside a word', () => {
    const needle = foldText('pat');
    expect(foldedScore(foldText('Patio'), needle)).toBe(3);
    expect(foldedScore(foldText('Cámara del patio'), needle)).toBe(2);
    expect(foldedScore(foldText('Espátula'), needle)).toBe(1);
    expect(foldedScore(foldText('Sala'), needle)).toBe(0);
  });

  test('a scope keeps the kinds of its group that the role may search', () => {
    expect(scopeKinds('all', ALL)).toEqual(['event', 'task', 'project', 'person', 'camera']);
    expect(scopeKinds('agenda', ALL)).toEqual(['event', 'task']);
    expect(scopeKinds('agenda', new Set<SearchKind>(['task', 'camera']))).toEqual(['task']);
    expect(scopeKinds('people', new Set<SearchKind>(['camera']))).toEqual([]);
  });

  test('the chips name only the groups the role may search, in their order', () => {
    expect(searchGroups(ALL)).toEqual(['agenda', 'projects', 'people', 'cameras']);
    expect(searchGroups(new Set<SearchKind>(['camera', 'task']))).toEqual(['agenda', 'cameras']);
  });

  test('a page of hits is grouped as it comes, events and tasks together under the agenda', () => {
    const grouped = groupEntries([
      entry('event', 'e1'),
      entry('task', 't1'),
      entry('event', 'e2'),
      entry('project', 'p1'),
      entry('camera', 'c1'),
    ]);
    expect(
      grouped.map(({ group, entries }) => `${group}:${entries.map((item) => item.id).join(',')}`)
    ).toEqual(['agenda:e1,t1,e2', 'projects:p1', 'cameras:c1']);
    expect(groupEntries([])).toEqual([]);
  });

  test('labelled items are filtered by the same folding, and an empty query keeps them all', () => {
    const items = [{ label: 'Nuevo evento' }, { label: 'Nueva tarea' }, { label: 'Ir a Inicio' }];
    expect(filterLabeled(items, 'NUEV')).toEqual([
      { label: 'Nuevo evento' },
      { label: 'Nueva tarea' },
    ]);
    expect(filterLabeled(items, 'inicio')).toEqual([{ label: 'Ir a Inicio' }]);
    expect(filterLabeled(items, '')).toEqual(items);
  });
});

describe('new-item actions', () => {
  const actions = [
    { kind: 'reminder', label: 'Nuevo recordatorio' },
    { kind: 'event', label: 'Nuevo evento' },
  ] as const;

  test('without a query every action is offered as itself', () => {
    expect(actionMatches(actions, '', 'reminder')).toEqual([
      { kind: 'reminder', quoted: false },
      { kind: 'event', quoted: false },
    ]);
  });

  test('free text becomes a reminder quoting it, after the actions the text names', () => {
    expect(actionMatches(actions, 'Pagar', 'reminder')).toEqual([
      { kind: 'reminder', quoted: true },
    ]);
    expect(actionMatches(actions, 'evento', 'reminder')).toEqual([
      { kind: 'event', quoted: false },
      { kind: 'reminder', quoted: true },
    ]);
  });

  test('typing the reminder action itself does not quote it, and no reminder means no quote', () => {
    expect(actionMatches(actions, 'recordatorio', 'reminder')).toEqual([
      { kind: 'reminder', quoted: false },
    ]);
    expect(actionMatches([actions[1]], 'pagar', 'reminder')).toEqual([]);
  });
});
