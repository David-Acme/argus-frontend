import { Q } from '@nozbe/watermelondb';
import type { Clause } from '@nozbe/watermelondb/QueryDescription';
import type { KeysetCursor, KeysetSort, KeysetValue } from '@/core/types';

const ID_COLUMN = 'id';

export function keysetOrder(sort: KeysetSort): Clause[] {
  return [Q.sortBy(sort.column, sort.order), Q.sortBy(ID_COLUMN, sort.order)];
}

export function keysetThrough(sort: KeysetSort, cursor: KeysetCursor): Clause {
  const ahead = sort.order === 'desc' ? Q.gt(cursor.value) : Q.lt(cursor.value);
  const tie = sort.order === 'desc' ? Q.gte(cursor.id) : Q.lte(cursor.id);
  return Q.or(
    Q.where(sort.column, ahead),
    Q.and(Q.where(sort.column, cursor.value), Q.where(ID_COLUMN, tie)),
  );
}

export function keysetAfter(sort: KeysetSort, cursor: KeysetCursor): Clause {
  const beyond = sort.order === 'desc' ? Q.lt(cursor.value) : Q.gt(cursor.value);
  const tie = sort.order === 'desc' ? Q.lt(cursor.id) : Q.gt(cursor.id);
  return Q.or(
    Q.where(sort.column, beyond),
    Q.and(Q.where(sort.column, cursor.value), Q.where(ID_COLUMN, tie)),
  );
}

export type KeysetRaw = { id: string; _raw: object };

export function cursorOf(record: KeysetRaw, sort: KeysetSort): KeysetCursor | null {
  const value: unknown = (record._raw as Record<string, unknown>)[sort.column];
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  return { value: value as KeysetValue, id: record.id };
}
