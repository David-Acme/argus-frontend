import { associations, Model, tableSchema, type Relation } from '@nozbe/watermelondb';
import { date, field, immutableRelation, json, text } from '@nozbe/watermelondb/decorators';
import type { ReminderDetailStatus } from '@/core/types';
import { sanitizeStringArray } from './sanitizers';
import type { ReminderModel } from './reminder.table';

export const REMINDER_DETAIL_SCHEMA = tableSchema({
  name: 'reminder_detail',
  columns: [
    { name: 'reminder_id', type: 'string', isIndexed: true },
    { name: 'created_by', type: 'string', isIndexed: true, isOptional: true },
    { name: 'content', type: 'string' },
    { name: 'status', type: 'string' },
    { name: 'file_paths', type: 'string' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});

export class ReminderDetailModel extends Model {
  static table = 'reminder_detail';

  static associations = associations(['reminder', { type: 'belongs_to', key: 'reminder_id' }]);

  @field('reminder_id') reminderId!: string;
  @field('created_by') createdBy!: string | null;
  @text('content') content!: string;
  @field('status') status!: ReminderDetailStatus;
  @json('file_paths', sanitizeStringArray) filePaths!: string[];
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @immutableRelation('reminder', 'reminder_id') reminder!: Relation<ReminderModel>;
}
