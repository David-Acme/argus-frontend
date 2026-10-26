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
  test('Argus manages reminders: they are read-only; events and tasks follow their table', () => {
    const can = allow(['calendar_event.update', 'project_task.update', 'project_task.delete']);
    const none = { toggle: false, edit: false, remove: false };
    expect(agendaRights(plumber!, can)).toEqual(none);
    expect(agendaRights(plumber!, allow(['reminder.update', 'reminder.delete']))).toEqual(none);
    expect(agendaRights(meeting!, can)).toEqual({ toggle: false, edit: true, remove: false });
    expect(agendaRights(task!, can)).toEqual({ toggle: true, edit: true, remove: true });
  });

  test('the menu offers Editar and Borrar by the rights, and nothing without them', () => {
    expect(agendaMenu({ toggle: true, edit: true, remove: true })).toEqual(['edit', 'delete']);
    expect(agendaMenu({ toggle: false, edit: true, remove: false })).toEqual(['edit']);
    expect(agendaMenu({ toggle: false, edit: false, remove: false })).toEqual([]);
  });

  test('the check shows done, overdue, in progress or open', () => {
    expect(agendaCheck(done!, NOW)).toBe('done');
    expect(agendaCheck(plumber!, NOW)).toBe('overdue');
    expect(agendaCheck(task!, NOW)).toBe('progress');
    expect(agendaCheck(plumber!, at(10))).toBe('open');
  });
});
