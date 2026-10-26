export const MONTH_GRID_ROWS = 6;
export const DAYS_PER_WEEK = 7;

export const SCROLLBAR_GUTTER = 14;

export const CALENDAR_OPEN_EVENT_MS = 3_600_000;

const MINUTE_MS = 60_000;

export const FREE_SLOT_RULES = { minMs: 60 * MINUTE_MS, pointMs: 30 * MINUTE_MS } as const;
