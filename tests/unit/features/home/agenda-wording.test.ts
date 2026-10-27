import { describe, expect, mock, test } from 'bun:test';
import { nowList } from '@/features/agenda/model/agenda-items';
import { at, entry, items, NOW, prototypeDay, t, task, TODAY, wording } from './agenda-fixtures';

mock.module('@/features/agenda', () => import('@/features/agenda/model/agenda-items'));

const { dayAndTime, itemMeta, nowCount, timeToGo, timeToGoText, urgencyOf } =
  await import('@/features/home/model/agenda-wording');

const byTitle = (title: string) => {
  const found = prototypeDay().find((item) => item.title === title);
  if (!found) throw new Error(title);
  return found;
};

describe('how Inicio words an agenda row', () => {
  test('time-to-go reads hace, ahora and en in minutes, hours and days', () => {
    const say = (startsAt: number) => {
      const [item] = items([task('x', startsAt)]);
      const value = timeToGo(item!, NOW);
      return value ? timeToGoText(value, t) : null;
    };
    expect(say(at(11, 42))).toBe('hace 4 h');
    expect(say(at(15, 30))).toBe('hace 12 min');
    expect(say(at(15, 42, 0) + 20_000)).toBe('ahora');
    expect(say(at(16, 42))).toBe('en 1 h');
    expect(say(at(17, 0, 2))).toBe('en 2 d');
  });

  test('an ongoing event is now, and an all-day or done item has no time-to-go', () => {
    expect(timeToGoText(timeToGo(byTitle('Reunión con el arquitecto'), NOW)!, t)).toBe('ahora');
    const [allDay] = items([entry('event:a', at(0), { isAllDay: true })]);
    expect(timeToGo(allDay!, NOW)).toBeNull();
    expect(timeToGo(byTitle('Yoga'), NOW)).toBeNull();
  });

  test('urgency colours the overdue, the current and the rest', () => {
    expect(urgencyOf(byTitle('Llamar al plomero'), NOW)).toBe('overdue');
    expect(urgencyOf(byTitle('Reunión con el arquitecto'), NOW)).toBe('now');
    expect(urgencyOf(byTitle('Pagar la luz'), NOW)).toBe('later');
  });

  test('the Ahora header counts the rows and the overdue ones', () => {
    expect(nowCount(nowList(prototypeDay(), NOW, TODAY), t)).toBe('5 · 1 atrasado');
    expect(nowCount({ items: [], total: 3, overdue: 0 }, t)).toBe('3');
    expect(nowCount({ items: [], total: 3, overdue: 2 }, t)).toBe('3 · 2 atrasados');
    expect(nowCount({ items: [], total: 0, overdue: 0 }, t)).toBeUndefined();
  });

  test('Ahora rows read like the prototype', () => {
    expect(itemMeta(byTitle('Llamar al plomero'), 'now', wording)).toBe('Atrasado · 11:00');
    expect(itemMeta(byTitle('Reunión con el arquitecto'), 'now', wording)).toBe(
      '14:30 – 16:00 · Mudanza'
    );
    expect(itemMeta(byTitle('Pagar la luz'), 'now', wording)).toBe('Hoy 17:00 · cada mes');
  });

  test('an overdue item from another day names its day', () => {
    const [old] = items([task('x', at(10, 0, -2))]);
    expect(itemMeta(old!, 'now', wording)).toBe('Atrasado · Lun 19 · 10:00');
  });

  test('Hoy rows give the time and repeat only, and the current event says en curso', () => {
    expect(itemMeta(byTitle('Reunión con el arquitecto'), 'day', wording)).toBe(
      '14:30 – 16:00 · en curso'
    );
    expect(itemMeta(byTitle('Pagar la luz'), 'day', wording)).toBe('17:00 · cada mes');
    const [allDay] = items([
      entry('event:a', at(0, 0, 1), { isAllDay: true, location: 'Clínica' }),
    ]);
    expect(itemMeta(allDay!, 'day', wording)).toBe('Todo el día');
    expect(itemMeta(allDay!, 'now', wording)).toBe('Todo el día · Clínica');
  });

  test('a day and time names today, tomorrow or the weekday and date', () => {
    expect(dayAndTime(at(9, 0, 1), wording)).toBe('Mañana · 09:00');
    expect(dayAndTime(at(9, 0, 2), wording)).toBe('Vie 23 · 09:00');
    expect(dayAndTime(at(17), wording)).toBe('Hoy 17:00');
  });
});
