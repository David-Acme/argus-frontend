import { describe, expect, test } from 'bun:test';
import { inicioColumns, inicioStack } from '@/features/home/model/inicio-layout';

const ALL = {
  agenda: true,
  news: true,
  cameras: true,
  tiles: true,
  people: true,
  watch: false,
  night: false,
  system: false,
  sparse: false,
};

const NONE = {
  agenda: false,
  news: false,
  cameras: false,
  tiles: false,
  people: false,
  watch: false,
  night: false,
  system: false,
  sparse: false,
};

describe('the Inicio columns', () => {
  test('from 1024 px: Ahora, Hoy and Mañana | Novedades | Cámaras and En casa, only Cámaras grows', () => {
    expect(inicioColumns('band', ALL)).toEqual([
      { id: 'agenda', sections: ['lead', 'now', 'today', 'tomorrow'], grows: -1, width: 320 },
      { id: 'news', sections: ['news'], grows: -1 },
      { id: 'side', sections: ['cameras', 'people'], grows: 0, width: 300 },
    ]);
  });

  test('from 1700 px: four columns, Novedades capped at 620 px', () => {
    expect(inicioColumns('wide', ALL)).toEqual([
      { id: 'agenda', sections: ['lead', 'now', 'today', 'tomorrow'], grows: -1, width: 340 },
      { id: 'news', sections: ['news'], grows: -1, max: 620 },
      { id: 'cameras', sections: ['cameras', 'happened'], grows: 0 },
      {
        id: 'side',
        sections: ['people', 'projects', 'clips'],
        grows: -1,
        width: 340,
      },
    ]);
  });

  test('a guard without the agenda starts with Novedades, which carries the lead', () => {
    const columns = inicioColumns('band', { ...ALL, agenda: false });
    expect(columns.map((column) => column.id)).toEqual(['news', 'side']);
    expect(columns[0]?.sections).toEqual(['lead', 'news']);
  });

  test('when every column is fixed, the last one takes the rest of the width', () => {
    expect(inicioColumns('band', { ...NONE, agenda: true, people: true })).toEqual([
      { id: 'agenda', sections: ['lead', 'now', 'today', 'tomorrow'], grows: -1, width: 320 },
      { id: 'side', sections: ['people'], grows: -1 },
    ]);
  });

  test('no card is stretched: without camera tiles nothing grows', () => {
    const wide = inicioColumns('wide', { ...ALL, tiles: false, system: true });
    expect(wide.map((column) => column.grows)).toEqual([-1, -1, -1, -1]);
    expect(wide[2]?.sections).toEqual(['happened']);
  });

  test('a role that reads none of them still has the lead', () => {
    expect(inicioColumns('band', NONE)).toEqual([{ id: 'lead', sections: ['lead'], grows: -1 }]);
  });
});

describe('the phone stack', () => {
  test('hero lead, Ahora, the camera strip, then Novedades', () => {
    expect(inicioStack(ALL, false)).toEqual(['lead', 'now', 'cameras', 'news']);
  });

  test('without a camera there is no strip', () => {
    expect(inicioStack({ ...ALL, tiles: false }, false)).toEqual(['lead', 'now', 'news']);
  });

  test('a new household: its first step, Novedades and Estado when there are any, with no suggestions', () => {
    expect(inicioStack(ALL, true)).toEqual(['lead', 'news']);
    expect(inicioStack({ ...ALL, news: false, system: true }, true)).toEqual(['lead', 'system']);
  });

  test('a new household on a tablet adds how Argus helps and the day', () => {
    expect(inicioStack({ ...ALL, news: false, system: true }, true, true)).toEqual([
      'lead',
      'system',
      'help',
      'today',
    ]);
  });

  test('what the role cannot read is absent', () => {
    expect(inicioStack({ ...NONE, news: true }, false)).toEqual(['lead', 'news']);
  });
});

describe('night, away and a sparse home', () => {
  test("on watch, «Esta noche» leads the phone, and at night Mañana takes Ahora's place", () => {
    expect(inicioStack({ ...ALL, watch: true, night: true }, false)).toEqual([
      'lead',
      'watch',
      'tomorrow',
      'cameras',
      'news',
    ]);
    expect(inicioStack({ ...ALL, watch: true }, false)).toEqual([
      'lead',
      'watch',
      'now',
      'cameras',
      'news',
    ]);
  });

  test('on the desktop the watch tops the agenda column', () => {
    expect(inicioColumns('band', { ...ALL, watch: true })[0]?.sections).toEqual([
      'lead',
      'watch',
      'now',
      'today',
      'tomorrow',
    ]);
  });

  test('Estado closes the side column from 1700 px, and from 1024 px only in a sparse home', () => {
    expect(
      inicioColumns('wide', { ...ALL, system: true })
        .at(-1)
        ?.sections.at(-1)
    ).toBe('system');
    expect(inicioColumns('band', { ...ALL, system: true }).at(-1)?.sections).toEqual([
      'cameras',
      'people',
    ]);
  });

  test('a sparse home ends the side column with how Argus helps', () => {
    expect(inicioColumns('band', { ...ALL, system: true, sparse: true }).at(-1)?.sections).toEqual([
      'cameras',
      'people',
      'system',
      'help',
    ]);
    expect(inicioColumns('wide', { ...ALL, system: true, sparse: true }).at(-1)?.sections).toEqual([
      'people',
      'projects',
      'clips',
      'system',
      'help',
    ]);
  });

  test('an empty feed leaves no blank column: the side takes the width', () => {
    const columns = inicioColumns('band', { ...ALL, news: false, system: true, sparse: true });
    expect(columns.map((column) => column.id)).toEqual(['agenda', 'side']);
    expect(columns.at(-1)?.width).toBeUndefined();
  });
});
