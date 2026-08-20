import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { DATABASE_NAME } from '@/shared/constants';
import { migrations } from './migrations';
import { modelClasses, schema } from './schema';

// `jsi: true` falls back to the async bridge dispatcher with a warning if the JSI
// bindings are unavailable (remote debugger, dev-client not rebuilt).
const adapter = new SQLiteAdapter({
  dbName: DATABASE_NAME,
  schema,
  migrations,
  jsi: true,
  onSetUpError: (error) => {
    // eslint-disable-next-line no-console
    console.error('[database] SQLite set-up failed', error);
  },
});

export const database = new Database({ adapter, modelClasses });
