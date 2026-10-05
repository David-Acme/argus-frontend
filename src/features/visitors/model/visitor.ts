import type { VisitorCategory, VisitorList, VisitorPattern, VisitorSummary } from '@/core/types';

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

export function patchVisitor(
  list: VisitorList | null,
  id: number,
  patch: Partial<VisitorSummary>
): VisitorList | null {
  if (!list) return list;
  return {
    ...list,
    visitors: list.visitors.map((visitor) => (visitor.id === id ? { ...visitor, ...patch } : visitor)),
  };
}

export function withoutVisitors(list: VisitorList | null, ids: readonly number[]): VisitorList | null {
  if (!list) return list;
  return { ...list, visitors: list.visitors.filter((visitor) => !ids.includes(visitor.id)) };
}

export function mergedInto(
  list: VisitorList | null,
  target: VisitorSummary,
  sourceIds: readonly number[]
): VisitorList | null {
  if (!list) return list;
  const sources = list.visitors.filter((visitor) => sourceIds.includes(visitor.id));
  const merged: VisitorSummary = {
    ...target,
    visitCount: sources.reduce((total, visitor) => total + visitor.visitCount, target.visitCount),
    sampleCount: sources.reduce((total, visitor) => total + visitor.sampleCount, target.sampleCount),
    firstSeenAt: Math.min(target.firstSeenAt, ...sources.map((visitor) => visitor.firstSeenAt)),
    lastSeenAt: Math.max(target.lastSeenAt, ...sources.map((visitor) => visitor.lastSeenAt)),
    cameraIds: [...new Set([...target.cameraIds, ...sources.flatMap((visitor) => visitor.cameraIds)])],
  };
  return {
    ...list,
    visitors: list.visitors
      .filter((visitor) => !sourceIds.includes(visitor.id))
      .map((visitor) => (visitor.id === target.id ? merged : visitor)),
  };
}

export function hasPattern(pattern: VisitorPattern): boolean {
  return pattern.weekdays.length > 0 || pattern.usualHour !== null;
}
