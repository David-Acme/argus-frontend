import { describe, expect, test } from 'bun:test';
import {
  dayGroup,
  dayGroups,
  dayRange,
  freeGaps,
  itemsOf,
  markedDays,
  monthCells,
  monthOf,
  nextDays,
  restOfDay,
  shiftMonth,
  weekCells,
} from '@/features/agenda/model/agenda-days';
import { at, date, entry, items, NOW, reminder } from '../home/agenda-fixtures';

const day = () => [
  ...items(
    [
      reminder('Pagar la luz', at(11)),
      reminder('Sacar la basura', at(8), { isCompleted: true, completedAt: at(8) }),
    ],
    [
      entry('event:tecnico', at(14, 30), { title: 'Llamar al técnico', endsAt: at(15) }),
      entry('task:cajas', at(17), { title: 'Comprar cajas', source: 'task', endsAt: at(18) }),
    ]
  ),
];

describe('the week strip and the month grid', () => {
  test('the week starts on the device first weekday and marks today, the selection and busy days', () => {
    const marks = markedDays(day(), date);
    const week = weekCells({ selected: at(0, 0, 1), now: NOW, marks }, date);
    expect(week).toHaveLength(7);
    expect(new Date(week[0]?.at ?? 0).getDay()).toBe(0);
    const today = week.find((cell) => cell.today);
    expect(today?.marked).toBe(true);
    expect(today?.selected).toBe(false);
    expect(week.filter((cell) => cell.selected)).toHaveLength(1);
  });

  test('the month grid is six weeks and tells the days of other months', () => {
    const cells = monthCells(monthOf(NOW), { selected: NOW, now: NOW, marks: new Set() }, date);
    expect(cells).toHaveLength(42);
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(31);
    expect(new Date(shiftMonth(monthOf(NOW), 1, date)).getMonth()).toBe(10);
    expect(new Date(shiftMonth(monthOf(NOW), -1, date)).getMonth()).toBe(8);
  });
});

describe('the day list', () => {
  test('overdue comes first, then the day by time with its free slots', () => {
    const group = dayGroup(day(), dayRange(NOW, date), at(14));
    expect(group.overdue).toBe(1);
    expect(
      group.entries.map((entry) => (entry.type === 'item' ? entry.item.title : 'free'))
    ).toEqual(['Pagar la luz', 'Sacar la basura', 'Llamar al técnico', 'free', 'Comprar cajas']);
  });

  test('a free slot names what sits around it', () => {
    const [gap] = freeGaps(dayGroup(day(), dayRange(NOW, date), at(14)));
    expect(gap).toMatchObject({ from: at(15), to: at(17), before: 'Llamar al técnico' });
    expect(gap?.after).toBe('Comprar cajas');
  });

  test('the list covers the selected day and the following ones, empty days included', () => {
    const groups = dayGroups({ items: day(), from: at(0), days: 7, now: NOW }, date);
    expect(groups).toHaveLength(7);
    expect(groups.map((group) => itemsOf(group).length)).toEqual([4, 0, 0, 0, 0, 0, 0]);
  });

  test('the next days start tomorrow and the rest of the day leaves the item out', () => {
    const list = day();
    expect(nextDays({ items: list, from: NOW, now: NOW }, date).map((group) => group.at)).toEqual([
      at(0, 0, 1),
      at(0, 0, 2),
      at(0, 0, 3),
    ]);
    const [first] = list;
    if (!first) throw new Error('no item');
    const rest = restOfDay(list, first, date).map((item) => item.title);
    expect(rest).toHaveLength(3);
    expect(rest).not.toContain(first.title);
  });
});
