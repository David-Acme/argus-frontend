import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import { z } from 'zod';
import type { ReminderModel } from '@/core/database';
import type {
  IOccurrenceChange,
  IReminderCreate,
  IReminderSnooze,
  IReminderUpdate,
  IServiceResponse,
} from '@/core/interfaces';
import { httpService, idempotentConfig } from '@/core/services/http';
import { DatabaseService } from './database.service';

const createdReminderSchema = z.object({ id: z.union([z.number(), z.string()]) });

function createdOf(response: IServiceResponse<unknown>): IServiceResponse<unknown> {
  if (!response.ok || createdReminderSchema.safeParse(response.info).success) return response;
  return {
    status: response.status,
    ok: false,
    info: null,
    errors: { code: 'INVALID_RESPONSE', message: 'The new reminder is not in the expected shape' },
  };
}

class ReminderService extends DatabaseService<'reminder'> {
  constructor() {
    super('reminder');
  }

  observeForUser(userId: string): Observable<ReminderModel[]> {
    return this.observeManyWithColumns(
      [
        'title',
        'description',
        'scheduled_at',
        'recurrence_rule',
        'recurrence_exceptions',
        'is_completed',
        'completed_at',
      ],
      [Q.where('target_user_id', userId), Q.sortBy('scheduled_at', Q.asc)]
    );
  }

  async create(body: IReminderCreate, idempotencyKey?: string): Promise<IServiceResponse<unknown>> {
    return createdOf(await httpService.post('/reminder', body, idempotentConfig(idempotencyKey)));
  }

  update(id: string, body: IReminderUpdate): Promise<IServiceResponse<unknown>> {
    return httpService.patch(`/reminder/${id}`, body);
  }

  snooze(id: string, body: IReminderSnooze): Promise<IServiceResponse<unknown>> {
    return httpService.post(`/reminder/${id}/snooze`, body);
  }

  changeOccurrence(
    id: string,
    body: Pick<IOccurrenceChange, 'occurrence' | 'cancelled' | 'startsAt'>
  ): Promise<IServiceResponse<unknown>> {
    return httpService.patch(`/reminder/${id}/occurrence`, body);
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
      ]
    );
  }

  observePendingCountForUser(userId: string): Observable<number> {
    return this.observeTotal([Q.where('target_user_id', userId), Q.where('is_completed', false)]);
  }
}

export const reminderService = new ReminderService();
