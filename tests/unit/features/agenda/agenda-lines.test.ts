import { describe, expect, test } from 'bun:test';
import { ALL_SHOWN } from '@/features/agenda/constants/agenda.constant';
import {
  barOf,
  categoryOf,
  dayWord,
  durationText,
  freeWords,
  kindWords,
  lineWords,
  shownItems,
  toggleShown,
} from '@/features/agenda/model/agenda-lines';
import type { DayWordContext, LineContext } from '@/features/agenda/model/agenda-lines';
import { at, date, entry, items, NOW, t, task } from '../home/agenda-fixtures';

const context: LineContext & DayWordContext = {
  now: NOW,
  viewer: '1',
  owners: new Map([['2', 'Luis Paz']]),
  date,
  t,
};

const prototype = () =>
  items([
    task('Pagar la luz', at(11)),
    task('Sacar la basura', at(8), {
      status: 'complete',
      series: { rule: 'FREQ=WEEKLY', startsAt: at(8), endsAt: null },
    }),
    entry('event:tecnico', at(16, 30), {
      title: 'Llamar al técnico',
      endsAt: at(17),
      location: 'Casa',
      ownerId: '1',
    }),
    entry('event:cena', at(20), { title: 'Cena con Luis', endsAt: at(21), ownerId: '2' }),
    entry('event:daily', at(8, 0, 1), {
      title: 'Daily',
      series: { rule: 'FREQ=DAILY', startsAt: at(8), endsAt: null },
      ownerId: '1',
    }),
  ]);

const named = (title: string) => {
  const found = prototype().find((item) => item.title === title);
  if (!found) throw new Error(title);
  return found;
};

describe('the words of an agenda line', () => {
  test('durations read in minutes and hours', () => {
    expect(durationText(30 * 60_000, t)).toBe('30 min');
    expect(durationText(2 * 3_600_000, t)).toBe('2 h');
    expect(durationText(90 * 60_000, t)).toBe('1 h 30 min');
  });

  test('an overdue task says since when, in alert', () => {
    expect(lineWords(named('Pagar la luz'), context)).toEqual({
      time: '11:00',
      allDay: false,
      state: 'Atrasado',
      meta: 'Atrasado desde las 11:00',
      alert: true,
    });
  });

  test('a done task says done and how it repeats', () => {
    const words = lineWords(named('Sacar la basura'), context);
    expect(words.state).toBe('Hecho');
    expect(words.meta).toBe('Tarea · cada semana');
  });

  test('an event says its length and place, a shared one its owner', () => {
    expect(lineWords(named('Llamar al técnico'), context)).toMatchObject({
      time: '16:30',
      state: '30 min',
      meta: 'Evento · Casa',
    });
    expect(lineWords(named('Cena con Luis'), context).meta).toBe('Evento compartido · Luis Paz');
    expect(kindWords(named('Cena con Luis'), context)).toBe('Evento compartido');
  });

  test('an event or a task Argus made says «por Argus» in its meta', () => {
    const made = items([
      entry('event:argus', at(18), { title: 'Cita', ownerId: '1', createdVia: 'assistant' }),
      entry('task:argus', at(0), {
        title: 'Comprar focos',
        source: 'task',
        isAllDay: true,
        createdVia: 'assistant',
      }),
      entry('event:app', at(19), { title: 'Cena', ownerId: '1', createdVia: 'app' }),
    ]);
    const meta = (title: string) => {
      const found = made.find((item) => item.title === title);
      if (!found) throw new Error(title);
      return lineWords(found, context).meta;
    };
    expect(meta('Cita')).toBe('Evento · por Argus');
    expect(meta('Comprar focos')).toBe('Tarea · por Argus');
    expect(meta('Cena')).toBe('Evento');
  });

  test('a free slot gives its start, its length and its end', () => {
    expect(freeWords({ from: at(15), to: at(17) }, context)).toEqual({
      time: '15:00',
      allDay: false,
      state: '2 h',
      meta: 'Hasta las 17:00',
      alert: false,
    });
  });

  test('a day is today, tomorrow or its weekday', () => {
    expect(dayWord(at(0), context)).toBe('Hoy');
    expect(dayWord(at(0, 0, 1), context)).toBe('Mañana');
    expect(dayWord(at(0, 0, 2), context)).toBe(
      date.formatWeekday(new Date(at(0, 0, 2))).toLowerCase()
    );
  });
});

describe('the colour bar and the filters', () => {
  test('the bar is red when overdue, hatched for a series and by kind otherwise', () => {
    expect(barOf(named('Pagar la luz'), NOW, '1')).toBe('overdue');
    expect(barOf(named('Daily'), NOW, '1')).toBe('series');
    expect(barOf(named('Llamar al técnico'), NOW, '1')).toBe('event');
    expect(barOf(named('Cena con Luis'), NOW, '1')).toBe('shared');
    expect(categoryOf(named('Sacar la basura'), '1')).toBe('task');
  });

  test('hiding a category hides its lines and showing it again brings them back', () => {
    const hidden = toggleShown(ALL_SHOWN, 'shared');
    expect(shownItems(prototype(), hidden, '1').map((item) => item.title)).not.toContain(
      'Cena con Luis'
    );
    expect(toggleShown(hidden, 'shared')).toEqual(new Set(ALL_SHOWN));
  });
});
