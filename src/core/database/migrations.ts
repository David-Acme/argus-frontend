import { addColumns, createTable, schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';
import type { TableSchema } from '@nozbe/watermelondb';
import {
  CALENDAR_EVENT_SCHEMA,
  CALENDAR_EVENT_SHARE_SCHEMA,
  EVENT_SCHEMA,
  PERSON_SCHEMA,
  PROJECT_MEMBER_SCHEMA,
  PROJECT_SCHEMA,
  PROJECT_TASK_SCHEMA,
} from './tables';

/**
 * Every SCHEMA_VERSION bump needs an entry here: WatermelonDB throws
 * "Missing migration" and refuses to open the database otherwise. The steps
 * reuse the same `tableSchema` objects the app registers, so a column can
 * never drift between the schema and its migration.
 */
// `tableSchema()` keeps its columns as a map plus a `columnArray`; createTable
// wants the array. Adapting here keeps one source of truth for the columns.
const fromSchema = (schema: TableSchema) =>
  createTable({ name: schema.name, columns: [...schema.columnArray] });

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        fromSchema(CALENDAR_EVENT_SCHEMA),
        fromSchema(PROJECT_SCHEMA),
        fromSchema(PROJECT_TASK_SCHEMA),
        fromSchema(EVENT_SCHEMA),
        fromSchema(PERSON_SCHEMA),
      ],
    },
    {
      // Sharing: a calendar and a project belong to one user, and these two
      // tables are how another user gets in.
      toVersion: 3,
      steps: [fromSchema(CALENDAR_EVENT_SHARE_SCHEMA), fromSchema(PROJECT_MEMBER_SCHEMA)],
    },
    {
      // A camera says which integration drives it, and keeps the cloud user the
      // talk channel needs (the password never leaves the server).
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
      // An icon per camera, so every surface shows the same glyph.
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
  ],
});
