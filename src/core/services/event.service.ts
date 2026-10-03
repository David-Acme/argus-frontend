import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { EventModel } from '@/core/database';
import type { EventSeverity } from '@/core/types';
import { DatabaseService } from './database.service';

class EventService extends DatabaseService<'event'> {
  constructor() {
    super('event');
  }

  observeRecent(limit = 20): Observable<EventModel[]> {
    return this.observeManyWithColumns(
      ['event_type', 'severity', 'source', 'summary', 'occurred_at'],
      [Q.sortBy('occurred_at', Q.desc), Q.take(limit)],
    );
  }

  observeBySeverity(severity: EventSeverity, limit = 50): Observable<EventModel[]> {
    return this.observeManyWithColumns(
      ['event_type', 'severity', 'summary', 'occurred_at'],
      [Q.where('severity', severity), Q.sortBy('occurred_at', Q.desc), Q.take(limit)],
    );
  }

  observeCountSince(sinceMs: number): Observable<number> {
    return this.observeTotal([Q.where('occurred_at', Q.gte(sinceMs))]);
  }
}

export const eventService = new EventService();
