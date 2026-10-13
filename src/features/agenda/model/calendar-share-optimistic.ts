import type { ICalendarEventShareCacheRow, IPeopleDirectoryCacheRow } from '@/core/interfaces';
import type { ShareAccess } from '@/core/types';
import { defineLens, type OptimisticLens } from '@/shared/libs/optimistic';
import { personFullName } from '@/shared/libs/sharing';

export type CalendarShareIntentValues = {
  calendarEventId: number;
  userId: number;
  access: ShareAccess;
};

export function calendarShareLens(
  eventId: string,
  people: readonly IPeopleDirectoryCacheRow[]
): OptimisticLens<ICalendarEventShareCacheRow> {
  return defineLens<ICalendarEventShareCacheRow, CalendarShareIntentValues>({
    table: 'calendar_event_share',
    recordIdOf: (row) => row.id,
    patch: (row, values) => ({ ...row, access: values.access ?? row.access }),
    create: (recordId, values) => {
      if (values.userId === undefined || String(values.calendarEventId) !== eventId) return null;
      const userId = String(values.userId);
      const person = people.find((candidate) => candidate.id === userId);
      return {
        id: recordId,
        calendarEventId: eventId,
        userId,
        name: person ? personFullName(person) : '',
        access: values.access ?? 'view',
      };
    },
  });
}
