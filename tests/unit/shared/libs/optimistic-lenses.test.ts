import { describe, expect, test } from 'bun:test';
import type { IProjectTaskCacheRow } from '@/core/interfaces';
import type { CalendarEntry } from '@/core/types';
import { CALENDAR_LENSES } from '@/features/agenda/model/calendar-optimistic';
import { projectTaskLens } from '@/features/projects/model/project-optimistic';

const task: IProjectTaskCacheRow = {
  id: '5',
  projectId: '2',
  title: 'Paint',
  status: 'todo',
  priority: 'none',
  dueAt: 1_790_000_000_000,
};

const event: CalendarEntry = {
  id: 'event:9',
  source: 'event',
  title: 'Dentist',
  startsAt: 1_790_000_000_000,
  endsAt: 1_790_003_600_000,
  isAllDay: false,
  status: 'upcoming',
  location: 'Centro',
  description: 'Bring the card',
  projectId: null,
};

const lensFor = (table: string) => {
  const lens = CALENDAR_LENSES.find((candidate) => candidate.table === table);
  if (!lens) throw new Error(`no lens for ${table}`);
  return lens;
};

describe('optimistic lenses read null as a cleared field', () => {
  test('a task whose due date is cleared has none until the sync lands', () => {
    const lens = projectTaskLens('2');
    expect(lens.patch(task, { dueAt: null }).dueAt).toBeNull();
    expect(lens.patch(task, { title: 'Paint the door' }).dueAt).toBe(task.dueAt);
    expect(lens.patch(task, { dueAt: 1_790_086_400 }).dueAt).toBe(1_790_086_400_000);
  });

  test('an event loses its end, place and note when they are cleared', () => {
    const patched = lensFor('calendar_event').patch(event, {
      endsAt: null,
      location: null,
      description: null,
    });
    expect(patched.endsAt).toBeNull();
    expect(patched.location).toBeUndefined();
    expect(patched.description).toBeUndefined();
    expect(lensFor('calendar_event').patch(event, { title: 'Dentist at 5' }).location).toBe(
      'Centro'
    );
  });

  test('a calendar task keeps its day while its cleared due date syncs away', () => {
    const entry: CalendarEntry = {
      ...event,
      id: 'task:5',
      source: 'task',
      endsAt: null,
      isAllDay: true,
    };
    expect(lensFor('project_task').patch(entry, { dueAt: null }).startsAt).toBe(entry.startsAt);
  });
});
