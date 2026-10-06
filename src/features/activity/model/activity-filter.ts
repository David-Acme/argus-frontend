import type { ActivityAction, ActivityFilter, ActivityPeriod } from '@/core/types';

export const ACTIVITY_PAGE_SIZE = 50;

export const ACTIVITY_ACTIONS: readonly ActivityAction[] = ['create', 'update', 'delete', 'read'];

export const ACTIVITY_PERIODS: readonly ActivityPeriod[] = ['today', 'week', 'month', 'all', 'custom'];

export const EMPTY_ACTIVITY_FILTER: ActivityFilter = {
  module: null,
  userId: null,
  action: null,
  period: 'week',
  from: null,
  to: null,
};

const DAY_MS = 86_400_000;

const startOfDay = (ms: number): number => {
  const day = new Date(ms);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
};

export type ActivityWindow = { from: number | null; to: number | null };

export function activityWindow(filter: ActivityFilter, now: number): ActivityWindow {
  const seconds = (ms: number) => Math.floor(ms / 1000);
  switch (filter.period) {
    case 'today':
      return { from: seconds(startOfDay(now)), to: null };
    case 'week':
      return { from: seconds(startOfDay(now) - 6 * DAY_MS), to: null };
    case 'month':
      return { from: seconds(startOfDay(now) - 29 * DAY_MS), to: null };
    case 'custom': {
      const from = filter.from === null ? null : seconds(startOfDay(filter.from));
      const to = filter.to === null ? null : seconds(startOfDay(filter.to) + DAY_MS - 1000);
      return from !== null && to !== null && from > to ? { from: to, to: from } : { from, to };
    }
    case 'all':
      return { from: null, to: null };
  }
}

export function activityQuery(
  filter: ActivityFilter,
  cursor: string | null,
  now: number,
  limit = ACTIVITY_PAGE_SIZE
): string {
  const window = activityWindow(filter, now);
  const entries: [string, string | number | null][] = [
    ['module', filter.module],
    ['userId', filter.userId],
    ['action', filter.action],
    ['from', window.from],
    ['to', window.to],
    ['limit', limit],
    ['cursor', cursor],
  ];
  return entries
    .filter((entry): entry is [string, string | number] => entry[1] !== null && entry[1] !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');
}

export const activityScope = (filter: ActivityFilter): string =>
  JSON.stringify([filter.module, filter.userId, filter.action, filter.period, filter.from, filter.to]);

export function activityFilterOf(scope: string): ActivityFilter {
  try {
    const parsed: unknown = JSON.parse(scope);
    if (!Array.isArray(parsed)) return EMPTY_ACTIVITY_FILTER;
    const [module, userId, action, period, from, to] = parsed as unknown[];
    return {
      module: typeof module === 'string' ? module : null,
      userId: typeof userId === 'number' ? userId : null,
      action: ACTIVITY_ACTIONS.includes(action as ActivityAction) ? (action as ActivityAction) : null,
      period: ACTIVITY_PERIODS.includes(period as ActivityPeriod) ? (period as ActivityPeriod) : 'week',
      from: typeof from === 'number' ? from : null,
      to: typeof to === 'number' ? to : null,
    };
  } catch {
    return EMPTY_ACTIVITY_FILTER;
  }
}

export const isFiltered = (filter: ActivityFilter): boolean =>
  filter.module !== null ||
  filter.userId !== null ||
  filter.action !== null ||
  filter.period !== EMPTY_ACTIVITY_FILTER.period;
