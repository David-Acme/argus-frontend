import type { SearchKind, SearchScope } from '@/core/types';

const MARKS = /\p{M}/gu;

const SPACES = /\s+/u;

const SEARCH_KINDS: readonly SearchKind[] = ['event', 'task', 'project', 'person', 'camera'];

export const foldText = (text: string): string =>
  text.normalize('NFD').replace(MARKS, '').toLocaleLowerCase().trim();

export const searchWords = (query: string): string[] =>
  foldText(query)
    .split(SPACES)
    .filter((word) => word.length > 0);

export function matchesWords(text: string, words: readonly string[]): boolean {
  const folded = foldText(text);
  return words.every((word) => folded.includes(word));
}

export const encodeSearchScope = (scope: SearchScope): string => JSON.stringify(scope);

const isKind = (value: unknown): value is SearchKind => SEARCH_KINDS.some((kind) => kind === value);

const isWord = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

export function parseSearchScope(scope: string): SearchScope | null {
  try {
    const value: unknown = JSON.parse(scope);
    if (typeof value !== 'object' || value === null) return null;
    const { kinds, words, since } = value as Record<string, unknown>;
    if (!Array.isArray(kinds) || !Array.isArray(words) || typeof since !== 'number') return null;
    return { kinds: kinds.filter(isKind), words: words.filter(isWord), since };
  } catch {
    return null;
  }
}
