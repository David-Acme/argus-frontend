import type { TranslationKey } from '@/core/types';
import type { Category } from '@/features/agenda/model/agenda-lines';
import type { RepeatChoice } from '@/features/agenda/model/item-draft';

export const ARGUS_REMINDERS_SHOWN = true;

export const LIST_DAYS = 7;

export const UPCOMING_DAYS = 3;

export const EVENT_TITLE_MAX = 160;

export const CATEGORIES: readonly Category[] = ['reminder', 'event', 'task', 'shared'];

export const KIND_LABEL: Record<Category, TranslationKey> = {
  reminder: 'screens.agenda.kind.reminder',
  event: 'screens.agenda.kind.event',
  task: 'screens.agenda.kind.task',
  shared: 'screens.agenda.kind.shared',
};

export const ALL_SHOWN: ReadonlySet<Category> = new Set(CATEGORIES);

export const LIST_IDEAS: readonly TranslationKey[] = [
  'screens.agenda.empty.idea-light',
  'screens.agenda.empty.idea-dentist',
];

export const ASIDE_IDEAS: readonly TranslationKey[] = [
  ...LIST_IDEAS,
  'screens.agenda.empty.idea-project',
];

export const REPEAT_CHOICES: readonly RepeatChoice[] = [
  'none',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
];
