import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { NotificationModel } from '@/core/database';
import type { IServiceResponse } from '@/core/interfaces';
import type { KeysetPage, KeysetWindow } from '@/core/types';
import { httpService } from '@/core/services/http';
import { NOTIFICATION_FEED_PAGE_SIZE } from '@/shared/constants';
import { DatabaseService, type KeysetQuery } from './database.service';

const FEED_COLUMNS = ['type', 'title', 'body', 'data', 'is_read', 'read_at'];

class NotificationService extends DatabaseService<'notification'> {
  constructor() {
    super('notification');
  }

  observeFeedPage(userId: string, window: KeysetWindow): Observable<KeysetPage<NotificationModel>> {
    return this.observeKeysetPage(this.feedQuery(userId), window);
  }

  nextFeedWindow(userId: string, window: KeysetWindow): Promise<KeysetWindow> {
    return this.nextKeysetWindow(this.feedQuery(userId), window);
  }

  private feedQuery(userId: string): KeysetQuery {
    return {
      clauses: [Q.where('user_id', userId)],
      sort: { column: 'created_at', order: 'desc' },
      columns: FEED_COLUMNS,
      pageSize: NOTIFICATION_FEED_PAGE_SIZE,
    };
  }

  async unreadIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.fetchMany([Q.where('user_id', userId), Q.where('is_read', false)]);
    return rows.map((row) => row.id);
  }

  markRead(ids: readonly string[]): Promise<IServiceResponse<unknown>> {
    return httpService.patch('/notification/read', { ids: ids.map(Number) });
  }

  observeUnreadCountForUser(userId: string): Observable<number> {
    return this.observeTotal([Q.where('user_id', userId), Q.where('is_read', false)]);
  }
}

export const notificationService = new NotificationService();
