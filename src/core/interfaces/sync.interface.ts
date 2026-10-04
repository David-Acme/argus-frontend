import type { SyncTableKey } from '@/core/types';

export interface ISyncRangeDto {
  startTime?: number;
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
  scope?: number[];
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
