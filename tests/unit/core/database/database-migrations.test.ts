import { Database } from 'bun:sqlite';
import { describe, expect, test } from 'bun:test';
import { tableSchema, type AppSchema } from '@nozbe/watermelondb';
import { encodeMigrationSteps, encodeSchema } from '@nozbe/watermelondb/adapters/sqlite/encodeSchema';
import { stepsForMigration } from '@nozbe/watermelondb/Schema/migrations/stepsForMigration';
import { migrations } from '@/core/database/migrations';
import { schema } from '@/core/database/schema';
import { SCHEMA_VERSION } from '@/shared/constants/database.constant';
import { parseCameraPrivacyState } from '@/shared/libs/camera-privacy';

type Step =
  | { type: 'create_table'; schema: { name: string; columnArray: { name: string }[] } }
  | { type: 'add_columns'; table: string; columns: { name: string }[] }
  | { type: string };

describe('database migrations', () => {
  test('the last migration reaches the schema version', () => {
    expect(migrations.maxVersion).toBe(SCHEMA_VERSION);
  });

  test('replaying every step from v1 never adds a column twice', () => {
    const tables = new Map<string, Set<string>>();
    const ordered = [...migrations.sortedMigrations].sort((left, right) => left.toVersion - right.toVersion);
    for (const migration of ordered) {
      for (const step of migration.steps as Step[]) {
        if (step.type === 'create_table' && 'schema' in step) {
          expect(tables.has(step.schema.name)).toBe(false);
          tables.set(step.schema.name, new Set(step.schema.columnArray.map((column) => column.name)));
        }
        if (step.type === 'add_columns' && 'table' in step) {
          const columns = tables.get(step.table) ?? new Set<string>();
          for (const column of step.columns) {
            expect(columns.has(column.name)).toBe(false);
            columns.add(column.name);
          }
          tables.set(step.table, columns);
        }
      }
    }
  });
});

describe('the task due date index', () => {
  const indexesOf = (db: Database, table: string): string[] =>
    (db.query(`select name from pragma_index_list('${table}')`).all() as { name: string }[]).map(
      (row) => row.name
    );

  const dueRangePlan = (db: Database): string =>
    (
      db
        .query(
          'explain query plan select * from project_task where due_at >= 1 and due_at <= 2 order by due_at'
        )
        .all() as { detail: string }[]
    )
      .map((row) => row.detail)
      .join(' | ');

  const withoutDueIndex = (): AppSchema => {
    const tables = Object.fromEntries(
      Object.entries(schema.tables).map(([name, table]) => {
        if (name !== 'project_task') return [name, table];
        const columns = Object.fromEntries(
          Object.entries(table.columns).map(([column, spec]) => [
            column,
            column === 'due_at' ? { ...spec, isIndexed: false } : spec,
          ])
        );
        return [name, { ...table, columns, columnArray: Object.values(columns) }];
      })
    );
    return { ...schema, version: 6, tables } as AppSchema;
  };

  test('a fresh database creates it from the schema', () => {
    const db = new Database(':memory:');
    db.exec(encodeSchema(schema));
    expect(indexesOf(db, 'project_task')).toContain('project_task_due_at');
    expect(dueRangePlan(db)).toContain('project_task_due_at');
  });

  test('a version 6 database gains the same index through the migration', () => {
    const db = new Database(':memory:');
    db.exec(encodeSchema(withoutDueIndex()));
    expect(indexesOf(db, 'project_task')).not.toContain('project_task_due_at');
    db.query(
      'insert into project_task (id, _changed, _status, project_id, title, status, priority, due_at, sort_order, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('1', '', 'synced', '3', 'Fix the gate', 'todo', 'low', 1500, 1, 1, 1);

    const steps = stepsForMigration({ migrations, fromVersion: 6, toVersion: 8 });
    expect(steps).not.toBeNull();
    db.exec(encodeMigrationSteps(steps ?? []));

    expect(indexesOf(db, 'project_task')).toContain('project_task_due_at');
    expect(dueRangePlan(db)).toContain('project_task_due_at');
    expect(db.query('select count(*) as n from project_task').get()).toEqual({ n: 1 });
  });

  test('replaying the migration twice is harmless', () => {
    const db = new Database(':memory:');
    db.exec(encodeSchema(schema));
    const steps = stepsForMigration({ migrations, fromVersion: 6, toVersion: 8 }) ?? [];
    expect(() => db.exec(encodeMigrationSteps(steps))).not.toThrow();
  });
});

describe('the notification feed index', () => {
  const indexesOf = (db: Database): string[] =>
    (
      db.query("select name from pragma_index_list('notification')").all() as { name: string }[]
    ).map((row) => row.name);

  const feedPlan = (db: Database): string =>
    (
      db
        .query(
          "explain query plan select * from notification where user_id = '1' and (created_at < 5 or (created_at = 5 and id < '9')) order by created_at desc, id desc limit 41"
        )
        .all() as { detail: string }[]
    )
      .map((row) => row.detail)
      .join(' | ');

  const insert = (db: Database) =>
    db
      .query(
        'insert into notification (id, _changed, _status, user_id, type, title, body, data, is_read, read_at, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run('1', '', 'synced', '1', 'camera', 'Hi', 'There', '{}', 0, null, 1);

  test('a fresh database creates it and the feed page reads through it', () => {
    const db = new Database(':memory:');
    db.exec(encodeSchema(schema));
    expect(indexesOf(db)).toContain('notification_user_created');
    expect(feedPlan(db)).toContain('notification_user_created');
  });

  test('a version 7 database gains it through the migration and keeps its rows', () => {
    const db = new Database(':memory:');
    db.exec(encodeSchema(schema));
    db.exec('drop index "notification_user_created";');
    insert(db);
    const steps = stepsForMigration({ migrations, fromVersion: 7, toVersion: 8 });
    expect(steps).not.toBeNull();
    db.exec(encodeMigrationSteps(steps ?? []));
    expect(indexesOf(db)).toContain('notification_user_created');
    expect(db.query('select count(*) as n from notification').get()).toEqual({ n: 1 });
  });
});

describe('the invitation revocation reason', () => {
  const columnsOf = (db: Database): string[] =>
    (db.query("select name from pragma_table_info('user_invitation')").all() as { name: string }[]).map(
      (row) => row.name
    );

  const withoutReason = (): AppSchema => {
    const tables = Object.fromEntries(
      Object.entries(schema.tables).map(([name, table]) => {
        if (name !== 'user_invitation') return [name, table];
        const columns = Object.fromEntries(
          Object.entries(table.columns).filter(([column]) => column !== 'revoked_reason' && column !== 'revoked_module')
        );
        return [name, { ...table, columns, columnArray: Object.values(columns) }];
      })
    );
    return { ...schema, version: 8, tables } as AppSchema;
  };

  test('a fresh database has both columns', () => {
    const db = new Database(':memory:');
    db.exec(encodeSchema(schema));
    expect(columnsOf(db)).toEqual(expect.arrayContaining(['revoked_reason', 'revoked_module']));
  });

  test('a version 8 database gains them through the migration and keeps its invitations', () => {
    const db = new Database(':memory:');
    db.exec(encodeSchema(withoutReason()));
    expect(columnsOf(db)).not.toContain('revoked_reason');
    db.query(
      'insert into user_invitation (id, _changed, _status, role, max_redemptions, redemption_count, expires_at, created_by, revoked_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('4', '', 'synced', 'guest', 1, 0, 9, '1', null, 1, 1);

    const steps = stepsForMigration({ migrations, fromVersion: 8, toVersion: 9 });
    expect(steps).not.toBeNull();
    db.exec(encodeMigrationSteps(steps ?? []));

    expect(columnsOf(db)).toEqual(expect.arrayContaining(['revoked_reason', 'revoked_module']));
    expect(db.query('select count(*) as n, max(revoked_reason) as reason from user_invitation').get()).toEqual({
      n: 1,
      reason: null,
    });
  });
});

describe('the retired event table', () => {
  const eventTableOf = (db: Database): string[] =>
    (
      db.query("select name from sqlite_master where type = 'table' and name = 'event'").all() as {
        name: string;
      }[]
    ).map((row) => row.name);

  const eventColumns = (db: Database): string[] =>
    (db.query("select name from pragma_table_info('event')").all() as { name: string }[]).map(
      (row) => row.name
    );

  const onVersionNine = (): AppSchema => {
    const tables = Object.fromEntries(
      Object.entries(schema.tables).filter(([name]) => name !== 'event')
    );
    return { ...schema, version: 9, tables } as AppSchema;
  };

  test('a device that still had the empty table comes out of the migration without it', () => {
    const db = new Database(':memory:');
    const nine = onVersionNine();
    db.exec(
      encodeSchema({
        ...nine,
        tables: {
          ...nine.tables,
          event: {
            name: 'event',
            columns: {},
            columnArray: [
              { name: 'id', type: 'string' },
              { name: 'event_type', type: 'string', isIndexed: true },
              { name: 'severity', type: 'string', isIndexed: true },
              { name: 'source', type: 'string' },
              { name: 'summary', type: 'string' },
              { name: 'details', type: 'string' },
              { name: 'occurred_at', type: 'number', isIndexed: true },
              { name: 'created_at', type: 'number' },
              { name: 'updated_at', type: 'number' },
            ],
          },
        },
      } as AppSchema)
    );
    expect(eventTableOf(db)).toEqual(['event']);

    const steps = stepsForMigration({ migrations, fromVersion: 9, toVersion: 10 });
    expect(steps).not.toBeNull();
    db.exec(encodeMigrationSteps(steps ?? []));

    expect(eventTableOf(db)).toEqual([]);
  });

  test('a stray row in it does not stop the migration', () => {
    const db = new Database(':memory:');
    db.exec(encodeSchema(schema));
    db.exec(
      "create table if not exists 'event' ('id' text primary key not null, 'event_type' text not null)"
    );
    db.query("insert into 'event' ('id', 'event_type') values (?, ?)").run('1', 'person');
    expect(eventColumns(db)).toContain('event_type');

    const steps = stepsForMigration({ migrations, fromVersion: 9, toVersion: 10 });
    expect(steps).not.toBeNull();
    db.exec(encodeMigrationSteps(steps ?? []));

    expect(eventTableOf(db)).toEqual([]);
  });
});

describe('the retired camera_stream and reminder_detail tables', () => {
  const RETIRED = ['camera_stream', 'reminder_detail'];

  const retiredTablesOf = (db: Database): string[] =>
    (
      db
        .query(
          "select name from sqlite_master where type = 'table' and name in ('camera_stream', 'reminder_detail') order by name"
        )
        .all() as { name: string }[]
    ).map((row) => row.name);

  const onVersionTen = (): AppSchema => ({
    ...schema,
    version: 10,
    tables: {
      ...schema.tables,
      camera_stream: tableSchema({
        name: 'camera_stream',
        columns: [
          { name: 'camera_id', type: 'string', isIndexed: true },
          { name: 'label', type: 'string' },
          { name: 'url', type: 'string' },
          { name: 'resolution', type: 'string' },
          { name: 'fps', type: 'number' },
          { name: 'codec', type: 'string' },
          { name: 'is_primary', type: 'boolean' },
          { name: 'is_enabled', type: 'boolean' },
          { name: 'created_at', type: 'number' },
          { name: 'updated_at', type: 'number' },
        ],
      }),
      reminder_detail: tableSchema({
        name: 'reminder_detail',
        columns: [
          { name: 'reminder_id', type: 'string', isIndexed: true },
          { name: 'created_by', type: 'string', isIndexed: true, isOptional: true },
          { name: 'content', type: 'string' },
          { name: 'status', type: 'string' },
          { name: 'file_paths', type: 'string' },
          { name: 'created_at', type: 'number' },
          { name: 'updated_at', type: 'number' },
        ],
      }),
    },
  } as AppSchema);

  const migrateFromTen = (db: Database) => {
    const steps = stepsForMigration({ migrations, fromVersion: 10, toVersion: 11 });
    expect(steps).not.toBeNull();
    db.exec(encodeMigrationSteps(steps ?? []));
  };

  test('the current schema no longer declares them', () => {
    for (const name of RETIRED) expect(Object.keys(schema.tables)).not.toContain(name);
  });

  test('a device on version 10 with both tables empty comes out of the migration without them', () => {
    const db = new Database(':memory:');
    db.exec(encodeSchema(onVersionTen()));
    expect(retiredTablesOf(db)).toEqual(RETIRED);

    migrateFromTen(db);

    expect(retiredTablesOf(db)).toEqual([]);
  });

  test('a stray row in either table does not stop the migration, and the rest of the data stays', () => {
    const db = new Database(':memory:');
    db.exec(encodeSchema(onVersionTen()));
    db.query(
      'insert into camera_stream (id, _changed, _status, camera_id, label, url, resolution, fps, codec, is_primary, is_enabled, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('1', '', 'synced', '2', 'main', 'rtsp://x', '1080p', 25, 'h264', 1, 1, 1, 1);
    db.query(
      'insert into reminder_detail (id, _changed, _status, reminder_id, created_by, content, status, file_paths, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('3', '', 'synced', '4', null, 'note', 'pending', '[]', 1, 1);
    db.query(
      'insert into reminder (id, _changed, _status, created_by, target_user_id, title, description, scheduled_at, recurrence_rule, is_completed, completed_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('4', '', 'synced', null, '7', 'Water the plants', '', 5, null, 0, null, 1, 1);

    migrateFromTen(db);

    expect(retiredTablesOf(db)).toEqual([]);
    expect(db.query('select count(*) as n from reminder').get()).toEqual({ n: 1 });
  });

  test('replaying the drop on a database that never had them is harmless', () => {
    const db = new Database(':memory:');
    db.exec(encodeSchema(schema));
    expect(() => migrateFromTen(db)).not.toThrow();
    expect(retiredTablesOf(db)).toEqual([]);
  });
});

describe('the camera privacy state column', () => {
  const cameraColumnsOf = (db: Database): string[] =>
    (db.query("select name from pragma_table_info('camera')").all() as { name: string }[]).map(
      (row) => row.name
    );

  const withoutPrivacyState = (): AppSchema => {
    const tables = Object.fromEntries(
      Object.entries(schema.tables).map(([name, table]) => {
        if (name !== 'camera') return [name, table];
        const columns = Object.fromEntries(
          Object.entries(table.columns).filter(
            ([column]) => column !== 'privacy_state' && column !== 'privacy_obeyed'
          )
        );
        return [name, { ...table, columns, columnArray: Object.values(columns) }];
      })
    );
    return { ...schema, version: 11, tables } as AppSchema;
  };

  test('a fresh database has the column', () => {
    const db = new Database(':memory:');
    db.exec(encodeSchema(schema));
    expect(cameraColumnsOf(db)).toContain('privacy_state');
  });

  test('a version 11 database gains it through the migration, and its cameras stay', () => {
    const db = new Database(':memory:');
    db.exec(encodeSchema(withoutPrivacyState()));
    expect(cameraColumnsOf(db)).not.toContain('privacy_state');
    db.query(
      'insert into camera (id, _changed, _status, name, manufacturer, model, ip, port, username, cloud_username, driver, icon, record_mode, retention_days, capabilities, config, is_enabled, is_online, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('1', '', 'synced', 'Gate', 'tapo', 'C200', '10.0.0.5', 554, 'admin', '', 'tapo', 'video', 'events', null, '[]', '{}', 1, 1, 1, 1);

    const steps = stepsForMigration({ migrations, fromVersion: 11, toVersion: 13 });
    expect(steps).not.toBeNull();
    db.exec(encodeMigrationSteps(steps ?? []));

    expect(cameraColumnsOf(db)).toContain('privacy_state');
    expect(db.query('select name, privacy_state as privacyState from camera').get()).toEqual({
      name: 'Gate',
      privacyState: '',
    });
    expect(parseCameraPrivacyState('')).toBe('unknown');
  });
});

describe('the camera privacy obeyed column', () => {
  const cameraColumnsOf = (db: Database): string[] =>
    (db.query("select name from pragma_table_info('camera')").all() as { name: string }[]).map(
      (row) => row.name
    );

  const atVersionTwelve = (): AppSchema => {
    const tables = Object.fromEntries(
      Object.entries(schema.tables).map(([name, table]) => {
        if (name !== 'camera') return [name, table];
        const columns = Object.fromEntries(
          Object.entries(table.columns).filter(([column]) => column !== 'privacy_obeyed')
        );
        return [name, { ...table, columns, columnArray: Object.values(columns) }];
      })
    );
    return { ...schema, version: 12, tables } as AppSchema;
  };

  test('a fresh database has the column', () => {
    const db = new Database(':memory:');
    db.exec(encodeSchema(schema));
    expect(cameraColumnsOf(db)).toContain('privacy_obeyed');
  });

  test('a version 12 database gains it through the migration, and its cameras stay', () => {
    const db = new Database(':memory:');
    db.exec(encodeSchema(atVersionTwelve()));
    expect(cameraColumnsOf(db)).not.toContain('privacy_obeyed');
    db.query(
      'insert into camera (id, _changed, _status, name, manufacturer, model, ip, port, username, cloud_username, driver, icon, record_mode, privacy_state, retention_days, capabilities, config, is_enabled, is_online, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('1', '', 'synced', 'Gate', 'tapo', 'C200', '10.0.0.5', 554, 'admin', '', 'tapo', 'video', 'events', 'unknown', null, '[]', '{}', 1, 1, 1, 1);

    const steps = stepsForMigration({ migrations, fromVersion: 12, toVersion: 13 });
    expect(steps).not.toBeNull();
    db.exec(encodeMigrationSteps(steps ?? []));

    expect(cameraColumnsOf(db)).toContain('privacy_obeyed');
    expect(db.query('select name, privacy_obeyed as obeyed from camera').get()).toEqual({
      name: 'Gate',
      obeyed: 0,
    });
  });
});

describe('the recurrence exceptions column', () => {
  const columnsOf = (db: Database, table: string): string[] =>
    (db.query(`select name from pragma_table_info('${table}')`).all() as { name: string }[]).map((row) => row.name);

  const atVersionThirteen = (): AppSchema => {
    const tables = Object.fromEntries(
      Object.entries(schema.tables).map(([name, table]) => {
        if (name !== 'reminder' && name !== 'calendar_event') return [name, table];
        const columns = Object.fromEntries(
          Object.entries(table.columns).filter(([column]) => column !== 'recurrence_exceptions')
        );
        return [name, { ...table, columns, columnArray: Object.values(columns) }];
      })
    );
    return { ...schema, version: 13, tables } as AppSchema;
  };

  test('a fresh database has it on reminders and calendar events', () => {
    const db = new Database(':memory:');
    db.exec(encodeSchema(schema));
    expect(columnsOf(db, 'reminder')).toContain('recurrence_exceptions');
    expect(columnsOf(db, 'calendar_event')).toContain('recurrence_exceptions');
  });

  test('a version 13 database gains it through the migration and keeps its rows', () => {
    const db = new Database(':memory:');
    db.exec(encodeSchema(atVersionThirteen()));
    expect(columnsOf(db, 'reminder')).not.toContain('recurrence_exceptions');
    db.query(
      'insert into reminder (id, _changed, _status, created_by, target_user_id, title, description, scheduled_at, recurrence_rule, is_completed, completed_at, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run('7', '', 'synced', '1', '1', 'Regar', '', 1, 'FREQ=DAILY', 0, null, 1, 1);

    const steps = stepsForMigration({ migrations, fromVersion: 13, toVersion: SCHEMA_VERSION });
    expect(steps).not.toBeNull();
    db.exec(encodeMigrationSteps(steps ?? []));

    expect(columnsOf(db, 'reminder')).toContain('recurrence_exceptions');
    expect(columnsOf(db, 'calendar_event')).toContain('recurrence_exceptions');
    expect(db.query('select title, recurrence_exceptions as exceptions from reminder').get()).toEqual({
      title: 'Regar',
      exceptions: '',
    });
  });
});
