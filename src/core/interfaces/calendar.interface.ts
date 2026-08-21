import type { ShareAccess } from '@/core/types';

/** Wire payloads of the calendar-event REST endpoints. */
export interface ICalendarEventCreate {
  title: string;
  description?: string;
  location?: string;
  color?: string;
  /** Epoch SECONDS: the backend stores seconds, the local db milliseconds. */
  startsAt: number;
  endsAt?: number;
  isAllDay?: boolean;
  recurrenceRule?: string;
  projectId?: number;
}

export type ICalendarEventUpdate = Partial<ICalendarEventCreate>;

/** Sharing one event with one person, at one access level. */
export interface ICalendarEventShareCreate {
  calendarEventId: number;
  userId: number;
  access?: ShareAccess;
}
