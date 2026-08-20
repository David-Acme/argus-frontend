import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { ReminderDetailModel } from '@/core/database';
import type { ReminderDetailStatus } from '@/core/types';
import { DatabaseService } from './database.service';

class ReminderDetailService extends DatabaseService<'reminder_detail'> {
  constructor() {
    super('reminder_detail');
  }

  observeByReminder(reminderId: string): Observable<ReminderDetailModel[]> {
    return this.observeManyWithColumns(
      ['content', 'status', 'file_paths'],
      [Q.where('reminder_id', reminderId), Q.sortBy('created_at', Q.asc)],
    );
  }

  observeByReminderAndStatus(
    reminderId: string,
    status: ReminderDetailStatus,
  ): Observable<ReminderDetailModel[]> {
    return this.observeManyWithColumns(
      ['content', 'file_paths'],
      [
        Q.where('reminder_id', reminderId),
        Q.where('status', status),
        Q.sortBy('created_at', Q.asc),
      ],
    );
  }
}

export const reminderDetailService = new ReminderDetailService();
