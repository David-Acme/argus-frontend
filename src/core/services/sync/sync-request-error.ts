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
