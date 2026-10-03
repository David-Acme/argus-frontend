import { associations, Model, tableSchema, type Query } from '@nozbe/watermelondb';
import { children, date, field, text } from '@nozbe/watermelondb/decorators';
import type { ReminderDetailModel } from './reminder-detail.table';

export const REMINDER_SCHEMA = tableSchema({
  name: 'reminder',
  columns: [
    { name: 'created_by', type: 'string', isIndexed: true, isOptional: true },
    { name: 'target_user_id', type: 'string', isIndexed: true },
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'scheduled_at', type: 'number' },
    { name: 'recurrence_rule', type: 'string', isOptional: true },
    { name: 'is_completed', type: 'boolean' },
    { name: 'completed_at', type: 'number', isOptional: true },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});

export class ReminderModel extends Model {
  static table = 'reminder';

  static associations = associations([
    'reminder_detail',
    { type: 'has_many', foreignKey: 'reminder_id' },
  ]);

  @field('created_by') createdBy!: string | null;
  @field('target_user_id') targetUserId!: string;
  @text('title') title!: string;
  @text('description') description!: string;
  @date('scheduled_at') scheduledAt!: Date;
  @text('recurrence_rule') recurrenceRule!: string | null;
  @field('is_completed') isCompleted!: boolean;
  @date('completed_at') completedAt!: Date | null;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @children('reminder_detail') details!: Query<ReminderDetailModel>;
}
