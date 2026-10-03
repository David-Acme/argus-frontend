import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { DATABASE_NAME } from '@/shared/constants';
import { migrations } from './migrations';
import { modelClasses, schema } from './schema';
import { log } from '@/core/services/log';

const adapter = new LokiJSAdapter({
  dbName: DATABASE_NAME,
  schema,
  migrations,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
  onSetUpError: (error) => {
    log.error('database', 'LokiJS set-up failed', error);
  },
  onQuotaExceededError: (error) => {
    log.error('database', 'IndexedDB quota exceeded', error);
  },
});

export const database = new Database({ adapter, modelClasses });
