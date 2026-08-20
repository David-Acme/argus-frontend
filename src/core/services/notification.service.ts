import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { NotificationModel } from '@/core/database';
import { DatabaseService } from './database.service';

class NotificationService extends DatabaseService<'notification'> {
  constructor() {
    super('notification');
  }

  observeForUser(userId: string, limit = 50): Observable<NotificationModel[]> {
    return this.observeManyWithColumns(
      ['title', 'body', 'is_read', 'read_at'],
      [Q.where('user_id', userId), Q.sortBy('created_at', Q.desc), Q.take(limit)],
    );
  }

  observeUnreadCountForUser(userId: string): Observable<number> {
    return this.observeTotal([Q.where('user_id', userId), Q.where('is_read', false)]);
  }
}

export const notificationService = new NotificationService();
