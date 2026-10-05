import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { CalendarEventModel } from '@/core/database';
import type {
  ICalendarEventCreate,
  ICalendarEventUpdate,
  IServiceResponse,
} from '@/core/interfaces';
import { DatabaseService } from './database.service';
import { httpService, idempotentConfig } from '@/core/services/http';

class CalendarEventService extends DatabaseService<'calendar_event'> {
  constructor() {
    super('calendar_event');
  }

  observeAnyStartingAfter(afterMs: number): Observable<boolean> {
    return this.observeMany([Q.where('starts_at', Q.gt(afterMs)), Q.take(1)]).pipe(
      map((rows) => rows.length > 0),
    );
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

  create(body: ICalendarEventCreate, idempotencyKey?: string): Promise<IServiceResponse<unknown>> {
    return httpService.post('/calendar-event', body, idempotentConfig(idempotencyKey));
  }

  update(id: string, body: ICalendarEventUpdate): Promise<IServiceResponse<unknown>> {
    return httpService.patch(`/calendar-event/${id}`, body);
  }

  remove(id: string): Promise<IServiceResponse<unknown>> {
    return httpService.delete(`/calendar-event/${id}`);
  }
}

export const calendarEventService = new CalendarEventService();
