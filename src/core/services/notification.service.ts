import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { NotificationModel } from '@/core/database';
import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import { DatabaseService } from './database.service';

class NotificationService extends DatabaseService<'notification'> {
  constructor() {
    super('notification');
  }

  observeForUser(userId: string, limit = 50): Observable<NotificationModel[]> {
    return this.observeManyWithColumns(
      ['type', 'title', 'body', 'data', 'is_read', 'read_at'],
      [Q.where('user_id', userId), Q.sortBy('created_at', Q.desc), Q.take(limit)],
    );
  }

  markRead(ids: readonly string[]): Promise<IServiceResponse<unknown>> {
    return httpService.patch('/notification/read', { ids: ids.map(Number) });
  }

  observeUnreadCountForUser(userId: string): Observable<number> {
    return this.observeTotal([Q.where('user_id', userId), Q.where('is_read', false)]);
  }
}

export const notificationService = new NotificationService();
