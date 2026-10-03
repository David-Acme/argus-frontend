import type { SyncTableKey } from '@/core/types';

export const SYNC_PROJECTION_VERSION = 2;

export const SYNC_LIVE_BUFFER_LIMIT = 1000;

export const SYNC_CATCH_UP_DELAY_MS = 1000;

export const SYNC_ERROR_SUFFIX = '_error';

export const SYNC_REQUEST_TYPE = 'sync';

export const SYNC_VOICE_PREFIX = 'voice:';

export const SYNC_STATUS_UNAUTHORIZED = 401;

export const SYNC_STATUS_REPLICA_TOO_OLD = 409;

export const SYNC_TABLES_WITHOUT_DELETIONS: ReadonlySet<SyncTableKey> = new Set(['notification']);
