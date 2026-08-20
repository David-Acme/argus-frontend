import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { DATABASE_NAME } from '@/shared/constants';
import { migrations } from './migrations';
import { modelClasses, schema } from './schema';

// `useWebWorker: false` is the only mode where `onQuotaExceededError` fires.
// If IndexedDB turns out not to persist under Tauri/webkit2gtk, fall back to
// `useIncrementalIndexedDB: false`.
const adapter = new LokiJSAdapter({
  dbName: DATABASE_NAME,
  schema,
  migrations,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
  onSetUpError: (error) => {
    // eslint-disable-next-line no-console
    console.error('[database] LokiJS set-up failed', error);
  },
  onQuotaExceededError: (error) => {
    // eslint-disable-next-line no-console
    console.error('[database] IndexedDB quota exceeded', error);
  },
});

export const database = new Database({ adapter, modelClasses });
