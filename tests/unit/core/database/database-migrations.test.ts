import { Database } from 'bun:sqlite';
import { describe, expect, test } from 'bun:test';
import type { AppSchema } from '@nozbe/watermelondb';
import { encodeMigrationSteps, encodeSchema } from '@nozbe/watermelondb/adapters/sqlite/encodeSchema';
import { stepsForMigration } from '@nozbe/watermelondb/Schema/migrations/stepsForMigration';
import { migrations } from '@/core/database/migrations';
import { schema } from '@/core/database/schema';
import { SCHEMA_VERSION } from '@/shared/constants/database.constant';

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

    const steps = stepsForMigration({ migrations, fromVersion: 8, toVersion: SCHEMA_VERSION });
    expect(steps).not.toBeNull();
    db.exec(encodeMigrationSteps(steps ?? []));

    expect(columnsOf(db)).toEqual(expect.arrayContaining(['revoked_reason', 'revoked_module']));
    expect(db.query('select count(*) as n, max(revoked_reason) as reason from user_invitation').get()).toEqual({
      n: 1,
      reason: null,
    });
  });
});
