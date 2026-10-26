import { describe, expect, test } from 'bun:test';
import type { TableName } from '@/core/types';
import { agendaCheck, agendaMenu, agendaRights } from '@/features/agenda/model/agenda-actions';
import { at, entry, items, NOW, reminder } from '../home/agenda-fixtures';

const allow = (allowed: readonly string[]) => (table: TableName, permission: string) =>
  allowed.includes(`${table}.${permission}`);

const [meeting, done, plumber, task] = items(
  [reminder('plomero', at(11)), reminder('hecho', at(9), { isCompleted: true })],
  [
    entry('event:m', at(14), { endsAt: at(16) }),
    entry('task:t', at(18), { source: 'task', status: 'active' }),
  ]
).sort((left, right) => left.title.localeCompare(right.title));

describe('what an agenda row lets you do', () => {
  test('reminders follow reminders.write; events and tasks follow their table', () => {
    const can = allow(['calendar_event.update', 'project_task.update', 'project_task.delete']);
    expect(agendaRights(plumber!, { writesReminders: false, can })).toEqual({
      toggle: false,
      edit: false,
      remove: false,
    });
    expect(agendaRights(plumber!, { writesReminders: true, can })).toEqual({
      toggle: true,
      edit: true,
      remove: true,
    });
    expect(agendaRights(meeting!, { writesReminders: true, can })).toEqual({
      toggle: false,
      edit: true,
      remove: false,
    });
    expect(agendaRights(task!, { writesReminders: false, can })).toEqual({
      toggle: true,
      edit: true,
      remove: true,
    });
  });

  test('an open reminder offers Posponer when its snoozes allow it, then Editar and Borrar', () => {
    const rights = { toggle: true, edit: true, remove: true };
    expect(agendaMenu({ item: plumber!, rights, snoozes: ['10', '30', '60', 'tomorrow'] })).toEqual(
      ['snooze-hour', 'snooze-tomorrow', 'edit', 'delete']
    );
    expect(agendaMenu({ item: plumber!, rights, snoozes: ['tomorrow'] })).toEqual([
      'snooze-tomorrow',
      'edit',
      'delete',
    ]);
    expect(agendaMenu({ item: done!, rights, snoozes: ['60'] })).toEqual(['edit', 'delete']);
  });

  test('without rights the menu is empty, and an event never snoozes', () => {
    const none = { toggle: false, edit: false, remove: false };
    expect(agendaMenu({ item: plumber!, rights: none, snoozes: ['60'] })).toEqual([]);
    expect(
      agendaMenu({
        item: meeting!,
        rights: { toggle: false, edit: true, remove: true },
        snoozes: ['60'],
      })
    ).toEqual(['edit', 'delete']);
  });

  test('the check shows done, overdue, in progress or open', () => {
    expect(agendaCheck(done!, NOW)).toBe('done');
    expect(agendaCheck(plumber!, NOW)).toBe('overdue');
    expect(agendaCheck(task!, NOW)).toBe('progress');
    expect(agendaCheck(plumber!, at(10))).toBe('open');
  });
});
