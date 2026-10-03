import type { DashboardTab, IconName, TableName } from '@/core/types';

/** Mosaic block behind the performance delta. */
export const MOSAIC_COLUMNS = 13;
export const MOSAIC_ROWS = 6;

/** Four steps of ink, lightest first. */
export const MOSAIC_TINTS = [
  'bg-border-subtle',
  'bg-border',
  'bg-foreground-secondary',
  'bg-foreground',
] as const;

/** Hours the schedule timeline shows: a working day, not 24 empty rows. */
export const TIMELINE_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;

/**
 * Member tints come from the palette so a stack reads as one family instead of
 * a rainbow. Assignment is by name hash, so a person keeps their tint.
 */
export const MEMBER_TINTS = [
  'bg-accent-soft',
  'bg-surface-secondary',
  'bg-card-secondary',
  'bg-border-subtle',
] as const;

/**
 * Template attendees for the agenda/schedule cards. Real members arrive with
 * the person/attendee sync; only the initial is ever rendered.
 */
export const DASHBOARD_MEMBERS: readonly (readonly string[])[] = [
  ['Ana', 'Bruno', 'Carla'],
  ['David', 'Elena', 'Franco', 'Gabriel'],
  ['Hugo', 'Irene'],
];

/** Task status order: the grouping order of the Linear-style list. */
export const TASK_STATUS_ORDER = ['doing', 'todo', 'backlog', 'done', 'canceled'] as const;

/** Priority weight, high first, so the list can sort inside a group. */
export const TASK_PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

/** Where each tab goes. One map so no screen can disagree with another. */
export const DASHBOARD_TAB_ROUTE: Record<DashboardTab, '/' | '/agenda' | '/projects' | '/profile'> = {
  home: '/',
  schedule: '/agenda',
  projects: '/projects',
  profile: '/profile',
};

/**
 * Reverse of `DASHBOARD_TAB_ROUTE`, used by the global bar to read the active
 * tab off the current path.
 */
export const DASHBOARD_ROUTE_TAB: Record<string, DashboardTab> = {
  '/': 'home',
  '/agenda': 'schedule',
  '/projects': 'projects',
  '/profile': 'profile',
  '/users': 'profile',
};

/**
 * Bottom bar order and icons. `table` is the permission the tab needs, so a
 * role without it never sees a tab that would land on an empty screen.
 */
export const DASHBOARD_TABS: readonly {
  tab: DashboardTab;
  icon: IconName;
  table?: TableName;
}[] = [
  { tab: 'home', icon: 'home' },
  { tab: 'schedule', icon: 'calendar', table: 'calendar_event' },
  { tab: 'projects', icon: 'list-todo', table: 'project' },
  { tab: 'profile', icon: 'user' },
];

/** Default RTSP port most IP cameras expose. */
export const CAMERA_DEFAULT_PORT = 554;

/**
 * What each integration needs to work. The form renders exactly these fields,
 * so a driver never asks for something it cannot use — and never hides
 * something Argus needs (a Tapo without cloud credentials cannot talk or move).
 */
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

/** Point count the backend accepts for a zone polygon. */
export const ZONE_MIN_POINTS = 3;
export const ZONE_MAX_POINTS = 64;

/** Palette offered for a zone outline. */
export const ZONE_COLORS = ['#FF3B30', '#FF9500', '#34C759', '#0A84FF', '#AF52DE'] as const;

/** Row height hint for the virtualized camera list. */
export const CAMERA_ROW_HEIGHT = 68;

export const COMPOSE_ACTIONS: readonly {
  id: string;
  icon: IconName;
  route:
    | '/agenda?new=event'
    | '/projects?new=project'
    | '/cameras?new=camera'
    | '/welcome/voice';
  table?: TableName;
  nativeOnly?: boolean;
}[] = [
  { id: 'event', icon: 'calendar', route: '/agenda?new=event', table: 'calendar_event' },
  { id: 'project', icon: 'list-todo', route: '/projects?new=project', table: 'project' },
  { id: 'camera', icon: 'video', route: '/cameras?new=camera', table: 'camera' },
  { id: 'voice', icon: 'sparkles', route: '/welcome/voice', nativeOnly: true },
];

/** Height of the floating bar, so content can clear it without guessing. */
export const BOTTOM_NAV_HEIGHT = 60;

/** Delay between speed-dial items, so they cascade instead of popping at once. */
export const COMPOSE_ITEM_STAGGER_MS = 45;

export const PTZ_DIRECTIONS = { right: 0, up: 90, left: 180, down: 270 } as const;

/** Icons a camera can be tagged with, so the user picks instead of typing. */
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

/** Ready-made names for the usual spots in a house. */
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

/** Days compared against the previous span for the activity delta. */
export const ACTIVITY_WINDOW_DAYS = 7;

/** Recent security events read to build the activity heatmap. */
export const EVENT_SAMPLE_LIMIT = 300;

/** Rows of today's schedule shown on the dashboard before "see all". */
export const TODAY_PREVIEW_LIMIT = 3;

/**
 * Height the two dashboard sections hold on a wide window, so the row keeps
 * its shape whether a column has nothing, one row or three.
 */
export const DASHBOARD_SECTION_MIN_HEIGHT = 248;

/** Dense baseline for a short wide window; the paired panels still stretch together. */
export const DASHBOARD_SECTION_MIN_HEIGHT_SHORT = 164;

/** Empty camera panels remain intentional on compact dashboards. */
export const DASHBOARD_CAMERA_MIN_HEIGHT = 184;
