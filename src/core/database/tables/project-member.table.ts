import { Model, tableSchema } from '@nozbe/watermelondb';
import { date, field } from '@nozbe/watermelondb/decorators';

export const PROJECT_MEMBER_SCHEMA = tableSchema({
  name: 'project_member',
  columns: [
    { name: 'project_id', type: 'string', isIndexed: true },
    { name: 'user_id', type: 'string', isIndexed: true },
    { name: 'access', type: 'string' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});

export class ProjectMemberModel extends Model {
  static table = 'project_member';

  @field('project_id') projectId!: string;
  @field('user_id') userId!: string;
  @field('access') access!: string;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
