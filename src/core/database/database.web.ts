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

type DatabaseSave = (done: (error?: unknown) => void) => void;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function savingOf(driver: unknown): DatabaseSave | null {
  if (!isRecord(driver) || !isRecord(driver.loki)) return null;
  const { loki } = driver;
  const save = loki.saveDatabase;
  if (typeof save !== 'function') return null;
  return (done) => {
    Reflect.apply(save, loki, [done]);
  };
}

export const flushDatabase = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const driver: unknown = adapter._driver;
    const save = savingOf(driver);
    if (!save) {
      resolve();
      return;
    }
    save((error) =>
      error ? reject(new Error('The local database was not saved', { cause: error })) : resolve()
    );
  });
