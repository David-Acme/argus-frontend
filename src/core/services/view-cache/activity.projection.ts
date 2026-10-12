import { MOSAIC_COLUMNS, MOSAIC_ROWS } from '@/shared/constants/dashboard.constant';
import { calendarDaysBetween } from './dates';

export type ActivityLevelSource = { occurredAt: Date };

const BAND_HOURS = 24 / MOSAIC_ROWS;

export function activityLevels(events: readonly ActivityLevelSource[], now: Date): number[][] {
  const counts = Array.from({ length: MOSAIC_ROWS }, () => Array.from({ length: MOSAIC_COLUMNS }, () => 0));
  let peak = 0;
  for (const event of events) {
    const dayOffset = calendarDaysBetween(now, event.occurredAt);
    if (dayOffset < 0 || dayOffset >= MOSAIC_COLUMNS) continue;
    const column = MOSAIC_COLUMNS - 1 - dayOffset;
    const row = Math.min(MOSAIC_ROWS - 1, Math.floor(event.occurredAt.getHours() / BAND_HOURS));
    const cells = counts[row];
    if (!cells) continue;
    const next = (cells[column] ?? 0) + 1;
    cells[column] = next;
    peak = Math.max(peak, next);
  }
  return peak === 0 ? counts : counts.map((row) => row.map((value) => Math.ceil((value / peak) * 3)));
}
