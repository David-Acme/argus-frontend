import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { ReminderModel } from '@/core/database';
import type { IReminderCreate, IReminderUpdate, IServiceResponse } from '@/core/interfaces';
import { httpService, idempotentConfig } from '@/core/services/http';
import { DatabaseService } from './database.service';

class ReminderService extends DatabaseService<'reminder'> {
  constructor() {
    super('reminder');
  }

  observeForUser(userId: string): Observable<ReminderModel[]> {
    return this.observeManyWithColumns(
      ['title', 'description', 'scheduled_at', 'recurrence_rule', 'is_completed', 'completed_at'],
      [Q.where('target_user_id', userId), Q.sortBy('scheduled_at', Q.asc)],
    );
  }

  create(body: IReminderCreate, idempotencyKey?: string): Promise<IServiceResponse<unknown>> {
    return httpService.post('/reminder', body, idempotentConfig(idempotencyKey));
  }

  update(id: string, body: IReminderUpdate): Promise<IServiceResponse<unknown>> {
    return httpService.patch(`/reminder/${id}`, body);
  }

  remove(id: string): Promise<IServiceResponse<unknown>> {
    return httpService.delete(`/reminder/${id}`);
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
