import type { ComposeActionId, DashboardTab, IconName, TableName, TranslationKey } from '@/core/types';
import { CAPABILITY, type Capability } from './capability.constant';

export const PANEL_PARAM = 'panel';
export const NOTIFICATIONS_PANEL = 'notifications';
export const NOTIFICATIONS_PANEL_HREF = `/?${PANEL_PARAM}=${NOTIFICATIONS_PANEL}`;

export const MOSAIC_COLUMNS = 13;
export const MOSAIC_ROWS = 6;

export const MOSAIC_TINTS = [
  'bg-border-subtle',
  'bg-border',
  'bg-foreground-secondary',
  'bg-foreground',
] as const;

export const TIMELINE_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;

export const TASK_STATUS_ORDER = ['doing', 'todo', 'backlog', 'done', 'canceled'] as const;

export const TASK_PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

export const DASHBOARD_TAB_ROUTE: Record<
  DashboardTab,
  '/' | '/agenda' | '/projects' | '/people' | '/settings' | '/profile'
> = {
  home: '/',
  schedule: '/agenda',
  projects: '/projects',
  people: '/people',
  settings: '/settings',
  profile: '/profile',
};

export const DASHBOARD_ROUTE_TAB: Record<string, DashboardTab> = {
  '/': 'home',
  '/agenda': 'schedule',
  '/projects': 'projects',
  '/people': 'people',
  '/users': 'people',
  '/settings': 'settings',
  '/profile': 'profile',
};

export const DASHBOARD_TABS: readonly {
  tab: DashboardTab;
  icon: IconName;
  table?: TableName;
}[] = [
  { tab: 'home', icon: 'home' },
  { tab: 'schedule', icon: 'calendar', table: 'calendar_event' },
  { tab: 'projects', icon: 'list-todo', table: 'project' },
  { tab: 'people', icon: 'users' },
  { tab: 'settings', icon: 'settings' },
  { tab: 'profile', icon: 'user' },
];

export const COMPOSE_ACTIONS: readonly {
  id: ComposeActionId;
  icon: IconName;
  route: '/agenda' | '/projects' | '/cameras' | '/call';
  table?: TableName;
  capability?: Capability;
}[] = [
  { id: 'event', icon: 'calendar', route: '/agenda', table: 'calendar_event' },
  { id: 'project', icon: 'list-todo', route: '/projects', table: 'project' },
  { id: 'camera', icon: 'video', route: '/cameras', table: 'camera' },
  { id: 'voice', icon: 'sparkles', route: '/call', capability: CAPABILITY.assistantVoice },
];

export const SCREEN_TITLE_KEYS = {
  agenda: 'screens.agenda.schedule',
  projects: 'screens.projects.title',
  cameras: 'screens.cameras.title',
} as const satisfies Record<'agenda' | 'projects' | 'cameras', TranslationKey>;

export const COMPOSE_ACTION_LABEL_KEYS: Record<ComposeActionId, TranslationKey> = {
  event: SCREEN_TITLE_KEYS.agenda,
  project: SCREEN_TITLE_KEYS.projects,
  camera: SCREEN_TITLE_KEYS.cameras,
  voice: 'screens.home.talk',
};

export const BOTTOM_NAV_HEIGHT = 60;

export const COMPOSE_ITEM_STAGGER_MS = 45;

export const ACTIVITY_WINDOW_DAYS = 7;

export const RECENT_EVENT_LIMIT = 8;

export const EVENT_SAMPLE_LIMIT = 300;

export const EVENT_MOSAIC_LIMIT = 5000;

