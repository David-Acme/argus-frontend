import { describe, expect, test } from 'bun:test';
import { inicioColumns, inicioStack } from '@/features/home/model/inicio-layout';

const ALL = { agenda: true, news: true, cameras: true, people: true };

describe('the Inicio columns', () => {
  test('from 1024 px: Ahora, Hoy and Mañana | Novedades | Cámaras and En casa', () => {
    expect(inicioColumns('band', ALL)).toEqual([
      { id: 'agenda', sections: ['lead', 'now', 'today', 'tomorrow'], grows: 2, width: 320 },
      { id: 'news', sections: ['news'], grows: 0 },
      { id: 'side', sections: ['cameras', 'people'], grows: 0, width: 300 },
    ]);
  });

  test('from 1700 px: four columns, Novedades capped at 620 px', () => {
    expect(inicioColumns('wide', ALL)).toEqual([
      { id: 'agenda', sections: ['lead', 'now', 'today', 'tomorrow'], grows: 2, width: 340 },
      { id: 'news', sections: ['news'], grows: 0, max: 620 },
      { id: 'cameras', sections: ['cameras', 'happened'], grows: 0 },
      { id: 'side', sections: ['people', 'projects', 'clips', 'reminders'], grows: 0, width: 340 },
    ]);
  });

  test('a guard without the agenda starts with Novedades, which carries the lead', () => {
    const columns = inicioColumns('band', { ...ALL, agenda: false });
    expect(columns.map((column) => column.id)).toEqual(['news', 'side']);
    expect(columns[0]?.sections).toEqual(['lead', 'news']);
    expect(columns[0]?.grows).toBe(1);
  });

  test('when every column is fixed, the last one takes the rest of the width', () => {
    const columns = inicioColumns('band', {
      agenda: true,
      news: false,
      cameras: false,
      people: true,
    });
    expect(columns).toEqual([
      { id: 'agenda', sections: ['lead', 'now', 'today', 'tomorrow'], grows: 2, width: 320 },
      { id: 'side', sections: ['people'], grows: 0 },
    ]);
  });

  test('a side column without En casa grows its first section', () => {
    const side = inicioColumns('wide', { ...ALL, people: false }).at(-1);
    expect(side).toEqual({
      id: 'side',
      sections: ['projects', 'clips', 'reminders'],
      grows: 0,
      width: 340,
    });
  });

  test('a role that reads none of them still has the lead', () => {
    expect(
      inicioColumns('band', { agenda: false, news: false, cameras: false, people: false })
    ).toEqual([{ id: 'lead', sections: ['lead'], grows: 0 }]);
  });
});

describe('the phone stack', () => {
  test('hero lead, Ahora, the camera strip, then Novedades', () => {
    expect(inicioStack(ALL, false)).toEqual(['lead', 'now', 'cameras', 'news']);
  });

  test('a new household shows only its one first step', () => {
    expect(inicioStack(ALL, true)).toEqual(['lead']);
  });

  test('what the role cannot read is absent', () => {
    expect(
      inicioStack({ agenda: false, news: true, cameras: false, people: false }, false)
    ).toEqual(['lead', 'news']);
  });
});
