import type { CalendarView, WindowClass } from '@/core/types';

export const CALENDAR_DEFAULT_VIEW: Record<WindowClass, CalendarView> = {
  compact: 'day',
  medium: 'week',
  expanded: 'month',
};

export const CALENDAR_VIEWS: readonly CalendarView[] = ['day', 'week', 'month', 'agenda'];

export const MONTH_GRID_ROWS = 6;
export const DAYS_PER_WEEK = 7;

export const WEEK_HOUR_HEIGHT = 56;

export const AGENDA_ENTRY_ESTIMATE = 76;
export const SCROLLBAR_GUTTER = 14;
export const DAY_LIST_ROW_ESTIMATE = 48;

export const CALENDAR_OPEN_EVENT_MS = 3_600_000;
