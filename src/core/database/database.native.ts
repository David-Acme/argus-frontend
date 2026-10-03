import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { DATABASE_NAME } from '@/shared/constants';
import { migrations } from './migrations';
import { modelClasses, schema } from './schema';
import { log } from '@/core/services/log';

const adapter = new SQLiteAdapter({
  dbName: DATABASE_NAME,
  schema,
  migrations,
  jsi: true,
  onSetUpError: (error) => {
    log.error('database', 'SQLite set-up failed', error);
  },
});

export const database = new Database({ adapter, modelClasses });
