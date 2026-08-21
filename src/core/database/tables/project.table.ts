import { associations, Model, tableSchema, type Query } from '@nozbe/watermelondb';
import { children, date, field, text } from '@nozbe/watermelondb/decorators';
import type { ProjectTaskModel } from './project-task.table';

export const PROJECT_SCHEMA = tableSchema({
  name: 'project',
  columns: [
    { name: 'owner_id', type: 'string', isIndexed: true },
    { name: 'name', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'status', type: 'string', isIndexed: true },
    { name: 'color', type: 'string' },
    { name: 'starts_at', type: 'number', isOptional: true },
    { name: 'target_at', type: 'number', isOptional: true },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});

export class ProjectModel extends Model {
  static table = 'project';

  static associations = associations([
    'project_task',
    { type: 'has_many', foreignKey: 'project_id' },
  ]);

  @field('owner_id') ownerId!: string;
  @text('name') name!: string;
  @text('description') description!: string;
  @field('status') status!: string;
  @field('color') color!: string;
  @date('starts_at') startsAt!: Date | null;
  @date('target_at') targetAt!: Date | null;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @children('project_task') tasks!: Query<ProjectTaskModel>;
}
