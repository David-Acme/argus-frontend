import { Model, tableSchema } from '@nozbe/watermelondb';
import { date, field, json, text } from '@nozbe/watermelondb/decorators';
import type { NotificationData } from '@/core/types';
import { sanitizeObject } from './sanitizers';

export const NOTIFICATION_SCHEMA = tableSchema({
  name: 'notification',
  columns: [
    { name: 'user_id', type: 'string', isIndexed: true },
    { name: 'type', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'body', type: 'string' },
    { name: 'data', type: 'string' },
    { name: 'is_read', type: 'boolean' },
    { name: 'read_at', type: 'number', isOptional: true },
    { name: 'created_at', type: 'number' },
  ],
});

export class NotificationModel extends Model {
  static table = 'notification';

  @field('user_id') userId!: string;
  @text('type') type!: string;
  @text('title') title!: string;
  @text('body') body!: string;
  @json('data', sanitizeObject) data!: NotificationData;
  @field('is_read') isRead!: boolean;
  @date('read_at') readAt!: Date | null;
  @date('created_at') createdAt!: Date;
}
