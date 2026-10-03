import type { DashboardTab, IconName, TableName } from '@/core/types';

export const MOSAIC_COLUMNS = 13;
export const MOSAIC_ROWS = 6;

export const MOSAIC_TINTS = [
  'bg-border-subtle',
  'bg-border',
  'bg-foreground-secondary',
  'bg-foreground',
] as const;

export const TIMELINE_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;

export const MEMBER_TINTS = [
  'bg-accent-soft',
  'bg-surface-secondary',
  'bg-card-secondary',
  'bg-border-subtle',
] as const;

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
  '/' | '/agenda' | '/projects' | '/people' | '/profile'
> = {
  home: '/',
  schedule: '/agenda',
  projects: '/projects',
  people: '/people',
  profile: '/profile',
};

export const DASHBOARD_ROUTE_TAB: Record<string, DashboardTab> = {
  '/': 'home',
  '/agenda': 'schedule',
  '/projects': 'projects',
  '/people': 'people',
  '/users': 'people',
  '/profile': 'profile',
};

export const DASHBOARD_TABS: readonly {
  tab: DashboardTab;
  icon: IconName;
  table?: TableName;
  directory?: boolean;
}[] = [
  { tab: 'home', icon: 'home' },
  { tab: 'schedule', icon: 'calendar', table: 'calendar_event' },
  { tab: 'projects', icon: 'list-todo', table: 'project' },
  { tab: 'people', icon: 'users', directory: true },
  { tab: 'profile', icon: 'user' },
];

export const CAMERA_DEFAULT_PORT = 554;

export const CAMERA_DRIVER_SPECS = {
  tapo: {
    port: 554,
    username: 'admin',
    manufacturer: 'TP-Link',
    requiresCloud: true,
  },
  onvif: {
    port: 80,
    username: 'admin',
    manufacturer: '',
    requiresCloud: false,
  },
  rtsp: {
    port: 554,
    username: '',
    manufacturer: '',
    requiresCloud: false,
  },
} as const;

export const ZONE_MIN_POINTS = 3;
export const ZONE_MAX_POINTS = 64;

export const ZONE_COLORS = ['#FF3B30', '#FF9500', '#34C759', '#0A84FF', '#AF52DE'] as const;

export const CAMERA_ROW_HEIGHT = 68;

export const COMPOSE_ACTIONS: readonly {
  id: string;
  icon: IconName;
  route:
    | '/agenda?new=event'
    | '/projects?new=project'
    | '/cameras?new=camera'
    | '/welcome/voice'
    | '/call';
  table?: TableName;
  nativeOnly?: boolean;
}[] = [
  { id: 'event', icon: 'calendar', route: '/agenda?new=event', table: 'calendar_event' },
  { id: 'project', icon: 'list-todo', route: '/projects?new=project', table: 'project' },
  { id: 'camera', icon: 'video', route: '/cameras?new=camera', table: 'camera' },
  { id: 'voice', icon: 'sparkles', route: '/call', nativeOnly: true },
];

export const BOTTOM_NAV_HEIGHT = 60;

export const COMPOSE_ITEM_STAGGER_MS = 45;

export const PTZ_DIRECTIONS = { right: 0, up: 90, left: 180, down: 270 } as const;

export const CAMERA_ICONS: readonly IconName[] = [
  'video',
  'home',
  'shield-check',
  'eye',
  'monitor',
  'camera',
  'key-round',
  'wifi',
];

export const CAMERA_NAME_SUGGESTIONS = [
  'living-room',
  'dining-room',
  'kitchen',
  'entrance',
  'garage',
  'yard',
  'bedroom',
  'hallway',
] as const;

export const ACTIVITY_WINDOW_DAYS = 7;

export const EVENT_SAMPLE_LIMIT = 300;


export const DASHBOARD_SECTION_MIN_HEIGHT = 248;

export const DASHBOARD_SECTION_MIN_HEIGHT_SHORT = 164;

export const DASHBOARD_CAMERA_MIN_HEIGHT = 184;
