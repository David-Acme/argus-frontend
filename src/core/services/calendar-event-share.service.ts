import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { CalendarEventShareModel } from '@/core/database';
import type { IServiceResponse } from '@/core/interfaces';
import type { ShareAccess } from '@/core/types';
import { DatabaseService } from './database.service';
import { httpService } from '@/core/services/http';

class CalendarEventShareService extends DatabaseService<'calendar_event_share'> {
  constructor() {
    super('calendar_event_share');
  }

  observeAll(): Observable<CalendarEventShareModel[]> {
    return this.observeManyWithColumns(
      ['calendar_event_id', 'user_id', 'access'],
      [Q.sortBy('created_at', Q.asc)],
    );
  }

  add(calendarEventId: string, userId: string, access: ShareAccess): Promise<IServiceResponse<unknown>> {
    return httpService.post('/calendar-event-share', {
      calendarEventId: Number(calendarEventId),
      userId: Number(userId),
      access,
    });
  }

  setAccess(id: string, access: ShareAccess): Promise<IServiceResponse<unknown>> {
    return httpService.patch(`/calendar-event-share/${id}`, { access });
  }

  remove(id: string): Promise<IServiceResponse<unknown>> {
    return httpService.delete(`/calendar-event-share/${id}`);
  }
}

export const calendarEventShareService = new CalendarEventShareService();
