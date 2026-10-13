import { describe, expect, test } from 'bun:test';
import type { ICalendarEventCacheSource } from '@/core/interfaces';
import type { CalendarEntry } from '@/core/types';
import type { ViewWrite } from '@/core/services/view-cache/projection';
import {
  agendaScope,
  agendaSpan,
  projectAgendaFeed,
  toCalendarEntries,
} from '@/core/services/view-cache/calendar.projection';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const event = (patch: Partial<ICalendarEventCacheSource> = {}): ICalendarEventCacheSource => ({
  id: 'e1',
  ownerId: '1',
  title: 'Clase de piano',
  startsAt: new Date(Date.UTC(2026, 9, 5, 13, 0, 0)),
  endsAt: new Date(Date.UTC(2026, 9, 5, 14, 30, 0)),
  isAllDay: false,
  color: '',
  location: 'Conservatorio',
  description: '',
  projectId: null,
  recurrenceRule: 'FREQ=WEEKLY',
  ...patch,
});

const range = (from: number, days: number) => ({ from, to: from + days * DAY - 1 });

const OCT_1 = Date.UTC(2026, 9, 1, 5, 0, 0);

describe('recurring events in the agenda', () => {
  test('a weekly event shows every occurrence of the window, each addressed by its own start', () => {
    const entries = toCalendarEntries({ events: [], reminders: [], tasks: [], series: [event()], zone: 'America/Lima' }, range(OCT_1, 21));
    expect(entries.map((entry) => entry.id)).toEqual([
      'event:e1@2026-10-05T13:00:00.000Z',
      'event:e1@2026-10-12T13:00:00.000Z',
      'event:e1@2026-10-19T13:00:00.000Z',
    ]);
    const [, second] = entries;
    expect(second?.endsAt).toBe(Date.UTC(2026, 9, 12, 14, 30, 0));
    expect(second?.location).toBe('Conservatorio');
    expect(second?.series).toEqual({
      startsAt: Date.UTC(2026, 9, 5, 13, 0, 0),
      endsAt: Date.UTC(2026, 9, 5, 14, 30, 0),
      rule: 'FREQ=WEEKLY',
    });
  });

  test('the occurrences keep the household wall clock, whatever zone the device shows them in', () => {
    const lima = event({ id: 'e2', startsAt: new Date(Date.UTC(2026, 2, 27, 13, 0, 0)), endsAt: null, recurrenceRule: 'FREQ=DAILY' });
    const entries = toCalendarEntries(
      { events: [], reminders: [], tasks: [], series: [lima], zone: 'America/Lima' },
      { from: Date.UTC(2026, 2, 27, 0, 0, 0), to: Date.UTC(2026, 2, 30, 0, 0, 0) }
    );
    expect(entries.map((entry) => entry.startsAt)).toEqual([
      Date.UTC(2026, 2, 27, 13, 0, 0),
      Date.UTC(2026, 2, 28, 13, 0, 0),
      Date.UTC(2026, 2, 29, 13, 0, 0),
    ]);
    const newYork = event({ id: 'e3', startsAt: new Date(Date.UTC(2026, 2, 7, 13, 0, 0)), endsAt: null, recurrenceRule: 'FREQ=DAILY' });
    const across = toCalendarEntries(
      { events: [], reminders: [], tasks: [], series: [newYork], zone: 'America/New_York' },
      { from: Date.UTC(2026, 2, 7, 0, 0, 0), to: Date.UTC(2026, 2, 9, 23, 0, 0) }
    );
    expect(across.map((entry) => entry.startsAt)).toEqual([
      Date.UTC(2026, 2, 7, 13, 0, 0),
      Date.UTC(2026, 2, 8, 12, 0, 0),
      Date.UTC(2026, 2, 9, 12, 0, 0),
    ]);
  });

  test('a recurring event inside the range query is expanded once, not shown twice', () => {
    const repeating = event();
    const entries = toCalendarEntries(
      { events: [repeating], reminders: [], tasks: [], series: [repeating], zone: 'America/Lima' },
      range(OCT_1, 14)
    );
    expect(entries.map((entry) => entry.id)).toEqual([
      'event:e1@2026-10-05T13:00:00.000Z',
      'event:e1@2026-10-12T13:00:00.000Z',
    ]);
    const alone = toCalendarEntries({ events: [repeating], reminders: [], tasks: [] }, range(OCT_1, 14));
    expect(alone).toHaveLength(2);
  });

  test('a rule the app does not read leaves the event as one plain entry, and a removed rule wins over a stale series row', () => {
    const custom = event({ recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO' });
    expect(
      toCalendarEntries({ events: [custom], reminders: [], tasks: [], series: [custom] }, range(OCT_1, 21)).map(
        (entry) => entry.id
      )
    ).toEqual(['event:e1']);
    const stopped = toCalendarEntries(
      { events: [event({ recurrenceRule: null })], reminders: [], tasks: [], series: [event()] },
      range(OCT_1, 21)
    );
    expect(stopped.map((entry: CalendarEntry) => [entry.id, entry.series])).toEqual([['event:e1', undefined]]);
  });

  test('without a household zone the device zone expands the series', () => {
    const local = event({ startsAt: new Date(2026, 9, 5, 8, 0, 0), endsAt: null });
    const entries = toCalendarEntries(
      { events: [], reminders: [], tasks: [], series: [local], zone: null },
      { from: new Date(2026, 9, 1).getTime(), to: new Date(2026, 9, 20).getTime() }
    );
    expect(entries.map((entry) => new Date(entry.startsAt).getHours())).toEqual([8, 8, 8]);
  });

  test('the agenda feed has more while a series continues after the window', () => {
    const scope = agendaScope(new Date(2026, 9, 1));
    const span = agendaSpan(scope, { weeks: 1 });
    const feed = (series: readonly ICalendarEventCacheSource[]): boolean => {
      const [write]: ViewWrite[] = projectAgendaFeed(
        { events: [], reminders: [], tasks: [], series, zone: 'America/Lima', eventsLater: false, tasksLater: false },
        scope,
        span
      );
      return (write && 'value' in write ? (write.value as { hasMore: boolean }) : { hasMore: false }).hasMore;
    };
    expect(feed([])).toBe(false);
    expect(feed([event()])).toBe(true);
  });
});
