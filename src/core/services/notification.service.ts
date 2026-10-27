import { Q } from '@nozbe/watermelondb';
import type { Clause } from '@nozbe/watermelondb/QueryDescription';
import type { Observable } from 'rxjs';
import type { NotificationModel } from '@/core/database';
import type { IServiceResponse } from '@/core/interfaces';
import type { NotificationThreadTarget } from '@/core/types';
import { httpService } from '@/core/services/http';
import { NOTIFICATION_FEED_PAGE_SIZE } from '@/shared/constants';
import { belongsToThread, notificationReadCalls, threadRemovalPaths, threadRemovalResult } from './notification';
import { DatabaseService } from './database.service';
import type { PageSegment } from './paging';

const FEED_COLUMNS = ['type', 'title', 'body', 'data', 'is_read', 'read_at'];

class NotificationService extends DatabaseService<'notification'> {
  constructor() {
    super('notification');
  }

  feedSegment(userId: string): PageSegment<NotificationModel> {
    return this.keysetSegment({
      clauses: [Q.where('user_id', userId)],
      sort: { column: 'created_at', order: 'desc' },
      columns: FEED_COLUMNS,
      pageSize: NOTIFICATION_FEED_PAGE_SIZE,
    });
  }

  async unreadIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.fetchMany([Q.where('user_id', userId), Q.where('is_read', false)]);
    return rows.map((row) => row.id);
  }

  async markRead(
    target: Pick<NotificationThreadTarget, 'threadKey' | 'ids'>
  ): Promise<IServiceResponse<unknown>> {
    let last: IServiceResponse<unknown> = { ok: true, status: 200, info: null, errors: null };
    for (const call of notificationReadCalls(target)) {
      last = await httpService.patch(call.path, call.body);
      if (!last.ok) return last;
    }
    return last;
  }

  async removeThread(target: NotificationThreadTarget): Promise<IServiceResponse<null>> {
    const responses: IServiceResponse<unknown>[] = [];
    for (const path of threadRemovalPaths(target)) responses.push(await httpService.delete(path));
    const result = threadRemovalResult(responses);
    if (result.ok) await this.forgetThread(target);
    return result;
  }

  private async forgetThread(target: NotificationThreadTarget): Promise<void> {
    const candidates = await this.fetchMany(this.threadClauses(target));
    const rows = candidates.filter((row) => belongsToThread(row, target));
    if (rows.length === 0) return;
    await this.write(() => this.collection.database.batch(rows.map((row) => row.prepareDestroyPermanently())));
  }

  private threadClauses({ userId, threadKey, ids }: NotificationThreadTarget): Clause[] {
    if (threadKey === null) return [Q.where('user_id', userId), Q.where('id', Q.oneOf([...ids]))];
    const needle = Q.sanitizeLikeString(JSON.stringify(threadKey).slice(1, -1));
    return [Q.where('user_id', userId), Q.where('data', Q.like(`%${needle}%`))];
  }

  observeUnreadCountForUser(userId: string): Observable<number> {
    return this.observeTotal([Q.where('user_id', userId), Q.where('is_read', false)]);
  }
}

export const notificationService = new NotificationService();
