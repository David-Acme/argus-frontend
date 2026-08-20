import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

// Wired from v1 while empty on purpose: bumping SCHEMA_VERSION without
// `migrations` passed to the adapter wipes the local database.
export const migrations = schemaMigrations({ migrations: [] });
