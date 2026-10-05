import {
  addColumns,
  createTable,
  schemaMigrations,
  unsafeExecuteSql,
} from '@nozbe/watermelondb/Schema/migrations';
import type { TableSchema } from '@nozbe/watermelondb';
import {
  CALENDAR_EVENT_SCHEMA,
  CALENDAR_EVENT_SHARE_SCHEMA,
  EVENT_SCHEMA,
  NOTIFICATION_FEED_INDEX_SQL,
  PERSON_SCHEMA,
  PROJECT_MEMBER_SCHEMA,
  PROJECT_SCHEMA,
  PROJECT_TASK_SCHEMA,
} from './tables';

const fromSchema = (schema: TableSchema, addedLater: readonly string[] = []) =>
  createTable({
    name: schema.name,
    columns: schema.columnArray.filter((column) => !addedLater.includes(column.name)),
  });

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        fromSchema(CALENDAR_EVENT_SCHEMA),
        fromSchema(PROJECT_SCHEMA),
        fromSchema(PROJECT_TASK_SCHEMA),
        fromSchema(EVENT_SCHEMA),
        fromSchema(PERSON_SCHEMA, ['status']),
      ],
    },
    {
      toVersion: 3,
      steps: [fromSchema(CALENDAR_EVENT_SHARE_SCHEMA), fromSchema(PROJECT_MEMBER_SCHEMA)],
    },
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: 'camera',
          columns: [
            { name: 'cloud_username', type: 'string' },
            { name: 'driver', type: 'string', isIndexed: true },
          ],
        }),
      ],
    },
    {
      toVersion: 5,
      steps: [addColumns({ table: 'camera', columns: [{ name: 'icon', type: 'string' }] })],
    },
    {
      toVersion: 6,
      steps: [
        addColumns({
          table: 'person',
          columns: [{ name: 'status', type: 'string', isIndexed: true }],
        }),
        addColumns({ table: 'user', columns: [{ name: 'lang', type: 'string' }] }),
      ],
    },
    {
      toVersion: 7,
      steps: [
        unsafeExecuteSql(
          'create index if not exists "project_task_due_at" on "project_task" ("due_at");'
        ),
      ],
    },
    {
      toVersion: 8,
      steps: [unsafeExecuteSql(NOTIFICATION_FEED_INDEX_SQL)],
    },
  ],
});
