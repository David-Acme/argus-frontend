import { Model, tableSchema } from '@nozbe/watermelondb';
import { date, field, text } from '@nozbe/watermelondb/decorators';

export const CALENDAR_EVENT_SCHEMA = tableSchema({
  name: 'calendar_event',
  columns: [
    { name: 'created_by', type: 'string', isIndexed: true, isOptional: true },
    { name: 'owner_id', type: 'string', isIndexed: true },
    { name: 'project_id', type: 'string', isIndexed: true, isOptional: true },
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'location', type: 'string' },
    { name: 'color', type: 'string' },
    { name: 'starts_at', type: 'number', isIndexed: true },
    { name: 'ends_at', type: 'number', isOptional: true },
    { name: 'is_all_day', type: 'boolean' },
    { name: 'recurrence_rule', type: 'string', isOptional: true },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});

export class CalendarEventModel extends Model {
  static table = 'calendar_event';

  @field('created_by') createdBy!: string | null;
  @field('owner_id') ownerId!: string;
  @field('project_id') projectId!: string | null;
  @text('title') title!: string;
  @text('description') description!: string;
  @text('location') location!: string;
  @field('color') color!: string;
  @date('starts_at') startsAt!: Date;
  @date('ends_at') endsAt!: Date | null;
  @field('is_all_day') isAllDay!: boolean;
  @text('recurrence_rule') recurrenceRule!: string | null;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
