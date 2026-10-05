import { SYNC_STATUS_UNAUTHORIZED } from './sync-constants';

export class SyncRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'SyncRequestError';
    this.status = status;
  }
}

export const isSyncRequestError = (value: unknown, status?: number): value is SyncRequestError =>
  value instanceof SyncRequestError && (status === undefined || value.status === status);

export const retriesSyncFailure = (error: unknown): boolean => !isSyncRequestError(error, SYNC_STATUS_UNAUTHORIZED);

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
