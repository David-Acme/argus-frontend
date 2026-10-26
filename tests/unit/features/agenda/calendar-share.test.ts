import { describe, expect, test } from 'bun:test';
import type { ICalendarEventShareCacheRow, IPeopleDirectoryCacheRow } from '@/core/interfaces';
import type { CalendarEntry } from '@/core/types';
import { canShareCalendarEntry } from '@/features/agenda/model/calendar-entry-actions';
import { calendarShareLens } from '@/features/agenda/model/calendar-share-optimistic';

const event = (ownerId: string): CalendarEntry => ({
  id: 'event:9',
  source: 'event',
  ownerId,
  title: 'Visit',
  startsAt: 0,
  endsAt: null,
  isAllDay: false,
  status: 'upcoming',
});

const person: IPeopleDirectoryCacheRow = {
  id: '2',
  name: 'Luis',
  lastName: 'Paz',
  role: 'resident',
  isActive: true,
  createdAt: 0,
  updatedAt: 0,
};

const share: ICalendarEventShareCacheRow = {
  id: 'x1',
  calendarEventId: '9',
  userId: '2',
  name: 'Luis Paz',
  access: 'view',
};

describe('sharing an agenda event', () => {
  test('only the owner of an event, with the household directory, can share it', () => {
    const viewer = { userId: '1', canManageShares: true };
    expect(canShareCalendarEntry(event('1'), viewer)).toBe(true);
    expect(canShareCalendarEntry(event('2'), viewer)).toBe(false);
    expect(canShareCalendarEntry(event('1'), { ...viewer, canManageShares: false })).toBe(false);
  });

  test('a task or a reminder is never shared', () => {
    const viewer = { userId: '1', canManageShares: true };
    expect(canShareCalendarEntry({ ...event('1'), source: 'task' }, viewer)).toBe(false);
    expect(canShareCalendarEntry({ ...event('1'), source: 'reminder' }, viewer)).toBe(false);
  });
});

describe('calendar event share lens', () => {
  const lens = calendarShareLens('9', [person]);

  test('an update changes only the access of its own row', () => {
    expect(lens.recordIdOf(share)).toBe('x1');
    expect(lens.patch(share, { access: 'edit' })).toEqual({ ...share, access: 'edit' });
  });

  test('a create names the person and only for its own event', () => {
    expect(lens.create?.('pending-1', { calendarEventId: 9, userId: 2, access: 'edit' })).toEqual({
      id: 'pending-1',
      calendarEventId: '9',
      userId: '2',
      name: 'Luis Paz',
      access: 'edit',
    });
    expect(
      lens.create?.('pending-2', { calendarEventId: 10, userId: 2, access: 'view' })
    ).toBeNull();
    expect(lens.create?.('pending-3', { calendarEventId: 9 })).toBeNull();
  });
});
