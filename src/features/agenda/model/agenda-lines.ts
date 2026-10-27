import type { AgendaItem, AgendaKind, TranslateFn } from '@/core/types';
import type { DateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { recurrenceLabel } from '@/shared/libs/recurrence';
import { dayRelation } from '@/features/agenda/model/agenda-days';
import { isOverdue } from '@/features/agenda/model/agenda-items';
import { KIND_LABEL } from '@/features/agenda/constants/agenda.constant';

export type Category = AgendaKind | 'shared';

export type BarLook = Category | 'overdue' | 'series' | 'free';

export type LineWords = {
  time: string;
  allDay: boolean;
  state: string | null;
  meta: string;
  alert: boolean;
};

export type DayWordContext = {
  now: number;
  date: Pick<DateFormatter, 'sameDay' | 'addDays' | 'formatWeekday'>;
  t: TranslateFn;
};

export type LineContext = {
  now: number;
  viewer: string;
  owners: ReadonlyMap<string, string>;
  date: Pick<DateFormatter, 'formatTime'>;
  t: TranslateFn;
};

const MINUTE_MS = 60_000;

const HOUR_MINUTES = 60;

const ownerOf = (item: AgendaItem): string | null => item.entry.ownerId ?? null;

export const madeByArgus = (item: AgendaItem): boolean => item.entry.createdVia === 'assistant';

export function categoryOf(item: AgendaItem, viewer: string): Category {
  const owner = ownerOf(item);
  return item.kind === 'event' && owner !== null && owner !== viewer ? 'shared' : item.kind;
}

export function barOf(item: AgendaItem, now: number, viewer: string): BarLook {
  if (isOverdue(item, now)) return 'overdue';
  if (item.kind === 'event' && item.repeat) return 'series';
  return categoryOf(item, viewer);
}

export function durationText(ms: number, t: TranslateFn): string {
  const minutes = Math.round(ms / MINUTE_MS);
  const hours = Math.floor(minutes / HOUR_MINUTES);
  const rest = minutes % HOUR_MINUTES;
  if (hours === 0) return t('screens.agenda.line.minutes', { count: rest });
  if (rest === 0) return t('screens.agenda.line.hours', { count: hours });
  return t('screens.agenda.line.hours-minutes', { hours, minutes: rest });
}

function stateOf(item: AgendaItem, { now, t }: LineContext): string | null {
  if (isOverdue(item, now)) return t('screens.agenda.line.late');
  if (item.done) return t('screens.agenda.line.done');
  if (item.allDay || item.endsAt === null || item.endsAt <= item.startsAt) return null;
  return durationText(item.endsAt - item.startsAt, t);
}

const lowerFirst = (text: string): string => text.charAt(0).toLocaleLowerCase() + text.slice(1);

function detailsOf(item: AgendaItem, context: LineContext): string[] {
  const { viewer, owners, t } = context;
  const category = categoryOf(item, viewer);
  const repeat = recurrenceLabel(item.repeat, t);
  const owner = ownerOf(item);
  return [
    t(KIND_LABEL[category]),
    repeat ? lowerFirst(repeat) : null,
    item.place,
    item.project,
    category === 'shared' && owner ? (owners.get(owner) ?? null) : null,
    madeByArgus(item) ? t('common.by-argus') : null,
  ].filter((part): part is string => Boolean(part));
}

export function lineWords(item: AgendaItem, context: LineContext): LineWords {
  const { now, date, t } = context;
  const time = item.allDay
    ? t('screens.agenda.line.all-day')
    : date.formatTime(new Date(item.startsAt));
  const alert = isOverdue(item, now);
  const meta = alert
    ? [
        t('screens.agenda.line.late-since', { time }),
        item.project,
        item.place,
        madeByArgus(item) ? t('common.by-argus') : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : detailsOf(item, context).join(' · ');
  return { time, allDay: item.allDay, state: stateOf(item, context), meta, alert };
}

export function freeWords(
  { from, to }: { from: number; to: number },
  { date, t }: Pick<LineContext, 'date' | 't'>
): LineWords {
  return {
    time: date.formatTime(new Date(from)),
    allDay: false,
    state: durationText(to - from, t),
    meta: t('screens.agenda.line.free-until', { time: date.formatTime(new Date(to)) }),
    alert: false,
  };
}

export function kindWords(item: AgendaItem, context: Pick<LineContext, 'viewer' | 't'>): string {
  return context.t(KIND_LABEL[categoryOf(item, context.viewer)]);
}

export function toggleShown(shown: ReadonlySet<Category>, category: Category): Set<Category> {
  const next = new Set(shown);
  if (next.has(category)) next.delete(category);
  else next.add(category);
  return next;
}

export const shownItems = (
  items: readonly AgendaItem[],
  shown: ReadonlySet<Category>,
  viewer: string
): AgendaItem[] => items.filter((item) => shown.has(categoryOf(item, viewer)));

export function dayWord(at: number, { now, date, t }: DayWordContext): string {
  const relation = dayRelation(at, now, date);
  if (relation === 'today') return t('screens.agenda.page.today');
  if (relation === 'tomorrow') return t('screens.agenda.page.tomorrow');
  return date.formatWeekday(new Date(at)).toLocaleLowerCase();
}
