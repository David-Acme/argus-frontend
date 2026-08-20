import type { ISynchronizedDto } from '@/core/interfaces';

export const SYNC_BATCH_SIZE = 100;
export const SYNC_PAGE_SIZE = 200;
export const SYNC_PAGE_DELAY_MS = 150;
// Keep the first sync bounded, but allow normal installations with several
// thousand rows to finish without silently declaring a partial sync complete.
export const SYNC_MAX_PAGES = 100;
export const SYNC_RESPONSE_TIMEOUT_MS = 10000;

const FULL = {
  requiredCreate: true,
  findLastCreated: true,
  requiredDeleted: true,
  findLastDeleted: true,
} as const;

export const SYNC_FIRST_CONFIG: ISynchronizedDto = {
  user: FULL,
  camera: FULL,
  camera_stream: FULL,
  zone: FULL,
  reminder: FULL,
  reminder_detail: FULL,
  notification: { requiredCreate: true, findLastCreated: true },
};
