import { describe, expect, test } from 'bun:test';
import type { InicioSurface } from '@/shared/libs/surfaces';
import { inicioColumns, inicioStack } from '@/features/home/model/inicio-layout';

type Surface = Pick<InicioSurface, 'id' | 'places'>;

const SURFACES: readonly Surface[] = [
  {
    id: 'news',
    places: {
      stack: { order: 50, when: 'news' },
      band: { order: 10, column: 'news', when: 'news' },
      wide: { order: 10, column: 'news', when: 'news' },
      first: { order: 10, when: 'news' },
    },
  },
  {
    id: 'now',
    places: {
      stack: { order: 20, when: 'day' },
      band: { order: 20, column: 'agenda' },
      wide: { order: 20, column: 'agenda' },
    },
  },
  {
    id: 'tomorrow',
    places: {
      stack: { order: 21, when: 'night' },
      band: { order: 22, column: 'agenda' },
      wide: { order: 22, column: 'agenda' },
    },
  },
  {
    id: 'cameras',
    places: {
      stack: { order: 30, when: 'tiles' },
      band: { order: 10, column: 'side', when: 'tiles', grows: true },
      wide: { order: 10, column: 'cameras', when: 'tiles', grows: true },
    },
  },
  { id: 'happened', places: { wide: { order: 20, column: 'cameras' } } },
  {
    id: 'people',
    places: { band: { order: 20, column: 'side' }, wide: { order: 10, column: 'side' } },
  },
  {
    id: 'help',
    places: {
      first: { order: 30, when: 'tablet' },
      band: { order: 80, column: 'side', when: 'sparse' },
    },
  },
];

const ALL = new Set(['news', 'day', 'tiles']);

describe('the Inicio columns', () => {
  test('sections land in their column in order, the lead opens the first, the grower is marked', () => {
    expect(inicioColumns('band', SURFACES, ALL)).toEqual([
      { id: 'agenda', sections: ['lead', 'now', 'tomorrow'], grows: -1, width: 320 },
      { id: 'news', sections: ['news'], grows: -1 },
      { id: 'side', sections: ['cameras', 'people'], grows: 0, width: 300 },
    ]);
  });

  test('from 1700 px the cameras get their own column, Novedades capped', () => {
    expect(inicioColumns('wide', SURFACES, ALL)).toEqual([
      { id: 'agenda', sections: ['lead', 'now', 'tomorrow'], grows: -1, width: 340 },
      { id: 'news', sections: ['news'], grows: -1, max: 620 },
      { id: 'cameras', sections: ['cameras', 'happened'], grows: 0 },
      { id: 'side', sections: ['people'], grows: -1, width: 340 },
    ]);
  });

  test('a column with nothing in it is absent, and the next one carries the lead', () => {
    const columns = inicioColumns(
      'band',
      SURFACES.filter((surface) => !['now', 'tomorrow'].includes(surface.id)),
      ALL
    );
    expect(columns.map((column) => column.id)).toEqual(['news', 'side']);
    expect(columns[0]?.sections).toEqual(['lead', 'news']);
  });

  test('when every column is fixed, the last one takes the rest of the width', () => {
    const columns = inicioColumns('band', SURFACES, new Set(['day']));
    expect(columns.map((column) => column.id)).toEqual(['agenda', 'side']);
    expect(columns.at(-1)?.width).toBeUndefined();
  });

  test('without camera tiles nothing grows, and a section only shows under its signal', () => {
    const wide = inicioColumns('wide', SURFACES, new Set(['news']));
    expect(wide.map((column) => column.grows)).toEqual([-1, -1, -1, -1]);
    expect(inicioColumns('band', SURFACES, new Set(['sparse'])).at(-1)?.sections).toEqual([
      'people',
      'help',
    ]);
  });

  test('a role that reads none of them still has the lead', () => {
    expect(inicioColumns('band', [], ALL)).toEqual([{ id: 'lead', sections: ['lead'], grows: -1 }]);
  });
});

describe('the phone stack', () => {
  test('the lead, Ahora, the camera strip, then Novedades', () => {
    expect(inicioStack(SURFACES, ALL, false)).toEqual(['lead', 'now', 'cameras', 'news']);
  });

  test('at night Mañana takes the place of Ahora', () => {
    expect(inicioStack(SURFACES, new Set(['night', 'news']), false)).toEqual([
      'lead',
      'tomorrow',
      'news',
    ]);
  });

  test('a new household reads its first-step stack', () => {
    expect(inicioStack(SURFACES, ALL, true)).toEqual(['lead', 'news']);
    expect(inicioStack(SURFACES, new Set(['tablet']), true)).toEqual(['lead', 'help']);
  });
});
