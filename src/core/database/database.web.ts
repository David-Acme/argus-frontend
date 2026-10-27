import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { DATABASE_NAME, RETIRED_TABLES } from '@/shared/constants';
import { migrations } from './migrations';
import { modelClasses, schema } from './schema';
import { log } from '@/core/services/log';

type LokiStore = { getCollection: (name: string) => { findAndRemove: () => void } | null };

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

const purgeRetired = (loki: LokiStore): void => {
  RETIRED_TABLES.forEach((name) => loki.getCollection(name)?.findAndRemove());
};

void database.adapter
  .unsafeExecute({ loki: purgeRetired })
  .catch((error: unknown) => log.error('database', 'Retired tables purge failed', error));
