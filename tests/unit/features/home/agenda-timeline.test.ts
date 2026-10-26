import { describe, expect, test } from 'bun:test';
import { dayList } from '@/features/home/model/agenda-items';
import {
  busySpan,
  dayTimeline,
  FREE_SLOT_RULES,
  freeSlots,
} from '@/features/home/model/agenda-timeline';
import { at, entry, items, NOW, prototypeDay, reminder, TODAY } from './agenda-fixtures';

const HOUR = 3_600_000;

describe('the free slots of the day', () => {
  test('an event is busy until its end and a reminder for the point length', () => {
    const [meeting, call] = items(
      [reminder('call', at(17))],
      [entry('event:m', at(14, 30), { endsAt: at(16) })]
    );
    expect(busySpan(meeting!, FREE_SLOT_RULES.pointMs)).toEqual({ from: at(14, 30), to: at(16) });
    expect(busySpan(call!, FREE_SLOT_RULES.pointMs)).toEqual({ from: at(17), to: at(17, 30) });
  });

  test('a gap of at least the minimum between busy spans is free, never before the first one', () => {
    const busy = [
      { from: at(9), to: at(10) },
      { from: at(12), to: at(13) },
      { from: at(13, 30), to: at(14) },
    ];
    expect(freeSlots(busy, { after: 0, minMs: HOUR })).toEqual([{ from: at(10), to: at(12) }]);
  });

  test('overlapping spans merge, and nothing before the given moment is free', () => {
    const busy = [
      { from: at(9), to: at(12) },
      { from: at(10), to: at(11) },
      { from: at(15), to: at(16) },
    ];
    expect(freeSlots(busy, { after: at(13), minMs: HOUR })).toEqual([{ from: at(13), to: at(15) }]);
    expect(freeSlots(busy, { after: at(14, 30), minMs: HOUR })).toEqual([]);
    expect(freeSlots([], { after: 0, minMs: HOUR })).toEqual([]);
  });

  test('the prototype day reads Libre 16:00 – 17:00 and 19:00 – 21:00 in place', () => {
    const timeline = dayTimeline(dayList(prototypeDay(), TODAY), {
      ...FREE_SLOT_RULES,
      after: NOW,
    });
    expect(
      timeline.map((row) => (row.type === 'item' ? row.item.title : `Libre ${row.from}-${row.to}`))
    ).toEqual([
      'Yoga',
      'Llamar al plomero',
      'Reunión con el arquitecto',
      `Libre ${at(16)}-${at(17)}`,
      'Pagar la luz',
      'Clase de guitarra',
      `Libre ${at(19)}-${at(21)}`,
      'Sacar la basura',
    ]);
  });

  test('all-day items lead the day and take no time', () => {
    const timeline = dayTimeline(
      items(
        [],
        [
          entry('event:all', at(0), { isAllDay: true }),
          entry('event:x', at(10), { endsAt: at(11) }),
        ]
      ),
      { ...FREE_SLOT_RULES, after: 0 }
    );
    expect(timeline.map((row) => row.type)).toEqual(['item', 'item']);
  });
});
