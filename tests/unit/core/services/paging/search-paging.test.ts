import { describe, expect, test } from 'bun:test';
import type { Clause } from '@nozbe/watermelondb/QueryDescription';
import { buildQueryDescription } from '@nozbe/watermelondb/QueryDescription';
import encodeMatcher from '@nozbe/watermelondb/observation/encodeMatcher';
import { firstValueFrom, of } from 'rxjs';
import type { ISearchHitCacheRow } from '@/core/interfaces';
import type { KeysetWindow } from '@/core/types';
import {
  FIRST_SEGMENT,
  likeWord,
  nextSegments,
  observeSegments,
  sameSegments,
  wordClauses,
  type PageSegment,
} from '@/core/services/paging';
import { projectSearch } from '@/core/services/view-cache/search.projection';
import {
  encodeSearchScope,
  foldText,
  matchesWords,
  parseSearchScope,
  searchWords,
} from '@/shared/libs/text-search';

type Row = { id: string; name: string; last_name?: string };

const matching = (clauses: Clause[]) => {
  const matcher = encodeMatcher(buildQueryDescription(clauses));
  return (row: Row) => matcher(row as never);
};

const PEOPLE: Row[] = [
  { id: '1', name: 'José', last_name: 'Pérez' },
  { id: '2', name: 'Josa', last_name: 'Ruiz' },
  { id: '3', name: 'Ana María', last_name: 'García' },
  { id: '4', name: 'Ñandú', last_name: 'Camión' },
];

const found = (words: readonly string[]) =>
  PEOPLE.filter(matching(wordClauses(['name', 'last_name'], words)))
    .filter((row) => matchesWords(`${row.name} ${row.last_name ?? ''}`, words))
    .map((row) => row.id);

describe('accent-insensitive search in the database', () => {
  test('folding drops accents and case and splits the words', () => {
    expect(foldText('  Cámara DEL Patio ')).toBe('camara del patio');
    expect(searchWords(' José   pérez ')).toEqual(['jose', 'perez']);
    expect(searchWords('   ')).toEqual([]);
  });

  test('letters that carry accents become single-character wildcards in the LIKE pattern', () => {
    expect(likeWord('jose')).toBe('%j_s_%');
    expect(likeWord('50%')).toBe('%50_%');
    expect(likeWord('patio')).toBe('%p_t__%');
  });

  test('consonants stay literal, so a word of common letters is not a pattern that matches anything', () => {
    expect(likeWord('cocina')).toBe('%c_c___%');
    const rows: Row[] = [
      { id: '1', name: 'Cocina' },
      { id: '2', name: 'Reunión' },
      { id: '3', name: 'Comprar pan' },
    ];
    expect(rows.filter(matching(wordClauses(['name'], ['cocina']))).map((row) => row.id)).toEqual([
      '1',
    ]);
  });

  test('the query finds accented rows, the fold removes what the wildcards let in', () => {
    expect(PEOPLE.filter(matching(wordClauses(['name'], ['jose']))).map((row) => row.id)).toEqual([
      '1',
      '2',
    ]);
    expect(found(['jose'])).toEqual(['1']);
    expect(found(['nandu'])).toEqual(['4']);
    expect(found(['CAMION'.toLowerCase()])).toEqual(['4']);
  });

  test('every word must appear in one of the columns, in any order', () => {
    expect(found(['garcia', 'ana'])).toEqual(['3']);
    expect(found(['ana', 'perez'])).toEqual([]);
    expect(found([])).toEqual(['1', '2', '3', '4']);
  });

  test('a search scope survives its key and a broken key is no scope', () => {
    const scope = { kinds: ['person', 'camera'] as const, words: ['ana'], since: 5 };
    expect(parseSearchScope(encodeSearchScope(scope))).toEqual(scope);
    expect(parseSearchScope('{nope')).toBeNull();
    expect(parseSearchScope('{"kinds":["robot","camera"],"words":["a",""],"since":1}')).toEqual({
      kinds: ['camera'],
      words: ['a'],
      since: 1,
    });
  });
});

const PAGE = 2;

function segment(ids: readonly string[]): PageSegment<string> {
  const upTo = (window: KeysetWindow) =>
    window.through ? ids.indexOf(window.through.id) + 1 : Math.min(PAGE, ids.length);
  return {
    observe: (window) => {
      const end = upTo(window);
      return of({ rows: ids.slice(0, end), hasMore: end < ids.length });
    },
    next: async (window) => {
      const end = upTo(window);
      const reach = ids.slice(end, end + PAGE);
      const last = reach[reach.length - 1];
      return last === undefined ? window : { through: { value: last, id: last } };
    },
    any: () => of(ids.length > 0),
    exists: async () => ids.length > 0,
  };
}

describe('segmented keyset pages', () => {
  const segments = [segment(['a1', 'a2', 'a3']), segment([]), segment(['c1'])];

  test('the first page reads the first segment and knows more exists further on', async () => {
    const page = await firstValueFrom(observeSegments(segments, FIRST_SEGMENT));
    expect(page).toEqual({ rows: ['a1', 'a2'], hasMore: true });
  });

  test('scrolling walks a segment to its end, skips empty ones and stops at the last row', async () => {
    let windows = FIRST_SEGMENT;
    const seen: string[][] = [];
    for (let step = 0; step < 4; step += 1) {
      windows = await nextSegments(segments, windows);
      seen.push([...(await firstValueFrom(observeSegments(segments, windows))).rows]);
    }
    expect(seen[0]).toEqual(['a1', 'a2', 'a3']);
    expect(seen[1]).toEqual(['a1', 'a2', 'a3', 'c1']);
    expect(seen[2]).toEqual(seen[1]);
    const last = await firstValueFrom(observeSegments(segments, windows));
    expect(last.hasMore).toBe(false);
  });

  test('an exhausted search does not grow its window again', async () => {
    const done = await nextSegments([segment(['x'])], FIRST_SEGMENT);
    expect(sameSegments(done, FIRST_SEGMENT)).toBe(true);
    expect(await firstValueFrom(observeSegments([], FIRST_SEGMENT))).toEqual({
      rows: [],
      hasMore: false,
    });
  });
});

describe('search projection', () => {
  test('a page keeps only the hits whose folded title holds every word', () => {
    const hit = (id: string, title: string): ISearchHitCacheRow => ({
      kind: 'person',
      id,
      title,
      at: null,
      allDay: false,
      parentId: null,
      recurrenceRule: null,
    });
    const [write] = projectSearch(
      { rows: [hit('1', 'José Pérez'), hit('2', 'Josa Ruiz')], hasMore: true },
      'scope',
      ['jose']
    );
    expect(write).toEqual({
      key: 'command.search',
      scope: 'scope',
      value: { rows: [hit('1', 'José Pérez')], hasMore: true, scanned: 2 },
    });
  });
});
