import { describe, expect, test } from 'bun:test';
import { migrations } from '@/core/database/migrations';
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
