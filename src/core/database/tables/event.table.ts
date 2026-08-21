import { Model, tableSchema } from '@nozbe/watermelondb';
import { date, field, json, text } from '@nozbe/watermelondb/decorators';
import type { EventDetails } from '@/core/types';
import { sanitizeObject } from './sanitizers';

export const EVENT_SCHEMA = tableSchema({
  name: 'event',
  columns: [
    { name: 'event_type', type: 'string', isIndexed: true },
    { name: 'severity', type: 'string', isIndexed: true },
    { name: 'source', type: 'string' },
    { name: 'summary', type: 'string' },
    { name: 'details', type: 'string' },
    { name: 'occurred_at', type: 'number', isIndexed: true },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});

export class EventModel extends Model {
  static table = 'event';

  @field('event_type') eventType!: string;
  @field('severity') severity!: string;
  @text('source') source!: string;
  @text('summary') summary!: string;
  @json('details', sanitizeObject) details!: EventDetails;
  @date('occurred_at') occurredAt!: Date;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
