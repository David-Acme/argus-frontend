import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { CalendarEventModel } from '@/core/database';
import type {
  ICalendarEventCreate,
  ICalendarEventUpdate,
  IOccurrenceChange,
  IServiceResponse,
} from '@/core/interfaces';
import { DatabaseService } from './database.service';
import { httpService, idempotentConfig } from '@/core/services/http';

const CALENDAR_SOURCE_COLUMNS = [
  'owner_id',
  'title',
  'starts_at',
  'ends_at',
  'is_all_day',
  'color',
  'project_id',
  'location',
  'description',
  'recurrence_rule',
  'recurrence_exceptions',
];

class CalendarEventService extends DatabaseService<'calendar_event'> {
  constructor() {
    super('calendar_event');
  }

  observeRange(fromMs: number, toMs: number): Observable<CalendarEventModel[]> {
    return this.observeManyWithColumns(CALENDAR_SOURCE_COLUMNS, [
      Q.where('starts_at', Q.gte(fromMs)),
      Q.where('starts_at', Q.lte(toMs)),
      Q.sortBy('starts_at', Q.asc),
    ]);
  }

  observeRecurring(): Observable<CalendarEventModel[]> {
    return this.observeManyWithColumns(CALENDAR_SOURCE_COLUMNS, [
      Q.where('recurrence_rule', Q.notEq(null)),
      Q.where('recurrence_rule', Q.notEq('')),
      Q.sortBy('starts_at', Q.asc),
    ]);
  }

  observeLatest(limit: number): Observable<CalendarEventModel[]> {
    return this.observeManyWithColumns(
      ['title', 'starts_at', 'is_all_day', 'recurrence_rule'],
      [Q.sortBy('starts_at', Q.desc), Q.take(limit)],
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

  changeOccurrence(id: string, body: IOccurrenceChange): Promise<IServiceResponse<unknown>> {
    return httpService.patch(`/calendar-event/${id}/occurrence`, body);
  }

  remove(id: string): Promise<IServiceResponse<unknown>> {
    return httpService.delete(`/calendar-event/${id}`);
  }
}

export const calendarEventService = new CalendarEventService();
