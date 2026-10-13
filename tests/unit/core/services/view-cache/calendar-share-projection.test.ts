import { describe, expect, test } from 'bun:test';
import type { ViewWrite } from '@/core/services/view-cache/projection';
import { projectCalendarShares } from '@/core/services/view-cache/calendar-share.projection';

const rowsOf = (writes: readonly ViewWrite[], key: string, scope?: string) => {
  const write = writes.find((item) => item.key === key && item.scope === scope);
  if (!write || !('rows' in write)) throw new Error(`no rows for ${key}`);
  return write.rows;
};

describe('calendar share projection', () => {
  test('the shares of each event are written under its scope, with names from the directory', () => {
    const writes = projectCalendarShares({
      shares: [
        { id: 's1', calendarEventId: 'e1', userId: '2', access: 'view' },
        { id: 's2', calendarEventId: 'e1', userId: '9', access: 'edit' },
        { id: 's3', calendarEventId: 'e2', userId: '2', access: 'edit' },
      ],
      users: [{ id: '2', name: 'Luis', lastName: 'Paz' }],
    });
    expect(writes.map((write) => write.scope)).toEqual(['e1', 'e2']);
    expect(rowsOf(writes, 'calendar.event.shares', 'e1')).toEqual([
      { id: 's1', calendarEventId: 'e1', userId: '2', name: 'Luis Paz', access: 'view' },
      { id: 's2', calendarEventId: 'e1', userId: '9', name: '', access: 'edit' },
    ]);
  });

  test('an event without shares writes no scope, so the tracked scope is removed', () => {
    expect(projectCalendarShares({ shares: [], users: [] })).toEqual([]);
  });
});
