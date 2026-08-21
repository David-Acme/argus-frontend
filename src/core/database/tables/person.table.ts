import { Model, tableSchema } from '@nozbe/watermelondb';
import { date, field, text } from '@nozbe/watermelondb/decorators';

export const PERSON_SCHEMA = tableSchema({
  name: 'person',
  columns: [
    { name: 'user_id', type: 'string', isIndexed: true, isOptional: true },
    { name: 'name', type: 'string' },
    { name: 'alias', type: 'string' },
    { name: 'observation', type: 'string' },
    { name: 'first_seen_at', type: 'number' },
    { name: 'last_seen_at', type: 'number', isIndexed: true },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});

export class PersonModel extends Model {
  static table = 'person';

  @field('user_id') userId!: string | null;
  @text('name') name!: string;
  @text('alias') alias!: string;
  @text('observation') observation!: string;
  @date('first_seen_at') firstSeenAt!: Date;
  @date('last_seen_at') lastSeenAt!: Date;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
