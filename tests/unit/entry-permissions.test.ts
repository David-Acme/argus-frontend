import { describe, expect, test } from 'bun:test';
import { compareDayEntries, entryPermissions } from '@/features/agenda/model/calendar-entry-actions';
import { hasAccess } from '@/shared/libs/role-access';

describe('entryPermissions', () => {
  test('tasks are checked against project_task, everything else against calendar_event', () => {
    const asked: string[] = [];
    const can = (table: string, permission: string) => {
      asked.push(`${table}:${permission}`);
      return table === 'project_task';
    };
    expect(entryPermissions({ source: 'task' }, can)).toEqual({ canEdit: true, canDelete: true });
    expect(entryPermissions({ source: 'event' }, can)).toEqual({ canEdit: false, canDelete: false });
    expect(entryPermissions({ source: 'reminder' }, can)).toEqual({ canEdit: false, canDelete: false });
    expect(asked).toEqual([
      'project_task:update',
      'project_task:delete',
      'calendar_event:update',
      'calendar_event:delete',
      'calendar_event:update',
      'calendar_event:delete',
    ]);
  });

  test('a guest cannot edit or delete an agenda entry', () => {
    const can = (table: 'project_task' | 'calendar_event', permission: 'update' | 'delete') =>
      hasAccess('guest', table, permission);
    expect(entryPermissions({ source: 'event' }, can)).toEqual({ canEdit: false, canDelete: false });
  });
});

describe('compareDayEntries', () => {
  test('a day lists its all-day entries first, then the timed ones by start', () => {
    const entries = [
      { id: 'late', isAllDay: false, startsAt: 300 },
      { id: 'task', isAllDay: true, startsAt: 500 },
      { id: 'early', isAllDay: false, startsAt: 100 },
    ];
    expect([...entries].sort(compareDayEntries).map((entry) => entry.id)).toEqual(['task', 'early', 'late']);
  });
});
