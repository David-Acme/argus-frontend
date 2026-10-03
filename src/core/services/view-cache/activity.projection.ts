import type { EventModel } from '@/core/database';
import type { ICameraEventCacheRow } from '@/core/interfaces';
import type { EventSeverity } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants/cache.constant';
import { MOSAIC_COLUMNS, MOSAIC_ROWS, RECENT_EVENT_LIMIT } from '@/shared/constants/dashboard.constant';
import { DAY_MS, startOfDay } from './dates';
import type { ProjectionContext, ViewWrite } from './projection';

export type EventSource = Pick<EventModel, 'id' | 'summary' | 'severity' | 'occurredAt'>;

export type ActivityProjectionInput = { events: readonly EventSource[] };

const BAND_HOURS = 24 / MOSAIC_ROWS;

export function activityLevels(events: readonly Pick<EventSource, 'occurredAt'>[], now: Date): number[][] {
  const today = startOfDay(now);
  const counts = Array.from({ length: MOSAIC_ROWS }, () => Array.from({ length: MOSAIC_COLUMNS }, () => 0));
  let peak = 0;
  for (const event of events) {
    const dayOffset = Math.floor((today - startOfDay(event.occurredAt)) / DAY_MS);
    if (dayOffset < 0 || dayOffset >= MOSAIC_COLUMNS) continue;
    const column = MOSAIC_COLUMNS - 1 - dayOffset;
    const row = Math.min(MOSAIC_ROWS - 1, Math.floor(event.occurredAt.getHours() / BAND_HOURS));
    counts[row][column] += 1;
    peak = Math.max(peak, counts[row][column]);
  }
  return peak === 0 ? counts : counts.map((row) => row.map((value) => Math.ceil((value / peak) * 3)));
}

export function projectActivity({ events }: ActivityProjectionInput, { now }: ProjectionContext): ViewWrite[] {
  const recent: ICameraEventCacheRow[] = [...events]
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
    .slice(0, RECENT_EVENT_LIMIT)
    .map((event) => ({
      id: event.id,
      summary: event.summary,
      severity: event.severity as EventSeverity,
      occurredAt: event.occurredAt.getTime(),
    }));
  return [
    { key: VIEW_CACHE_KEYS.dashboardActivity, rows: activityLevels(events, now) },
    { key: VIEW_CACHE_KEYS.cameraEvents, rows: recent },
  ];
}
