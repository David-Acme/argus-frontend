import type { CalendarEntry } from './calendar.type';

export type AgendaKind = 'event' | 'task';

export type AgendaItem = {
  id: string;
  kind: AgendaKind;
  title: string;
  startsAt: number;
  endsAt: number | null;
  allDay: boolean;
  done: boolean;
  started: boolean;
  repeat: string | null;
  place: string | null;
  project: string | null;
  entry: CalendarEntry;
};

export type DayRange = { from: number; to: number };

export type NowList = { items: readonly AgendaItem[]; total: number; overdue: number };

export type AgendaMenuAction = 'edit' | 'delete';

export type AgendaRights = { toggle: boolean; edit: boolean; remove: boolean };
