import { associations, Model, tableSchema } from '@nozbe/watermelondb';
import { date, field, immutableRelation, text } from '@nozbe/watermelondb/decorators';
import type { Relation } from '@nozbe/watermelondb';
import type { ProjectModel } from './project.table';

export const PROJECT_TASK_SCHEMA = tableSchema({
  name: 'project_task',
  columns: [
    { name: 'project_id', type: 'string', isIndexed: true },
    { name: 'created_by', type: 'string', isIndexed: true, isOptional: true },
    { name: 'assignee_id', type: 'string', isIndexed: true, isOptional: true },
    { name: 'title', type: 'string' },
    { name: 'status', type: 'string', isIndexed: true },
    { name: 'priority', type: 'string' },
    { name: 'due_at', type: 'number', isOptional: true },
    { name: 'sort_order', type: 'number' },
    { name: 'created_at', type: 'number' },
    { name: 'updated_at', type: 'number' },
  ],
});

export class ProjectTaskModel extends Model {
  static table = 'project_task';

  static associations = associations([
    'project',
    { type: 'belongs_to', key: 'project_id' },
  ]);

  @field('project_id') projectId!: string;
  @field('created_by') createdBy!: string | null;
  @field('assignee_id') assigneeId!: string | null;
  @text('title') title!: string;
  @field('status') status!: string;
  @field('priority') priority!: string;
  @date('due_at') dueAt!: Date | null;
  /** Float so reordering touches one row instead of rewriting the list. */
  @field('sort_order') sortOrder!: number;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @immutableRelation('project', 'project_id') project!: Relation<ProjectModel>;
}
