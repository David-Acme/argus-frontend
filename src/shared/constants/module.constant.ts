export const MODULE_IDS = {
  core: 'core',
  surveillance: 'surveillance',
  productivity: 'productivity',
  agronomy: 'agronomy',
} as const;

export const MODULE_APP_ROUTES: Readonly<Record<string, readonly string[]>> = {
  surveillance: ['/cameras', '/security', '/users/visitors'],
  productivity: ['/agenda', '/projects'],
};

export const MODULE_API_PREFIXES: Readonly<Record<string, readonly string[]>> = {
  surveillance: ['camera', 'zone', 'media', 'guard', 'visitor', 'visitor-settings', 'visitor-crop'],
  productivity: ['project', 'project-task', 'project-member', 'calendar-event', 'calendar-event-share'],
};

export const MODULE_SYNC_TABLES = {
  surveillance: ['camera', 'camera_stream', 'zone', 'event'],
  productivity: ['project', 'project_member', 'project_task', 'calendar_event', 'calendar_event_share'],
} as const satisfies Readonly<Record<string, readonly string[]>>;

export const MODULE_PURGE_STAMPS_KEY = 'app.modules.purged.';

export const MODULE_REQUESTED_KEY = 'app.modules.requested.';

export const MODULE_ROUTE = '/modules';

export const MODULE_SETTINGS_PATH = '/settings/modules';

export const MODULE_GETTING_STARTED_KEY = 'app.modules.getting-started.';

export const MODULE_DISK_HEADROOM = 1.1;
