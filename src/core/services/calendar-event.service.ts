import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { CalendarEventModel } from '@/core/database';
import type {
  ICalendarEventCreate,
  ICalendarEventUpdate,
  IServiceResponse,
} from '@/core/interfaces';
import { DatabaseService } from './database.service';
import { httpService } from '@/core/services/http';

/**
 * Reads come from the local projection that `/sync` fills; writes go over REST
 * and come back through the socket, so nothing here mutates the database by
 * hand.
 */
class CalendarEventService extends DatabaseService<'calendar_event'> {
  constructor() {
    super('calendar_event');
  }

  observeRange(fromMs: number, toMs: number): Observable<CalendarEventModel[]> {
    return this.observeManyWithColumns(
      [
        'title',
        'starts_at',
        'ends_at',
        'is_all_day',
        'color',
        'project_id',
        'location',
        'description',
      ],
      [
        Q.where('starts_at', Q.gte(fromMs)),
        Q.where('starts_at', Q.lte(toMs)),
        Q.sortBy('starts_at', Q.asc),
      ],
    );
  }

  observeForOwner(ownerId: string): Observable<CalendarEventModel[]> {
    return this.observeManyWithColumns(
      ['title', 'starts_at', 'ends_at', 'is_all_day', 'color'],
      [Q.where('owner_id', ownerId), Q.sortBy('starts_at', Q.asc)],
    );
  }

  create(body: ICalendarEventCreate): Promise<IServiceResponse<unknown>> {
    return httpService.post('/calendar-event', body);
  }

  update(id: string, body: ICalendarEventUpdate): Promise<IServiceResponse<unknown>> {
    return httpService.patch(`/calendar-event/${id}`, body);
  }

  remove(id: string): Promise<IServiceResponse<unknown>> {
    return httpService.delete(`/calendar-event/${id}`);
  }
}

export const calendarEventService = new CalendarEventService();
