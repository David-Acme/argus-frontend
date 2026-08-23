import { describe, expect, test } from 'bun:test';
import {
  calendarMonthRange,
  calendarMonthScope,
  toCalendarEntries,
} from './view-cache-projections.service';

describe('view cache projections', () => {
  test('uses one durable cache page for every calendar view of the same month', () => {
    expect(calendarMonthScope(new Date(2026, 7, 23))).toBe('month.2026-08');
  });

  test('prewarms the complete six-week grid for a calendar month', () => {
    const range = calendarMonthRange(new Date(2026, 7, 23));
    expect(range.to - range.from + 1).toBe(42 * 86_400_000);
  });

  test('merges dated rows into a stable, chronological calendar snapshot', () => {
    const entries = toCalendarEntries(
      [
        {
          id: 'event-1',
          title: 'Meeting',
          startsAt: new Date(2_000),
          endsAt: null,
          isAllDay: false,
          color: '',
          location: '',
          description: '',
          projectId: null,
        },
      ],
      [
        {
          id: 'reminder-1',
          title: 'Gate',
          scheduledAt: new Date(1_000),
          isCompleted: false,
        },
      ],
      [
        {
          id: 'task-1',
          title: 'Review',
          dueAt: new Date(3_000),
          status: 'doing',
          projectId: 'project-1',
        },
      ],
      0,
      4_000,
    );

    expect(entries.map((entry) => entry.id)).toEqual([
      'reminder:reminder-1',
      'event:event-1',
      'task:task-1',
    ]);
    expect(entries[2]?.status).toBe('active');
  });
});
