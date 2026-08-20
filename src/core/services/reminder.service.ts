import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { ReminderModel } from '@/core/database';
import { DatabaseService } from './database.service';

class ReminderService extends DatabaseService<'reminder'> {
  constructor() {
    super('reminder');
  }

  observeForUser(userId: string): Observable<ReminderModel[]> {
    return this.observeManyWithColumns(
      ['title', 'scheduled_at', 'is_completed', 'completed_at'],
      [Q.where('target_user_id', userId), Q.sortBy('scheduled_at', Q.asc)],
    );
  }

  observePendingForUser(userId: string): Observable<ReminderModel[]> {
    return this.observeManyWithColumns(
      ['title', 'scheduled_at'],
      [
        Q.where('target_user_id', userId),
        Q.where('is_completed', false),
        Q.sortBy('scheduled_at', Q.asc),
      ],
    );
  }

  observePendingCountForUser(userId: string): Observable<number> {
    return this.observeTotal([
      Q.where('target_user_id', userId),
      Q.where('is_completed', false),
    ]);
  }
}

export const reminderService = new ReminderService();
