import { Q } from '@nozbe/watermelondb';
import type { Clause } from '@nozbe/watermelondb/QueryDescription';

const LIKE_WILDCARD = /[^a-z0-9]|[aceinouy]/g;

export const likeWord = (word: string): string => `%${word.replace(LIKE_WILDCARD, '_')}%`;

export function wordClauses(columns: readonly string[], words: readonly string[]): Clause[] {
  return words.map((word) =>
    Q.or(...columns.map((column) => Q.where(column, Q.like(likeWord(word)))))
  );
}
