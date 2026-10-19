import { Model, tableSchema } from '@nozbe/watermelondb';
import { date, field, json, text } from '@nozbe/watermelondb/decorators';
import type { RecurrenceException } from '@/core/types';
import { sanitizeRecurrenceExceptions } from './sanitizers';

export const REMINDER_SCHEMA = tableSchema({
  name: 'reminder',
  columns: [
    { name: 'created_by', type: 'string', isIndexed: true, isOptional: true },
    { name: 'target_user_id', type: 'string', isIndexed: true },
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'scheduled_at', type: 'number' },
    { name: 'recurrence_rule', type: 'string', isOptional: true },
    { name: 'recurrence_exceptions', type: 'string' },
    { name: 'is_completed', type: 'boolean' },
    { name: 'completed_at', type: 'number', isOptional: true },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});

export class ReminderModel extends Model {
  static table = 'reminder';

  @field('created_by') createdBy!: string | null;
  @field('target_user_id') targetUserId!: string;
  @text('title') title!: string;
  @text('description') description!: string;
  @date('scheduled_at') scheduledAt!: Date;
  @text('recurrence_rule') recurrenceRule!: string | null;
  @json('recurrence_exceptions', sanitizeRecurrenceExceptions) recurrenceExceptions!: RecurrenceException[];
  @field('is_completed') isCompleted!: boolean;
  @date('completed_at') completedAt!: Date | null;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
