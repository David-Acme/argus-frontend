import type { SyncTableKey } from '@/core/types';

/** Ranges in epoch SECONDS (backend contract). */
export interface ISyncRangeDto {
  startTime?: number;
  /** Tie-breaker for rows created/deleted in the same second. */
  startId?: number | string;
  endTime?: number;
}

export interface ISyncBodyDto {
  created?: ISyncRangeDto;
  deleted?: ISyncRangeDto;
  findLastCreated?: boolean;
  findLastDeleted?: boolean;
  requiredCreate?: boolean;
  requiredDeleted?: boolean;
}

export type ISynchronizedDto = Partial<Record<SyncTableKey, ISyncBodyDto>>;

export interface ISyncDeletedRow {
  id: number | string;
  deletedAt?: number | null;
}

export interface ISyncLastSyncDate {
  createdId?: number | string;
  created?: number | null;
  deletedId?: number | string;
  deleted?: number | null;
}

export interface ISyncResponseBody {
  created: unknown[];
  deleted: ISyncDeletedRow[];
  lastSyncDate?: ISyncLastSyncDate;
}

export type ISynchronizedResponse = Partial<Record<SyncTableKey, ISyncResponseBody | null>>;
