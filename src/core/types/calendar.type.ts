import type { AgendaStatus } from './dashboard.type';

export type CalendarSource = 'event' | 'task';

export const CREATED_VIA = ['app', 'assistant'] as const;

export type CreatedVia = (typeof CREATED_VIA)[number];

export type CalendarEntryState =
  | 'upcoming'
  | 'ongoing'
  | 'today'
  | 'ended'
  | 'todo'
  | 'doing'
  | 'done';

export type CalendarSeries = {
  startsAt: number;
  endsAt: number | null;
  rule: string;
};

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
  ownerId?: string;
  series?: CalendarSeries;
  createdVia?: CreatedVia;
};

