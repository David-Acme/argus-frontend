import type { VisitorCategory, VisitorPattern, VisitorSummary } from '@/core/types';

export const VISITOR_CATEGORIES: readonly Exclude<VisitorCategory, ''>[] = [
  'neighbor',
  'delivery',
  'service',
  'family',
  'acquaintance',
  'watchlist',
];

export type VisitorFilter = 'all' | 'named' | 'unnamed' | 'watchlist';

export function isNamed(visitor: Pick<VisitorSummary, 'name'>): boolean {
  return visitor.name.trim().length > 0;
}

export function matchesFilter(visitor: VisitorSummary, filter: VisitorFilter): boolean {
  switch (filter) {
    case 'named':
      return isNamed(visitor);
    case 'unnamed':
      return !isNamed(visitor);
    case 'watchlist':
      return visitor.category === 'watchlist';
    default:
      return true;
  }
}

export function filterVisitors(
  visitors: readonly VisitorSummary[],
  filter: VisitorFilter,
  query: string
): VisitorSummary[] {
  const needle = query.trim().toLocaleLowerCase();
  return visitors.filter(
    (visitor) =>
      matchesFilter(visitor, filter) &&
      (needle === '' ||
        visitor.name.toLocaleLowerCase().includes(needle) ||
        visitor.note.toLocaleLowerCase().includes(needle) ||
        String(visitor.visitorNumber ?? '').includes(needle))
  );
}

export type VisitorQuery = { filter: VisitorFilter; search: string };

const SCOPE_SEPARATOR = '|';

const VISITOR_FILTERS: readonly VisitorFilter[] = ['all', 'named', 'unnamed', 'watchlist'];

export const VISITOR_ALL_SCOPE = `all${SCOPE_SEPARATOR}`;

export function visitorFeedScope({ filter, search }: VisitorQuery): string {
  return `${filter}${SCOPE_SEPARATOR}${search.trim().toLocaleLowerCase()}`;
}

export function visitorQueryOf(scope: string): VisitorQuery {
  const at = scope.indexOf(SCOPE_SEPARATOR);
  const head = at < 0 ? scope : scope.slice(0, at);
  const filter = VISITOR_FILTERS.find((candidate) => candidate === head) ?? 'all';
  return { filter, search: at < 0 ? '' : scope.slice(at + 1) };
}

const TILE_MIN_WIDTH = 150;

export const VISITOR_TILE_GAP = 12;

export function visitorColumns(width: number): number {
  return Math.max(
    2,
    Math.min(6, Math.floor((width + VISITOR_TILE_GAP) / (TILE_MIN_WIDTH + VISITOR_TILE_GAP)))
  );
}

export function compareVisitors(left: VisitorSummary, right: VisitorSummary): number {
  return right.lastSeenAt - left.lastSeenAt || right.id - left.id;
}

export function patchVisitor(
  rows: readonly VisitorSummary[],
  id: number,
  patch: Partial<VisitorSummary>
): readonly VisitorSummary[] {
  return rows.map((visitor) => (visitor.id === id ? { ...visitor, ...patch } : visitor));
}

export function withoutVisitors(
  rows: readonly VisitorSummary[],
  ids: readonly number[]
): readonly VisitorSummary[] {
  return rows.filter((visitor) => !ids.includes(visitor.id));
}

export function mergedInto(
  rows: readonly VisitorSummary[],
  target: VisitorSummary,
  sourceIds: readonly number[]
): readonly VisitorSummary[] {
  const sources = rows.filter((visitor) => sourceIds.includes(visitor.id));
  const merged: VisitorSummary = {
    ...target,
    visitCount: sources.reduce((total, visitor) => total + visitor.visitCount, target.visitCount),
    sampleCount: sources.reduce((total, visitor) => total + visitor.sampleCount, target.sampleCount),
    firstSeenAt: Math.min(target.firstSeenAt, ...sources.map((visitor) => visitor.firstSeenAt)),
    lastSeenAt: Math.max(target.lastSeenAt, ...sources.map((visitor) => visitor.lastSeenAt)),
    cameraIds: [...new Set([...target.cameraIds, ...sources.flatMap((visitor) => visitor.cameraIds)])],
  };
  return rows
    .filter((visitor) => !sourceIds.includes(visitor.id))
    .map((visitor) => (visitor.id === target.id ? merged : visitor));
}

export function hasPattern(pattern: VisitorPattern): boolean {
  return pattern.weekdays.length > 0 || pattern.usualHour !== null;
}
