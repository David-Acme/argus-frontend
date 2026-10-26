import type { TranslationKey } from '@/core/types';

export const PANEL_PARAM = 'panel';
export const NOTIFICATIONS_PANEL = 'notifications';
export const NOTIFICATIONS_PANEL_HREF = `/?${PANEL_PARAM}=${NOTIFICATIONS_PANEL}`;

export const NEW_ITEM_PARAM = { event: 'event', project: 'project', task: 'task' } as const;

export const MOSAIC_COLUMNS = 13;
export const MOSAIC_ROWS = 6;

export const MOSAIC_TINTS = [
  'bg-border-subtle',
  'bg-border',
  'bg-foreground-secondary',
  'bg-foreground',
] as const;

export const TASK_STATUS_ORDER = ['doing', 'todo', 'backlog', 'done', 'canceled'] as const;

export const TASK_PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

export const SCREEN_TITLE_KEYS = {
  agenda: 'screens.agenda.schedule',
  projects: 'screens.projects.title',
  cameras: 'screens.cameras.title',
} as const satisfies Record<'agenda' | 'projects' | 'cameras', TranslationKey>;

export const ACTIVITY_WINDOW_DAYS = 7;

export const RECENT_EVENT_LIMIT = 8;

export const EVENT_SAMPLE_LIMIT = 300;

export const EVENT_MOSAIC_LIMIT = 5000;

