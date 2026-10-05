import type { AgendaStatus } from './dashboard.type';
import type { PagedRows } from './paging.type';

export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

export type CalendarSource = 'event' | 'reminder' | 'task';

export type CalendarEntryState =
  | 'upcoming'
  | 'ongoing'
  | 'today'
  | 'ended'
  | 'overdue'
  | 'todo'
  | 'doing'
  | 'done';

export type CalendarEntry = {
  id: string;
  source: CalendarSource;
  title: string;
  startsAt: number;
  endsAt: number | null;
  isAllDay: boolean;
  status: AgendaStatus;
  color?: string;
  location?: string;
  description?: string;
  projectId?: string | null;
};

export type AgendaWindow = { weeks: number };

export type AgendaFeed = PagedRows<CalendarEntry> & { from: number; to: number };
