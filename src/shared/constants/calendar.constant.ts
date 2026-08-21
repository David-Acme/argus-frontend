import type { CalendarView, WindowClass } from '@/core/types';

/**
 * Default view per window class: a phone cannot show a useful month grid, and
 * a desktop that opens on a single day wastes the space it has.
 */
export const CALENDAR_DEFAULT_VIEW: Record<WindowClass, CalendarView> = {
  compact: 'day',
  medium: 'week',
  expanded: 'month',
};

export const CALENDAR_VIEWS: readonly CalendarView[] = ['day', 'week', 'month', 'agenda'];

/** Rows of a month grid: 6 always, so the layout never jumps between months. */
export const MONTH_GRID_ROWS = 6;
export const DAYS_PER_WEEK = 7;

/** Height of one hour in the week view, in points. */
export const WEEK_HOUR_HEIGHT = 56;
