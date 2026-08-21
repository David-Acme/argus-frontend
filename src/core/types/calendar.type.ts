import type { AgendaStatus } from './dashboard.type';

/** How the calendar is laid out. */
export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

/** Where an entry came from, so the UI can label and route it. */
export type CalendarSource = 'event' | 'reminder' | 'task';

/**
 * One row of the calendar. The three local tables that carry a date are merged
 * into this shape for display only — the merge lives in the client so the
 * backend never has to know they share a screen.
 */
export type CalendarEntry = {
  id: string;
  source: CalendarSource;
  title: string;
  /** Epoch milliseconds, as stored locally. */
  startsAt: number;
  /** Absent for a point in time. */
  endsAt: number | null;
  isAllDay: boolean;
  status: AgendaStatus;
  color?: string;
  location?: string;
  projectId?: string | null;
};
