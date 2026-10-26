import type { CalendarEventModel } from '@/core/database';
import type { IEventListCacheRow } from '@/core/interfaces';
import { VIEW_CACHE_KEYS, VIEW_CACHE_LIST_LIMIT } from '@/shared/constants/cache.constant';
import type { ViewWrite } from './projection';

export type EventListSource = Pick<
  CalendarEventModel,
  'id' | 'title' | 'startsAt' | 'isAllDay' | 'recurrenceRule'
>;

export type EventListProjectionInput = { events: readonly EventListSource[] };

export function projectEventList({ events }: EventListProjectionInput): ViewWrite[] {
  const rows: IEventListCacheRow[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    startsAt: event.startsAt.getTime(),
    isAllDay: event.isAllDay,
    recurrenceRule: event.recurrenceRule || null,
  }));
  return [{ key: VIEW_CACHE_KEYS.eventList, rows, limit: VIEW_CACHE_LIST_LIMIT }];
}
