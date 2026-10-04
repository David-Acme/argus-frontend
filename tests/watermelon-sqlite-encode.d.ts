declare module '@nozbe/watermelondb/adapters/sqlite/encodeSchema' {
  import type { AppSchema } from '@nozbe/watermelondb';
  import type { MigrationStep } from '@nozbe/watermelondb/Schema/migrations';

  export function encodeSchema(schema: AppSchema): string;
  export function encodeMigrationSteps(steps: MigrationStep[]): string;
}
