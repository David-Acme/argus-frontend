import { describe, expect, test } from 'bun:test';
import {
  actionMatches,
  filterLabeled,
  foldedScore,
  foldText,
  rankEntries,
  searchMatches,
  SEARCH_GROUP_LIMIT,
  type SearchEntry,
  type SearchKind,
} from '@/features/command/model/command-search';

const NOW = Date.UTC(2026, 9, 26, 12);
const HOUR = 3_600_000;

const entry = (
  kind: SearchKind,
  id: string,
  title: string,
  at: number | null = null
): SearchEntry => ({
  kind,
  id,
  title,
  folded: foldText(title),
  at,
});

describe('command search', () => {
  test('folding drops accents and case so «cámara» finds «Cámara del patio»', () => {
    expect(foldText('  Cámara del PATIO ')).toBe('camara del patio');
    expect(foldedScore(foldText('Cámara del patio'), foldText('camara'))).toBe(3);
  });

  test('a prefix beats a word start, which beats a match inside a word', () => {
    expect(foldedScore('pagar la luz', 'pag')).toBe(3);
    expect(foldedScore('ir a pagar', 'pag')).toBe(2);
    expect(foldedScore('repagar', 'pag')).toBe(1);
    expect(foldedScore('luz', 'pag')).toBe(0);
    expect(foldedScore('luz', '')).toBe(0);
  });

  test('among equal matches the next upcoming comes first, then the most recent past, then undated', () => {
    const ranked = rankEntries({
      entries: [
        entry('event', 'old', 'Pagar el gas', NOW - 48 * HOUR),
        entry('event', 'none', 'Pagar algo'),
        entry('event', 'later', 'Pagar el agua', NOW + 24 * HOUR),
        entry('event', 'soon', 'Pagar la luz', NOW + 5 * HOUR),
        entry('event', 'recent', 'Pagar el cable', NOW - HOUR),
      ],
      needle: 'pagar',
      now: NOW,
    });
    expect(ranked.map((item) => item.id)).toEqual(['soon', 'later', 'recent', 'old', 'none']);
  });

  test('each group keeps at most its limit', () => {
    const many = Array.from({ length: SEARCH_GROUP_LIMIT + 3 }, (_, at) =>
      entry('camera', String(at), `Cámara ${at}`)
    );
    expect(rankEntries({ entries: many, needle: 'camara', now: NOW })).toHaveLength(
      SEARCH_GROUP_LIMIT
    );
  });

  test('results are grouped agenda, projects, people, cameras and empty groups vanish', () => {
    const groups = searchMatches(
      [
        entry('camera', 'c', 'Patio trasero'),
        entry('task', 't', 'Pintar el patio', NOW + HOUR),
        entry('person', 'p', 'Luis'),
        entry('project', 'j', 'Patio nuevo'),
      ],
      'patio',
      NOW
    );
    expect(groups.map(({ group, entries }) => [group, entries.map((item) => item.id)])).toEqual([
      ['agenda', ['t']],
      ['projects', ['j']],
      ['cameras', ['c']],
    ]);
  });

  test('an empty query searches nothing', () => {
    expect(searchMatches([entry('person', 'p', 'Luis')], '   ', NOW)).toEqual([]);
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
