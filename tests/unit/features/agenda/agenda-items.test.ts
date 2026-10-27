import { describe, expect, test } from 'bun:test';
import {
  dayList,
  isOngoing,
  isOverdue,
  listLimit,
  NOW_ROWS,
  nowList,
} from '@/features/agenda/model/agenda-items';
import {
  at,
  entry,
  items,
  NOW,
  prototypeDay,
  task,
  TODAY,
  TOMORROW,
} from '../home/agenda-fixtures';

const titles = (list: readonly { title: string }[]) => list.map((item) => item.title);

describe('the agenda items Inicio reads', () => {
  test('events and tasks merge into one list, all-day first, then by time', () => {
    const list = items([
      task('Pagar la luz', at(17)),
      entry('event:a', at(9), { title: 'Dentista' }),
      entry('task:t', at(0), { title: 'Comprar cajas', source: 'task', isAllDay: true }),
    ]);
    expect(titles(list)).toEqual(['Comprar cajas', 'Dentista', 'Pagar la luz']);
    expect(list.map((item) => item.kind)).toEqual(['task', 'event', 'task']);
  });

  test('an entry names its project and place, and a started task is in progress', () => {
    const [started] = items(
      [
        entry('task:t', at(0), {
          source: 'task',
          status: 'active',
          isAllDay: true,
          projectId: 'p',
          location: 'Casa',
        }),
      ],
      new Map([['p', 'Mudanza']])
    );
    expect(started).toMatchObject({
      project: 'Mudanza',
      place: 'Casa',
      started: true,
      done: false,
    });
  });

  test('only open timed tasks in the past are overdue; an event is ongoing between its start and end', () => {
    const [plumber, meeting] = items([
      task('Llamar al plomero', at(11)),
      entry('event:m', at(14, 30), { endsAt: at(16) }),
    ]);
    expect(isOverdue(plumber!, NOW)).toBe(true);
    expect(isOverdue(meeting!, NOW)).toBe(false);
    expect(isOngoing(meeting!, NOW)).toBe(true);
    expect(isOngoing(meeting!, at(16, 1))).toBe(false);
  });

  test('Ahora puts the overdue first, then the next by time, keeps three and counts them all', () => {
    const list = nowList(prototypeDay(), NOW, TODAY);
    expect(titles(list.items)).toEqual([
      'Llamar al plomero',
      'Reunión con el arquitecto',
      'Pagar la luz',
    ]);
    expect(list.items).toHaveLength(NOW_ROWS);
    expect(list.total).toBe(5);
    expect(list.overdue).toBe(1);
  });

  test('Ahora leaves out what is done, what has ended and what is tomorrow, but keeps older overdue', () => {
    const list = nowList(
      items([
        task('hecho', at(9), { status: 'complete' }),
        task('ayer', at(10, 0, -1)),
        task('mañana', at(9, 0, 1)),
        entry('event:fin', at(9), { endsAt: at(10) }),
      ]),
      NOW,
      TODAY
    );
    expect(titles(list.items)).toEqual(['ayer']);
    expect(list.overdue).toBe(1);
  });

  test('a day list keeps only the items of that day, done ones included', () => {
    expect(titles(dayList(prototypeDay(), TOMORROW))).toEqual(['Pagar el agua']);
    expect(titles(dayList(prototypeDay(), TODAY))).toContain('Yoga');
  });

  test('a phone card shows three rows and a desktop column five', () => {
    expect([listLimit(false), listLimit(true)]).toEqual([3, 5]);
  });
});
