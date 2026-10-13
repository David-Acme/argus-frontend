import type { CalendarEventShareModel, UserModel } from '@/core/database';
import type { ICalendarEventShareCacheRow } from '@/core/interfaces';
import { VIEW_CACHE_KEYS, VIEW_CACHE_LIST_LIMIT } from '@/shared/constants/cache.constant';
import type { ViewWrite } from './projection';

export type CalendarShareSource = Pick<CalendarEventShareModel, 'id' | 'calendarEventId' | 'userId' | 'access'>;

export type CalendarShareUserSource = Pick<UserModel, 'id' | 'name' | 'lastName'>;

export type CalendarShareProjectionInput = {
  shares: readonly CalendarShareSource[];
  users: readonly CalendarShareUserSource[];
};

const fullName = (user: CalendarShareUserSource | undefined): string =>
  user ? [user.name, user.lastName].filter((part) => part.length > 0).join(' ') : '';

export function projectCalendarShares({ shares, users }: CalendarShareProjectionInput): ViewWrite[] {
  const people = new Map(users.map((user) => [user.id, user]));
  const sharesByEvent = new Map<string, ICalendarEventShareCacheRow[]>();
  for (const share of shares) {
    const bucket = sharesByEvent.get(share.calendarEventId) ?? [];
    bucket.push({
      id: share.id,
      calendarEventId: share.calendarEventId,
      userId: share.userId,
      name: fullName(people.get(share.userId)),
      access: share.access,
    });
    sharesByEvent.set(share.calendarEventId, bucket);
  }
  return [...sharesByEvent].map(([eventId, rows]) => ({
    key: VIEW_CACHE_KEYS.calendarEventShares,
    scope: eventId,
    rows,
    limit: VIEW_CACHE_LIST_LIMIT,
  }));
}
