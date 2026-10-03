import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { CalendarEventShareModel } from '@/core/database';
import type {
  ICalendarEventShareCreate,
  IServiceResponse,
  IShareAccessUpdate,
} from '@/core/interfaces';
import { DatabaseService } from './database.service';
import { httpService } from '@/core/services/http';

class CalendarEventShareService extends DatabaseService<'calendar_event_share'> {
  constructor() {
    super('calendar_event_share');
  }

  observeForEvent(calendarEventId: string): Observable<CalendarEventShareModel[]> {
    return this.observeManyWithColumns(
      ['user_id', 'access'],
      [Q.where('calendar_event_id', calendarEventId), Q.sortBy('created_at', Q.asc)],
    );
  }

  observeForUser(userId: string): Observable<CalendarEventShareModel[]> {
    return this.observeManyWithColumns(
      ['calendar_event_id', 'access'],
      [Q.where('user_id', userId)],
    );
  }

  share(body: ICalendarEventShareCreate): Promise<IServiceResponse<unknown>> {
    return httpService.post('/calendar-event-share', body);
  }

  setAccess(id: string, body: IShareAccessUpdate): Promise<IServiceResponse<unknown>> {
    return httpService.patch(`/calendar-event-share/${id}`, body);
  }

  revoke(id: string): Promise<IServiceResponse<unknown>> {
    return httpService.delete(`/calendar-event-share/${id}`);
  }
}

export const calendarEventShareService = new CalendarEventShareService();
