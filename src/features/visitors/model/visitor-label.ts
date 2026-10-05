import type { TranslateFn, VisitorCategory, VisitorPattern, VisitorSummary } from '@/core/types';

type Translate = TranslateFn;

const CATEGORY_KEYS = {
  '': 'screens.visitors.category.none',
  neighbor: 'screens.visitors.category.neighbor',
  delivery: 'screens.visitors.category.delivery',
  service: 'screens.visitors.category.service',
  family: 'screens.visitors.category.family',
  acquaintance: 'screens.visitors.category.acquaintance',
  watchlist: 'screens.visitors.category.watchlist',
} as const satisfies Record<VisitorCategory, string>;

const WEEKDAY_KEYS = [
  'screens.visitors.weekday.0',
  'screens.visitors.weekday.1',
  'screens.visitors.weekday.2',
  'screens.visitors.weekday.3',
  'screens.visitors.weekday.4',
  'screens.visitors.weekday.5',
  'screens.visitors.weekday.6',
] as const;

export function visitorLabel(visitor: Pick<VisitorSummary, 'name' | 'visitorNumber'>, t: Translate): string {
  const name = visitor.name.trim();
  if (name) return name;
  return visitor.visitorNumber
    ? t('screens.visitors.unnamed', { number: String(visitor.visitorNumber) })
    : t('screens.visitors.unnamed-plain');
}

export function categoryLabel(category: VisitorCategory, t: Translate): string {
  return t(CATEGORY_KEYS[category]);
}

export function visitsLabel(count: number, t: Translate): string {
  return count === 1 ? t('screens.visitors.visits-one') : t('screens.visitors.visits', { count: String(count) });
}

export function patternLabel(pattern: VisitorPattern, hour: (value: number) => string, t: Translate): string {
  const days = pattern.weekdays
    .flatMap((day) => {
      const key = WEEKDAY_KEYS[day];
      return key ? [t(key)] : [];
    })
    .join(', ');
  if (days && pattern.usualHour !== null)
    return `${t('screens.visitors.pattern-weekdays', { days })} ${t('screens.visitors.pattern-hour', {
      hour: hour(pattern.usualHour),
    })}`;
  if (days) return t('screens.visitors.pattern-weekdays', { days });
  if (pattern.usualHour !== null)
    return t('screens.visitors.pattern-hour-only', { hour: hour(pattern.usualHour) });
  return t('screens.visitors.pattern-none');
}
