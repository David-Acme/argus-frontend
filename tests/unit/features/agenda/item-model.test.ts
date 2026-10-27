import { describe, expect, test } from 'bun:test';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { clockAt, clockText, parseClock } from '@/features/agenda/model/clock-text';
import { dayHours } from '@/features/agenda/model/day-hours';
import {
  draftDirty,
  draftFrom,
  draftProblems,
  eventCreate,
  eventUpdate,
  momentOf,
  newDraft,
  scopesOf,
  taskCreate,
} from '@/features/agenda/model/item-draft';
import { at, date, entry, items, NOW, task } from '../home/agenda-fixtures';

const twelveHour = createDateFormatter('en', {
  languageTag: 'en-US',
  regionCode: 'US',
  uses24hourClock: false,
  firstWeekday: 1,
  timeZone: 'America/Lima',
});

const range = { from: at(0), to: at(23, 59) + 59_999 };

describe('the hour timeline of Día', () => {
  test('it starts at 07:00 unless something starts earlier, and ends at 21:00 or later', () => {
    const empty = dayHours({ items: [], range, now: NOW }, date);
    expect(empty.hours[0]).toBe(7);
    expect(empty.hours.at(-1)).toBe(20);
    const early = dayHours({ items: items([task('Correr', at(5, 30))]), range, now: NOW }, date);
    expect(early.hours[0]).toBe(5);
  });

  test('overlapping events share the width and the now line sits at the clock', () => {
    const plan = dayHours(
      {
        items: items([
          entry('event:a', at(9), { endsAt: at(10) }),
          entry('event:b', at(9, 30), { endsAt: at(11) }),
          entry('event:c', at(12), { endsAt: at(13) }),
        ]),
        range,
        now: NOW,
      },
      date
    );
    expect(plan.blocks.map((block) => [block.lane, block.lanes])).toEqual([
      [0, 2],
      [1, 2],
      [0, 1],
    ]);
    expect(plan.blocks[0]).toMatchObject({ top: 120, span: 60 });
    expect(plan.now).toBe((15 - 7) * 60 + 42);
  });

  test('the gutter follows the device clock and never needs two lines', () => {
    expect(twelveHour.formatHour(13)).toBe('1:00 PM');
    expect(date.formatHour(13)).toBe('13:00');
  });
});

describe('a typed time', () => {
  test('reads 24 h, 12 h, compact and dotted forms, and refuses nonsense', () => {
    expect(parseClock('09:30')).toBe(570);
    expect(parseClock('9:30 p. m.')).toBe(21 * 60 + 30);
    expect(parseClock('12 am')).toBe(0);
    expect(parseClock('930')).toBe(570);
    expect(parseClock('9.30')).toBe(570);
    expect(parseClock('21')).toBe(21 * 60);
    expect(parseClock('9:3')).toBeNull();
    expect(parseClock('25:00')).toBeNull();
    expect(parseClock('13 pm')).toBeNull();
  });

  test('the field shows the device clock and reads it back to the same moment', () => {
    const at9pm = at(21, 15);
    const shown = clockText(at9pm, twelveHour);
    expect(shown).toBe('9:15 PM');
    expect(clockAt(at(0), parseClock(shown) ?? -1, twelveHour)).toBe(at9pm);
  });
});

describe('the Nuevo draft', () => {
  test('a new event needs a title and a readable time, and the default kind is an event', () => {
    const draft = newDraft({ kind: 'event', day: NOW, at: at(16), project: '' }, date);
    expect(draft.time).toBe('16:00');
    expect(draftProblems(draft)).toEqual(['title']);
    expect(draftProblems({ ...draft, title: 'Pagar', time: 'luego' })).toEqual(['time']);
    expect(draftDirty(draft, draft)).toBe(false);
    expect(draftDirty({ ...draft, title: 'Pagar' }, draft)).toBe('Pagar');
  });

  test('an event body carries seconds and its repeat rule', () => {
    const draft = {
      ...newDraft({ kind: 'event' as const, day: NOW, at: at(16), project: '' }, date),
      title: ' Clase de piano ',
      repeat: 'WEEKLY' as const,
    };
    expect(eventCreate(draft, momentOf(draft, date))).toMatchObject({
      title: 'Clase de piano',
      startsAt: at(16) / 1000,
      recurrenceRule: 'FREQ=WEEKLY',
    });
  });

  test('an event checks its end, and an all-day one needs no time', () => {
    const base = {
      ...newDraft({ kind: 'event' as const, day: NOW, at: at(10), project: '' }, date),
      title: 'Cita',
    };
    expect(draftProblems({ ...base, end: '09:00' })).toEqual(['end']);
    const moment = momentOf({ ...base, end: '11:30', place: 'Casa' }, date);
    expect(eventCreate({ ...base, end: '11:30', place: 'Casa' }, moment)).toMatchObject({
      startsAt: at(10) / 1000,
      endsAt: at(11, 30) / 1000,
      location: 'Casa',
      isAllDay: false,
    });
    expect(draftProblems({ ...base, allDay: true, time: '' })).toEqual([]);
  });

  test('a task needs its project and is due on its day', () => {
    const draft = {
      ...newDraft({ kind: 'task' as const, day: NOW, at: at(10), project: '' }, date),
      title: 'Comprar cajas',
    };
    expect(draftProblems(draft)).toEqual(['project']);
    expect(taskCreate({ ...draft, project: '7' }, momentOf(draft, date))).toEqual({
      projectId: 7,
      title: 'Comprar cajas',
      dueAt: at(0) / 1000,
    });
  });

  test('a recurring event asks «solo esta» or «toda la serie»; a single one and a task do not', () => {
    const [single, chore, series] = items([
      task('Sacar la basura', at(20)),
      entry('event:yoga', at(7), {
        title: 'Yoga',
        series: { rule: 'FREQ=WEEKLY', startsAt: at(7), endsAt: null },
      }),
      entry('event:cita', at(9), { title: 'Cita' }),
    ]).sort((left, right) => left.title.localeCompare(right.title));
    expect(scopesOf(series ?? null)).toEqual(['one', 'series']);
    expect(scopesOf(single ?? null)).toEqual([]);
    expect(scopesOf(chore ?? null)).toEqual([]);
    expect(scopesOf(null)).toEqual([]);
  });

  test('editing an event clears the place it no longer has', () => {
    const [event] = items([entry('event:x', at(10), { endsAt: at(11), location: 'Casa' })]);
    if (!event) throw new Error('no event');
    const draft = { ...draftFrom(event, date), place: '' };
    expect(draft.end).toBe('11:00');
    expect(eventUpdate(draft, momentOf(draft, date), event)).toMatchObject({ location: null });
  });
});
