import type { CalendarEntryState, TranslationKey } from '@/core/types';

export const ENTRY_STATE_RAIL: Record<CalendarEntryState, string> = {
  upcoming: 'bg-interactive',
  todo: 'bg-interactive',
  ongoing: 'bg-accent',
  today: 'bg-accent',
  doing: 'bg-accent',
  overdue: 'bg-warning',
  ended: 'bg-border',
  done: 'bg-success',
};

export const entryStateLabelKey = (state: CalendarEntryState): TranslationKey => `screens.agenda.state-${state}`;

export const isQuietEntryState = (state: CalendarEntryState): boolean => state === 'upcoming' || state === 'todo';
