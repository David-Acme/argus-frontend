import type { IReminderCacheRow } from '@/core/interfaces';
import type { CalendarEntry } from './calendar.type';

export type AgendaKind = 'reminder' | 'event' | 'task';

export type AgendaOrigin =
  { kind: 'reminder'; row: IReminderCacheRow } | { kind: 'entry'; entry: CalendarEntry };

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
  origin: AgendaOrigin;
};

export type DayRange = { from: number; to: number };

export type NowList = { items: readonly AgendaItem[]; total: number; overdue: number };

export type AgendaMenuAction = 'snooze-hour' | 'snooze-tomorrow' | 'edit' | 'delete';

export type AgendaRights = { toggle: boolean; edit: boolean; remove: boolean };
