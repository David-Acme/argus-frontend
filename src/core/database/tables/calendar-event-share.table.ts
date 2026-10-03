import { Model, tableSchema } from '@nozbe/watermelondb';
import { date, field } from '@nozbe/watermelondb/decorators';

export const CALENDAR_EVENT_SHARE_SCHEMA = tableSchema({
  name: 'calendar_event_share',
  columns: [
    { name: 'calendar_event_id', type: 'string', isIndexed: true },
    { name: 'user_id', type: 'string', isIndexed: true },
    { name: 'access', type: 'string' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});

export class CalendarEventShareModel extends Model {
  static table = 'calendar_event_share';

  @field('calendar_event_id') calendarEventId!: string;
  @field('user_id') userId!: string;
  @field('access') access!: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
