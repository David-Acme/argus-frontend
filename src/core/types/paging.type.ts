export type SortOrder = 'asc' | 'desc';

export type KeysetSort = {
  column: string;
  order: SortOrder;
};

export type KeysetValue = number | string;

export type KeysetCursor = {
  value: KeysetValue;
  id: string;
};

export type KeysetWindow = {
  through: KeysetCursor | null;
};

export type KeysetPage<T> = {
  rows: readonly T[];
  hasMore: boolean;
};

export type PagedRows<T> = {
  rows: readonly T[];
  hasMore: boolean;
};

export type RemotePage<T, C> = {
  rows: readonly T[];
  next: C | null;
};

export type InfiniteFooter = 'none' | 'loading' | 'error' | 'end';
