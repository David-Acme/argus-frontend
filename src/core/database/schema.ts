import { appSchema } from '@nozbe/watermelondb';
import { SCHEMA_VERSION } from '@/shared/constants';
import { MODEL_CLASSES, TABLE_SCHEMAS } from './tables';

export const schema = appSchema({
  version: SCHEMA_VERSION,
  tables: TABLE_SCHEMAS,
});

export const modelClasses = MODEL_CLASSES;
