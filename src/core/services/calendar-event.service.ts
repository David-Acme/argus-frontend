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
import { wordClauses, type PageSegment } from './paging';
import { SEARCH_PAGE_SIZE } from '@/shared/constants';
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

const EVENT_SEARCH_COLUMNS = ['title'];

const EVENT_RESULT_COLUMNS = ['title', 'starts_at', 'is_all_day', 'recurrence_rule'];

class CalendarEventService extends DatabaseService<'calendar_event'> {
  constructor() {
    super('calendar_event');
  }

  searchSeries(words: readonly string[]): PageSegment<CalendarEventModel> {
    return this.keysetSegment({
      clauses: [
        Q.where('recurrence_rule', Q.notEq(null)),
        Q.where('recurrence_rule', Q.notEq('')),
        ...wordClauses(EVENT_SEARCH_COLUMNS, words),
      ],
      sort: { column: 'starts_at', order: 'asc' },
      columns: EVENT_RESULT_COLUMNS,
      pageSize: SEARCH_PAGE_SIZE,
    });
  }

  searchSingles(words: readonly string[], since: number, ahead: boolean): PageSegment<CalendarEventModel> {
    return this.keysetSegment({
      clauses: [
        Q.or(Q.where('recurrence_rule', null), Q.where('recurrence_rule', '')),
        Q.where('starts_at', ahead ? Q.gte(since) : Q.lt(since)),
        ...wordClauses(EVENT_SEARCH_COLUMNS, words),
      ],
      sort: { column: 'starts_at', order: ahead ? 'asc' : 'desc' },
      columns: EVENT_RESULT_COLUMNS,
      pageSize: SEARCH_PAGE_SIZE,
    });
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
