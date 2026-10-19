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
        createTable({
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
        }),
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
    {
      toVersion: 9,
      steps: [
        addColumns({
          table: 'user_invitation',
          columns: [
            { name: 'revoked_reason', type: 'string', isOptional: true },
            { name: 'revoked_module', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
    {
      toVersion: 10,
      steps: [unsafeExecuteSql('drop table if exists "event";')],
    },
    {
      toVersion: 11,
      steps: [
        unsafeExecuteSql('drop table if exists "camera_stream";'),
        unsafeExecuteSql('drop table if exists "reminder_detail";'),
      ],
    },
    {
      toVersion: 12,
      steps: [
        addColumns({
          table: 'camera',
          columns: [{ name: 'privacy_state', type: 'string' }],
        }),
      ],
    },
    {
      toVersion: 13,
      steps: [
        addColumns({
          table: 'camera',
          columns: [{ name: 'privacy_obeyed', type: 'boolean' }],
        }),
      ],
    },
  ],
});
