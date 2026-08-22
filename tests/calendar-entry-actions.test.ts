import { describe, expect, test } from 'bun:test';
import type { CalendarEntry } from '../src/core/types';
import * as calendarActions from '../src/shared/libs/calendar-entry-actions';
import { availableCalendarEntryActions, calendarEntryRecordId } from '../src/shared/libs/calendar-entry-actions';

const event: CalendarEntry = {
  id: 'event:appointment-1',
  source: 'event',
  title: 'Veterinary appointment',
  startsAt: 1_765_000_000_000,
  endsAt: null,
  isAllDay: false,
  status: 'upcoming',
};

describe('calendar entry actions', () => {
  test('keeps deletion out of the event editor footer', () => {
    expect(calendarActions).toHaveProperty('calendarEventFormActions');
    expect(
      (calendarActions as typeof calendarActions & {
        calendarEventFormActions: () => readonly string[];
      }).calendarEventFormActions()
    ).toEqual(['cancel', 'save']);
  });

  test('reserves the overflow affordance for pointer-based web layouts', () => {
    expect(calendarActions).toHaveProperty('shouldShowCalendarEntryOverflow');
    const shouldShow = (calendarActions as typeof calendarActions & {
      shouldShowCalendarEntryOverflow: (isNative: boolean) => boolean;
    }).shouldShowCalendarEntryOverflow;

    expect(shouldShow(true)).toBe(false);
    expect(shouldShow(false)).toBe(true);
  });

  test('keeps the detail dismissal action inset from the dialog edge', () => {
    expect(calendarActions).toHaveProperty('calendarEntryDetailDialogLayout');
    const layout = (calendarActions as typeof calendarActions & {
      calendarEntryDetailDialogLayout: () => {
        contentClassName: string;
        footerClassName: string;
      };
    }).calendarEntryDetailDialogLayout();

    expect(layout).toEqual({
      contentClassName: 'sm:max-w-[460px]',
      footerClassName: 'self-end pb-3',
    });
  });

  test('builds the readable detail rows for a selected event', () => {
    expect(calendarActions).toHaveProperty('calendarEntryDetailRows');
    const detailRows = (calendarActions as typeof calendarActions & {
      calendarEntryDetailRows: (
        entry: CalendarEntry,
        labels: {
          type: string;
          status: string;
          date: string;
          time: string;
          allDay: string;
          location: string;
          event: string;
          task: string;
          reminder: string;
          upcoming: string;
          active: string;
          complete: string;
        },
        formatDate: (value: number) => string,
        formatTime: (entry: CalendarEntry) => string
      ) => readonly { id: string; label: string; value: string }[];
    }).calendarEntryDetailRows;

    expect(
      detailRows(
        { ...event, location: 'Living room' },
        {
          type: 'Type',
          status: 'Status',
          date: 'Date',
          time: 'Time',
          allDay: 'All day',
          location: 'Location',
          event: 'Event',
          task: 'Task',
          reminder: 'Reminder',
          upcoming: 'Upcoming',
          active: 'In progress',
          complete: 'Completed',
        },
        () => 'Saturday, August 22, 2026',
        () => '12:17 PM - 1:00 PM'
      )
    ).toEqual([
      { id: 'type', label: 'Type', value: 'Event' },
      { id: 'date', label: 'Date', value: 'Saturday, August 22, 2026' },
      { id: 'time', label: 'Time', value: '12:17 PM - 1:00 PM' },
      { id: 'status', label: 'Status', value: 'Upcoming' },
      { id: 'location', label: 'Location', value: 'Living room' },
    ]);
  });

  test('keeps the record identity separate from the merged source prefix', () => {
    expect(calendarEntryRecordId(event)).toBe('appointment-1');
  });

  test('offers edit and delete only for an editable calendar event', () => {
    expect(availableCalendarEntryActions(event, { canEdit: true, canDelete: true })).toEqual([
      'edit',
      'delete',
    ]);
  });

  test('offers task completion controls but leaves reminders read-only', () => {
    const task: CalendarEntry = { ...event, id: 'task:task-1', source: 'task', status: 'complete' };
    const reminder: CalendarEntry = { ...event, id: 'reminder:reminder-1', source: 'reminder' };

    expect(availableCalendarEntryActions(task, { canEdit: true, canDelete: true })).toEqual([
      'toggle',
      'delete',
    ]);
    expect(availableCalendarEntryActions(reminder, { canEdit: true, canDelete: true })).toEqual([]);
  });
});
